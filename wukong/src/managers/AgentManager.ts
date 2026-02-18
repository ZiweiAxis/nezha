import path from 'path';
import os from 'os';
import fs from 'fs/promises';
import { AgentConfig, AgentInstance, AgentStatus, RunMode } from '../types';
import { IAgentManager } from '../core/IAgentManager';
import { IAgentAdapter } from '../core/IAgentAdapter';
import { IIdentityManager } from '../core/IIdentityManager';
import { IStateManager } from '../core/IStateManager';

/**
 * Agent 管理器实现
 */
const AUTO_RESTART_CHECK_MS = 5000;

export class AgentManager implements IAgentManager {
  private adapters: Map<string, IAgentAdapter> = new Map();
  private autoRestartTimers: Map<string, NodeJS.Timeout> = new Map();

  constructor(
    private identityManager: IIdentityManager,
    private stateManager: IStateManager
  ) {}

  /**
   * 注册适配器
   */
  registerAdapter(adapter: IAgentAdapter): void {
    this.adapters.set(adapter.name, adapter);
  }

  /**
   * 获取适配器
   */
  getAdapter(type: string): IAgentAdapter | undefined {
    return this.adapters.get(type);
  }

  /**
   * 获取状态管理器
   */
  getStateManager(): IStateManager {
    return this.stateManager;
  }

  async start(config: AgentConfig): Promise<AgentInstance> {
    // 1. 检查身份缓存：有效则复用，不调用注册 API（FR2）
    let identity = await this.identityManager.getIdentity(config.name);
    const cacheValid = identity && identity.id && identity.name && identity.status;

    if (cacheValid) {
      console.log(`Using cached identity for '${config.name}' (no re-registration).`);
    } else {
      if (identity) {
        // 缓存存在但无效（缺字段），视为无效缓存，重新注册
        await this.identityManager.removeIdentity(config.name);
      }
      console.log(`Registering new agent identity: ${config.name}`);
      identity = await this.identityManager.register(config.name, config.type);
    }

    // 2. 验证身份（检查审批状态）
    const verified = await this.identityManager.verifyIdentity(config.name);
    if (!verified) {
      throw new Error(
        `Agent '${config.name}' is pending approval. Please wait for approval before starting.`
      );
    }

    // 3. 检查是否已经在运行
    const existing = await this.stateManager.getInstance(config.name);
    if (existing && existing.status === AgentStatus.RUNNING) {
      throw new Error(`Agent '${config.name}' is already running`);
    }

    // 4. 获取适配器
    const adapter = this.adapters.get(config.type);
    if (!adapter) {
      throw new Error(`No adapter found for agent type: ${config.type}`);
    }

    // 5. 启动 Agent
    console.log(`Starting agent '${config.name}' in ${config.mode} mode...`);
    const instance = await adapter.start(config);

    // 6. 配置 diting-hook
    await adapter.configureDitingHook(instance);

    // 7. 保存状态
    await this.stateManager.saveInstance(instance);

    // 8. 可选：自动重启轮询（FR9/NFR8）
    if (config.autoRestart) {
      const timer = setInterval(async () => {
        const current = await this.stateManager.getInstance(config.name);
        if (!current || current.status !== AgentStatus.RUNNING) {
          clearInterval(timer);
          this.autoRestartTimers.delete(config.name);
          return;
        }
        const ad = this.adapters.get(current.type);
        if (ad && !(await ad.checkStatus(current))) {
          clearInterval(timer);
          this.autoRestartTimers.delete(config.name);
          try {
            await this.restart(config.name);
            console.log(`Agent '${config.name}' auto-restarted.`);
          } catch (e) {
            console.error(`Auto-restart failed for '${config.name}':`, (e as Error).message);
          }
        }
      }, AUTO_RESTART_CHECK_MS);
      this.autoRestartTimers.set(config.name, timer);
    }

    console.log(`Agent '${config.name}' started successfully (PID: ${instance.pid})`);
    return instance;
  }

  async stop(name: string): Promise<void> {
    const instance = await this.stateManager.getInstance(name);
    if (!instance) {
      throw new Error(`Agent '${name}' not found`);
    }

    if (instance.status !== AgentStatus.RUNNING) {
      throw new Error(`Agent '${name}' is not running`);
    }

    const adapter = this.adapters.get(instance.type);
    if (!adapter) {
      throw new Error(`No adapter found for agent type: ${instance.type}`);
    }

    console.log(`Stopping agent '${name}'...`);
    await adapter.stop(instance);

    await this.stateManager.updateStatus(name, AgentStatus.STOPPED);
    const timer = this.autoRestartTimers.get(name);
    if (timer) {
      clearInterval(timer);
      this.autoRestartTimers.delete(name);
    }
    console.log(`Agent '${name}' stopped successfully`);
  }

  async restart(name: string): Promise<AgentInstance> {
    const instance = await this.stateManager.getInstance(name);
    if (!instance) {
      throw new Error(`Agent '${name}' not found`);
    }

    const adapter = this.adapters.get(instance.type);
    if (!adapter) {
      throw new Error(`No adapter found for agent type: ${instance.type}`);
    }

    console.log(`Restarting agent '${name}'...`);

    await this.stateManager.updateStatus(name, AgentStatus.RESTARTING);
    const newInstance = await adapter.restart(instance);
    newInstance.restartCount = instance.restartCount + 1;

    await this.stateManager.saveInstance(newInstance);
    console.log(`Agent '${name}' restarted successfully`);

    return newInstance;
  }

  async getInstance(name: string): Promise<AgentInstance | null> {
    return await this.stateManager.getInstance(name);
  }

  async listInstances(): Promise<AgentInstance[]> {
    return await this.stateManager.listInstances();
  }

  async getLogs(name: string, lines: number = 100): Promise<string> {
    const instance = await this.stateManager.getInstance(name);
    if (!instance) {
      throw new Error(`Agent '${name}' not found`);
    }
    const logPath = path.join(os.homedir(), '.wukong', 'logs', `${name}.log`);
    try {
      const content = await fs.readFile(logPath, 'utf-8');
      const all = content.split('\n');
      const tail = all.slice(-lines);
      return tail.join('\n');
    } catch (e: any) {
      if (e.code === 'ENOENT') return `No log file yet for agent '${name}'.\n`;
      throw e;
    }
  }
}
