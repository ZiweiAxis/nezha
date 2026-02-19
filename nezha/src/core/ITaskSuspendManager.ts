import { SuspendedTask, SuspendedTaskStatus } from '../managers/TaskSuspendManager';

/**
 * 任务挂起管理器接口
 */
export interface ITaskSuspendManager {
  /**
   * 挂起任务
   */
  suspend(task: Omit<SuspendedTask, 'id' | 'status' | 'createdAt'>): Promise<SuspendedTask>;
  
  /**
   * 获取挂起的任务
   */
  getTask(id: string): SuspendedTask | undefined;
  
  /**
   * 获取任务列表
   */
  listTasks(): SuspendedTask[];
  
  /**
   * 移除任务
   */
  removeTask(id: string): void;
  
  /**
   * 更新任务状态
   */
  updateTaskStatus(id: string, status: SuspendedTaskStatus, error?: string): void;
  
  /**
   * 标记任务为已批准
   */
  markApproved(id: string): void;
  
  /**
   * 标记任务为已拒绝
   */
  markRejected(id: string, reason?: string): void;
  
  /**
   * 开始轮询（后台运行）
   */
  startPolling(intervalMs?: number): void;
  
  /**
   * 停止轮询
   */
  stopPolling(): void;
  
  /**
   * 等待任务完成
   */
  waitForCompletion(id: string, timeoutMs?: number): Promise<any>;
}
