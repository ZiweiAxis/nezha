import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { AgentIdentity, AgentStatus, RiskLevel } from '../types';
import { IIdentityManager } from '../core/IIdentityManager';
import { ITianshuClient } from '../core/ITianshuClient';
import { TaskSuspendManager, SuspendedTask, SuspendedTaskStatus, ITaskSuspendManager } from './TaskSuspendManager';

/**
 * 身份管理器实现
 */
export class IdentityManager implements IIdentityManager {
  private identitiesPath: string;
  private taskSuspendManager?: ITaskSuspendManager;
  private suspendMode: boolean = false;

  constructor(
    private tianshuClient: ITianshuClient,
    dataDir?: string,
    options?: {
      suspendMode?: boolean;
      pollingIntervalMs?: number;
    }
  ) {
    const baseDir = dataDir || path.join(os.homedir(), '.wukong');
    this.identitiesPath = path.join(baseDir, 'identities.json');
    
    // 如果启用挂起模式，创建 TaskSuspendManager
    if (options?.suspendMode) {
      this.suspendMode = true;
      this.taskSuspendManager = new TaskSuspendManager(
        // 审批状态检查函数
        async (cheqId: string) => {
          const result = await this.tianshuClient.getApprovalStatus(cheqId);
          return { approved: result.status === 'approved', status: result.status };
        },
        undefined, // 执行函数由调用方提供
        { pollingIntervalMs: options.pollingIntervalMs }
      );
      // 加载持久化的挂起任务
      this.taskSuspendManager.startPolling();
    }
  }

  /**
   * 获取任务挂起管理器（仅在挂起模式下可用）
   */
  getTaskSuspendManager(): ITaskSuspendManager | undefined {
    return this.taskSuspendManager;
  }

  /**
   * 是否处于挂起模式
   */
  isSuspendMode(): boolean {
    return this.suspendMode;
  }

  async register(name: string, type: string): Promise<AgentIdentity> {
    // 检查是否已存在
    const existing = await this.getIdentity(name);
    if (existing) {
      throw new Error(`Agent identity '${name}' already exists`);
    }

    // 确定风险等级（简化版，实际应该有更复杂的逻辑）
    const riskLevel = this.determineRiskLevel(type);

    // 向天枢注册
    const response = await this.tianshuClient.register({
      name,
      type,
      riskLevel,
    });

    // 创建身份对象
    const identity: AgentIdentity = {
      id: response.agentId,
      name,
      type,
      riskLevel,
      status: response.status,
      createdAt: new Date(),
    };

    // 保存到本地
    await this.saveIdentity(identity);

    return identity;
  }

  async getIdentity(name: string): Promise<AgentIdentity | null> {
    const identities = await this.loadIdentities();
    return identities.find(i => i.name === name) || null;
  }

  /** 审批状态展示文案（FR3：待审批/通过/拒绝/超时） */
  private static approvalStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      pending: '待审批',
      approved: '通过',
      rejected: '拒绝',
      timeout: '超时',
    };
    return labels[status] ?? status;
  }

  /**
   * 验证身份（支持挂起模式）
   * @param name 代理名称
   * @param suspendTaskConfig 如果需要挂起，传入任务配置
   * @returns 如果是挂起模式，返回挂起的任务；否则返回是否验证通过
   */
  async verifyIdentity(name: string, suspendTaskConfig?: {
    type: string;
    config: any;
    executeFn?: (task: SuspendedTask) => Promise<any>;
  }): Promise<boolean | SuspendedTask> {
    const identity = await this.getIdentity(name);
    if (!identity) {
      return false;
    }

    // 如果已经批准，直接返回
    if (identity.status !== AgentStatus.PENDING) {
      return identity.status === AgentStatus.APPROVED;
    }

    // 如果启用挂起模式，使用 TaskSuspendManager
    if (this.suspendMode && this.taskSuspendManager) {
      return await this.suspendAndWait(identity, suspendTaskConfig);
    }

    // 传统轮询模式
    return this.pollForApproval(identity);
  }

  /**
   * 挂起并等待审批
   */
  private async suspendAndWait(
    identity: AgentIdentity,
    suspendTaskConfig?: {
      type: string;
      config: any;
      executeFn?: (task: SuspendedTask) => Promise<any>;
    }
  ): Promise<SuspendedTask> {
    if (!this.taskSuspendManager) {
      throw new Error('TaskSuspendManager not initialized');
    }

    // 先检查一次状态
    const { status } = await this.tianshuClient.getApprovalStatus(identity.id);
    
    if (status === 'approved') {
      // 已经批准，更新身份状态
      identity.status = AgentStatus.APPROVED;
      identity.approvedAt = new Date();
      await this.saveIdentity(identity);
      
      // 返回一个已完成的任务
      return {
        id: identity.id,
        name: identity.name,
        type: identity.type,
        config: suspendTaskConfig?.config,
        status: SuspendedTaskStatus.APPROVED,
        approvedAt: new Date(),
        createdAt: identity.createdAt,
      };
    }

    if (status === 'rejected' || status === 'timeout') {
      throw new Error(`Approval ${status}`);
    }

    // 创建挂起任务
    const task = await this.taskSuspendManager.suspend({
      name: identity.name,
      type: identity.type,
      config: suspendTaskConfig?.config,
      cheqId: identity.id,
    });

    // 如果提供了执行函数，设置执行回调
    if (suspendTaskConfig?.executeFn && this.taskSuspendManager) {
      // 修改挂起管理器的执行函数
      const manager = this.taskSuspendManager as TaskSuspendManager;
      // 注意：这里需要重新创建 manager 或者提供其他方式设置执行函数
      // 简化起见，我们先返回任务，让调用方处理
    }

    return task;
  }

  /**
   * 轮询等待审批（传统模式）
   */
  private async pollForApproval(identity: AgentIdentity): Promise<boolean> {
    const intervalMs = Number(process.env.WUKONG_APPROVAL_POLL_INTERVAL_MS) || 0;
    const maxAttempts = Number(process.env.WUKONG_APPROVAL_POLL_MAX_ATTEMPTS) || 0;
    const shouldPoll = intervalMs > 0 && maxAttempts > 0;

    const checkOnce = async (): Promise<{ approved: boolean; status: string }> => {
      const { status } = await this.tianshuClient.getApprovalStatus(identity.id);
      console.log(`审批状态: ${IdentityManager.approvalStatusLabel(status)}`);
      if (status === 'approved') {
        identity.status = AgentStatus.APPROVED;
        identity.approvedAt = new Date();
        await this.saveIdentity(identity);
        return { approved: true, status };
      }
      return { approved: false, status };
    };

    let result = await checkOnce();
    if (result.approved) return true;
    if (result.status === 'rejected' || result.status === 'timeout') return false;

    if (!shouldPoll) {
      console.log('提示: 可设置 WUKONG_APPROVAL_POLL_INTERVAL_MS 与 WUKONG_APPROVAL_POLL_MAX_ATTEMPTS 启用轮询，或稍后手动重试。');
      return false;
    }

    for (let attempt = 1; attempt < maxAttempts; attempt++) {
      await new Promise(r => setTimeout(r, intervalMs));
      result = await checkOnce();
      if (result.approved) return true;
      if (result.status === 'rejected' || result.status === 'timeout') return false;
    }
    return false;
  }

  /**
   * 检查审批状态（不阻塞）
   */
  async checkApprovalStatus(agentId: string): Promise<{ approved: boolean; status: string }> {
    const result = await this.tianshuClient.getApprovalStatus(agentId);
    return { approved: result.status === 'approved', status: result.status };
  }

  /**
   * 列出所有挂起的任务（仅挂起模式）
   */
  listSuspendedTasks(): SuspendedTask[] {
    return this.taskSuspendManager?.listTasks() || [];
  }

  /**
   * 等待挂起任务完成（仅挂起模式）
   */
  async waitForSuspendedTask(taskId: string, timeoutMs?: number): Promise<any> {
    if (!this.taskSuspendManager) {
      throw new Error('TaskSuspendManager not initialized - suspend mode not enabled');
    }
    return this.taskSuspendManager.waitForCompletion(taskId, timeoutMs);
  }

  async listIdentities(): Promise<AgentIdentity[]> {
    return await this.loadIdentities();
  }

  async removeIdentity(name: string): Promise<void> {
    const identities = await this.loadIdentities();
    const filtered = identities.filter(i => i.name !== name);
    await this.saveIdentities(filtered);
  }

  private determineRiskLevel(type: string): RiskLevel {
    // 简化版风险评估
    // 实际应该根据 Agent 类型、权限等综合判断
    const highRiskTypes = ['system', 'admin'];
    const mediumRiskTypes = ['claude', 'cursor'];

    if (highRiskTypes.includes(type.toLowerCase())) {
      return RiskLevel.HIGH;
    } else if (mediumRiskTypes.includes(type.toLowerCase())) {
      return RiskLevel.MEDIUM;
    }
    return RiskLevel.LOW;
  }

  private async saveIdentity(identity: AgentIdentity): Promise<void> {
    const identities = await this.loadIdentities();
    const index = identities.findIndex(i => i.name === identity.name);

    if (index >= 0) {
      identities[index] = identity;
    } else {
      identities.push(identity);
    }

    await this.saveIdentities(identities);
  }

  private async loadIdentities(): Promise<AgentIdentity[]> {
    try {
      await fs.mkdir(path.dirname(this.identitiesPath), { recursive: true });
      const data = await fs.readFile(this.identitiesPath, 'utf-8');
      return JSON.parse(data);
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        return [];
      }
      throw error;
    }
  }

  private async saveIdentities(identities: AgentIdentity[]): Promise<void> {
    await fs.mkdir(path.dirname(this.identitiesPath), { recursive: true });
    await fs.writeFile(this.identitiesPath, JSON.stringify(identities, null, 2));
    await fs.chmod(this.identitiesPath, 0o600);
  }
}
