import { spawn, ChildProcess } from 'child_process';
import { AgentConfig, AgentInstance, AgentStatus, RunMode } from '../types';
import { IAgentAdapter } from '../core/IAgentAdapter';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

/**
 * Claude Agent 适配器
 */
export class ClaudeAdapter implements IAgentAdapter {
  readonly name = 'claude';
  private processes: Map<string, ChildProcess> = new Map();

  async start(config: AgentConfig): Promise<AgentInstance> {
    const workDir = config.workDir || process.cwd();

    // 根据运行模式启动
    switch (config.mode) {
      case RunMode.LOCAL:
        return await this.startLocal(config, workDir);
      case RunMode.SANDBOX:
        return await this.startSandbox(config, workDir);
      case RunMode.DEEP_SANDBOX:
        return await this.startDeepSandbox(config, workDir);
      default:
        throw new Error(`Unsupported run mode: ${config.mode}`);
    }
  }

  async stop(instance: AgentInstance): Promise<void> {
    const process = this.processes.get(instance.name);
    if (process && !process.killed) {
      process.kill('SIGTERM');
      this.processes.delete(instance.name);
    }
  }

  async restart(instance: AgentInstance): Promise<AgentInstance> {
    await this.stop(instance);

    // 重新构建配置
    const config: AgentConfig = {
      name: instance.name,
      type: instance.type,
      mode: instance.mode,
    };

    return await this.start(config);
  }

  async checkStatus(instance: AgentInstance): Promise<boolean> {
    const process = this.processes.get(instance.name);
    return process !== undefined && !process.killed;
  }

  async configureDitingHook(instance: AgentInstance): Promise<void> {
    // TODO: 配置 diting-hook
    // 1. 检查 diting-hook 是否安装
    // 2. 配置环境变量或配置文件
    // 3. 确保 Agent 启动时加载 hook
    console.log(`[ClaudeAdapter] Configuring diting-hook for ${instance.name}`);
  }

  private async startLocal(config: AgentConfig, workDir: string): Promise<AgentInstance> {
    // 启动 Claude CLI
    const env = {
      ...process.env,
      ...config.env,
      WUKONG_AGENT_NAME: config.name,
    };

    const claudeProcess = spawn('claude', [], {
      cwd: workDir,
      env,
      detached: true,
      stdio: 'ignore',
    });

    claudeProcess.unref();

    this.processes.set(config.name, claudeProcess);

    const instance: AgentInstance = {
      id: `${config.name}-${Date.now()}`,
      name: config.name,
      type: config.type,
      mode: config.mode,
      status: AgentStatus.RUNNING,
      pid: claudeProcess.pid,
      startedAt: new Date(),
      restartCount: 0,
    };

    return instance;
  }

  private async startSandbox(config: AgentConfig, workDir: string): Promise<AgentInstance> {
    // TODO: 实现 Docker 沙箱启动
    throw new Error('Docker sandbox mode not implemented yet');
  }

  private async startDeepSandbox(config: AgentConfig, workDir: string): Promise<AgentInstance> {
    // TODO: 实现 gVisor 深度沙箱启动
    throw new Error('gVisor deep sandbox mode not implemented yet');
  }
}
