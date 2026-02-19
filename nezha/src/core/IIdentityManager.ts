import { AgentIdentity } from '../types';
import { SuspendedTask } from '../managers/TaskSuspendManager';

/**
 * 身份管理器接口
 */
export interface IIdentityManager {
  /**
   * 注册新的 Agent 身份
   */
  register(name: string, type: string): Promise<AgentIdentity>;

  /**
   * 获取 Agent 身份
   */
  getIdentity(name: string): Promise<AgentIdentity | null>;

  /**
   * 验证身份（检查是否已审批）
   * @param name Agent 名称
   * @param suspendTaskConfig 可选的挂起任务配置（实现类可选择支持）
   * @returns Promise<boolean> - 兼容模式返回 boolean
   */
  verifyIdentity(name: string, suspendTaskConfig?: any): Promise<boolean | SuspendedTask>;

  /**
   * 列出所有身份
   */
  listIdentities(): Promise<AgentIdentity[]>;

  /**
   * 删除身份
   */
  removeIdentity(name: string): Promise<void>;

  /**
   * 获取任务挂起管理器（可选）
   */
  getTaskSuspendManager?(): any;

  /**
   * 是否处于挂起模式（可选）
   */
  isSuspendMode?(): boolean;

  /**
   * 检查审批状态（可选）
   */
  checkApprovalStatus?(agentId: string): Promise<{ approved: boolean; status: string }>;

  /**
   * 列出挂起的任务（可选）
   */
  listSuspendedTasks?(): SuspendedTask[];

  /**
   * 等待挂起任务完成（可选）
   */
  waitForSuspendedTask?(taskId: string, timeoutMs?: number): Promise<any>;
}
