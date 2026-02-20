import { AgentConfig, AgentInstance, AgentIdentity } from './types';
import { TianshuClient } from './clients/TianshuClient';
import { IdentityManager } from './managers/IdentityManager';
import { StateManager } from './managers/StateManager';
import { AgentManager } from './managers/AgentManager';
import { ClaudeAdapter } from './adapters/ClaudeAdapter';
import { loadConfig } from './utils/config';
import { SuspendedTask, ITaskSuspendManager } from './managers/TaskSuspendManager';

export interface WukongOptions {
  tianshuBaseUrl?: string;
  wukongOwnerId?: string;
  /** 启动 Agent 时注入的默认环境变量（TIANSHU_*、DITING_* 等，FR8） */
  defaultEnv?: Record<string, string>;
  /** 启用任务挂起模式：审批时挂起任务而不是阻塞等待 */
  suspendMode?: boolean;
  /** 审批状态轮询间隔（毫秒） */
  pollingIntervalMs?: number;
}

/**
 * 悟空主类
 */
export class Wukong {
  private tianshuClient: TianshuClient;
  private identityManager: IdentityManager;
  private stateManager: StateManager;
  private agentManager: AgentManager;

  private defaultEnv: Record<string, string> = {};

  constructor(options?: WukongOptions) {
    // 初始化客户端和管理器（天枢地址、owner：options > 环境变量 > 默认）
    this.tianshuClient = new TianshuClient(options?.tianshuBaseUrl, undefined, options?.wukongOwnerId);
    this.defaultEnv = options?.defaultEnv || {};
    
    // 初始化身份管理器（支持挂起模式）
    this.identityManager = new IdentityManager(
      this.tianshuClient,
      undefined,
      {
        suspendMode: options?.suspendMode,
        pollingIntervalMs: options?.pollingIntervalMs,
      }
    );
    this.stateManager = new StateManager(this.tianshuClient, this.identityManager);
    this.agentManager = new AgentManager(this.identityManager, this.stateManager);

    // 注册适配器
    this.agentManager.registerAdapter(new ClaudeAdapter());
  }

  /**
   * 获取任务挂起管理器（仅在挂起模式下可用）
   */
  getTaskSuspendManager(): ITaskSuspendManager | undefined {
    return this.identityManager.getTaskSuspendManager();
  }

  /**
   * 是否处于挂起模式
   */
  isSuspendMode(): boolean {
    return this.identityManager.isSuspendMode();
  }

  /**
   * 列出所有挂起的任务（仅挂起模式）
   */
  listSuspendedTasks(): SuspendedTask[] {
    return this.identityManager.listSuspendedTasks();
  }

  /**
   * 等待挂起任务完成（仅挂起模式）
   */
  async waitForSuspendedTask(taskId: string, timeoutMs?: number): Promise<any> {
    return this.identityManager.waitForSuspendedTask(taskId, timeoutMs);
  }

  /**
   * 启动 Agent（支持挂起模式）
   * @param config Agent 配置
   * @param suspendOnPending 当需要审批时是否挂起（仅在非挂起模式下有效）
   * @returns 如果是挂起模式且需要审批，返回挂起的任务；否则返回 Agent 实例
   */
  async startAgent(config: AgentConfig, suspendOnPending?: boolean): Promise<AgentInstance | SuspendedTask> {
    const env = { ...(this.defaultEnv || {}), ...config.env };
    
    // 如果启用挂起模式，传递执行函数
    if (this.isSuspendMode()) {
      return this.startAgentWithSuspend(config, env);
    }
    
    // 如果指定了 suspendOnPending 且非挂起模式
    if (suspendOnPending) {
      return this.startAgentWithSuspend(config, env);
    }
    
    return await this.agentManager.start({ ...config, env });
  }

  /**
   * 使用挂起模式启动 Agent
   */
  private async startAgentWithSuspend(config: AgentConfig, env: Record<string, string>): Promise<AgentInstance | SuspendedTask> {
    // 1. 检查/注册身份
    let identity = await this.identityManager.getIdentity(config.name);
    const cacheValid = identity && identity.id && identity.name && identity.status;

    if (!cacheValid) {
      if (identity) {
        await this.identityManager.removeIdentity(config.name);
      }
      console.log(`Registering new agent identity: ${config.name}`);
      identity = await this.identityManager.register(config.name, config.type);
    }

    // 2. 验证身份（启用挂起模式）
    const verifyResult = await this.identityManager.verifyIdentity(config.name, {
      type: config.type,
      config: { ...config, env },
    });

    // 如果返回的是 SuspendedTask，说明需要等待审批
    if (verifyResult && typeof verifyResult === 'object' && 'id' in verifyResult) {
      console.log(`Agent '${config.name}' is pending approval. Task ID: ${verifyResult.id}`);
      return verifyResult as SuspendedTask;
    }

    // 如果验证失败（未批准）
    if (!verifyResult) {
      throw new Error(
        `Agent '${config.name}' is pending approval. Please wait for approval before starting.`
      );
    }

    // 3. 验证通过，启动 Agent
    // 4. 检查是否已经在运行
    const existing = await this.agentManager.getInstance(config.name);
    if (existing && existing.status === 'running') {
      throw new Error(`Agent '${config.name}' is already running`);
    }

    // 5. 获取适配器并启动
    const adapter = this.agentManager.getAdapter(config.type);
    if (!adapter) {
      throw new Error(`No adapter found for agent type: ${config.type}`);
    }

    console.log(`Starting agent '${config.name}' in ${config.mode} mode...`);
    const instance = await adapter.start(config);

    // 6. 配置 diting-hook
    await adapter.configureDitingHook(instance);

    // 7. 保存状态
    await this.agentManager.getStateManager().saveInstance(instance);

    console.log(`Agent '${config.name}' started successfully (PID: ${instance.pid})`);
    return instance;
  }

  /**
   * 停止 Agent
   */
  async stopAgent(name: string): Promise<void> {
    return await this.agentManager.stop(name);
  }

  /**
   * 重启 Agent
   */
  async restartAgent(name: string): Promise<AgentInstance> {
    return await this.agentManager.restart(name);
  }

  /**
   * 获取 Agent 状态
   */
  async getAgentStatus(name: string): Promise<AgentInstance | null> {
    return await this.agentManager.getInstance(name);
  }

  /**
   * 列出所有 Agent
   */
  async listAgents(): Promise<AgentInstance[]> {
    return await this.agentManager.listInstances();
  }

  /**
   * 获取 Agent 日志
   */
  async getAgentLogs(name: string, lines: number = 100): Promise<string> {
    return await this.agentManager.getLogs(name, lines);
  }

  /**
   * 注册身份
   */
  async registerIdentity(name: string, type: string): Promise<AgentIdentity> {
    return await this.identityManager.register(name, type);
  }

  /**
   * 列出所有身份
   */
  async listIdentities(): Promise<AgentIdentity[]> {
    return await this.identityManager.listIdentities();
  }

  /**
   * 检查审批状态（不阻塞）
   */
  async checkApprovalStatus(agentId: string): Promise<{ approved: boolean; status: string }> {
    return this.identityManager.checkApprovalStatus(agentId);
  }
}

/**
 * 异步创建 Wukong 实例（从 ~/.wukong/config.json 与环境变量加载天枢地址等）
 */
export async function createWukong(): Promise<Wukong> {
  const config = await loadConfig();
  const defaultEnv: Record<string, string> = {};
  if (config.tianshu_api_url) defaultEnv.TIANSHU_API_URL = config.tianshu_api_url;
  if (config.wukong_owner_id) defaultEnv.WUKONG_OWNER_ID = config.wukong_owner_id;
  
  // 检查是否启用挂起模式
  const suspendMode = process.env.WUKONG_SUSPEND_MODE === 'true' || config.suspend_mode;
  const pollingIntervalMs = Number(process.env.WUKONG_APPROVAL_POLL_INTERVAL_MS || config.approval_poll_interval_ms) || 3000;
  
  return new Wukong({
    tianshuBaseUrl: config.tianshu_api_url,
    wukongOwnerId: config.wukong_owner_id,
    defaultEnv,
    suspendMode,
    pollingIntervalMs,
  });
}

export * from './types';
export * from './core/IAgentAdapter';
export * from './core/IAgentManager';
export * from './core/IIdentityManager';
export * from './core/IStateManager';
export * from './core/ITianshuClient';
export * from './managers/TaskSuspendManager';
