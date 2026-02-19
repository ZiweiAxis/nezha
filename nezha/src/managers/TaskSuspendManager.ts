import fs from 'fs/promises';
import path from 'path';
import os from 'os';

/**
 * 挂起任务状态
 */
export enum SuspendedTaskStatus {
  PENDING = 'pending',     // 等待审批
  APPROVED = 'approved',   // 已批准
  REJECTED = 'rejected',   // 已拒绝
  EXECUTING = 'executing', // 执行中
  COMPLETED = 'completed', // 已完成
  FAILED = 'failed',       // 执行失败
}

/**
 * 挂起的任务
 */
export interface SuspendedTask {
  id: string;
  name: string;            // Agent 名称
  type: string;            // Agent 类型
  config: any;             // Agent 配置
  status: SuspendedTaskStatus;
  cheqId?: string;         // CHEQ 审批 ID（如果需要）
  createdAt: Date;
  approvedAt?: Date;
  completedAt?: Date;
  error?: string;
  resolve?: (value: any) => void;  // Promise resolve
  reject?: (error: any) => void;    // Promise reject
}

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

/**
 * 任务挂起管理器实现
 * 
 * 设计思路：
 * 1. 当需要审批时，将任务挂起并返回 Promise
 * 2. 后台轮询审批状态
 * 3. 审批通过后执行任务并 resolve
 * 4. 审批拒绝后 reject
 */
export class TaskSuspendManager implements ITaskSuspendManager {
  private tasks: Map<string, SuspendedTask> = new Map();
  private pollingInterval: NodeJS.Timeout | null = null;
  private pollingIntervalMs: number;
  private checkApprovalFn: (cheqId: string) => Promise<{ approved: boolean; status: string }>;
  private executeFn?: (task: SuspendedTask) => Promise<any>;
  
  // 文件持久化路径
  private storagePath: string;

  constructor(
    checkApprovalFn: (cheqId: string) => Promise<{ approved: boolean; status: string }>,
    executeFn?: (task: SuspendedTask) => Promise<any>,
    options?: {
      pollingIntervalMs?: number;
      storagePath?: string;
    }
  ) {
    this.checkApprovalFn = checkApprovalFn;
    this.executeFn = executeFn;
    this.pollingIntervalMs = options?.pollingIntervalMs || 3000; // 默认 3 秒
    this.storagePath = options?.storagePath || path.join(os.homedir(), '.wukong', 'suspended-tasks.json');
  }

  /**
   * 生成唯一任务 ID
   */
  private generateId(): string {
    return `task-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * 挂起任务
   * 注意：此方法返回一个 Promise，该 Promise 会在审批通过/拒绝后 resolve/reject
   * 如果不需要等待，可以使用 startAgent 并传入 suspendOnPending=true
   */
  async suspend(task: Omit<SuspendedTask, 'id' | 'status' | 'createdAt'>): Promise<SuspendedTask> {
    const id = this.generateId();
    const suspendedTask: SuspendedTask = {
      ...task,
      id,
      status: SuspendedTaskStatus.PENDING,
      createdAt: new Date(),
    };

    // 保存任务
    this.tasks.set(id, suspendedTask);
    
    // 持久化到文件
    await this.persist();

    console.log(`[TaskSuspendManager] Task ${id} suspended, waiting for approval...`);

    // 返回任务信息（不等待），调用方可以通过 task.id 跟踪状态
    // 或者可以通过 waitForCompletion 等待完成
    return suspendedTask;
  }

  /**
   * 获取挂起的任务
   */
  getTask(id: string): SuspendedTask | undefined {
    return this.tasks.get(id);
  }

  /**
   * 获取任务列表
   */
  listTasks(): SuspendedTask[] {
    return Array.from(this.tasks.values());
  }

  /**
   * 移除任务
   */
  removeTask(id: string): void {
    this.tasks.delete(id);
    this.persist(); // 忽略持久化错误
  }

  /**
   * 更新任务状态
   */
  updateTaskStatus(id: string, status: SuspendedTaskStatus, error?: string): void {
    const task = this.tasks.get(id);
    if (!task) return;

    task.status = status;
    if (error) task.error = error;

    if (status === SuspendedTaskStatus.APPROVED) {
      task.approvedAt = new Date();
    } else if (status === SuspendedTaskStatus.COMPLETED) {
      task.completedAt = new Date();
    }

    this.persist(); // 忽略持久化错误
  }

  /**
   * 标记任务为已批准
   */
  markApproved(id: string): void {
    const task = this.tasks.get(id);
    if (!task) return;

    task.status = SuspendedTaskStatus.APPROVED;
    task.approvedAt = new Date();

    console.log(`[TaskSuspendManager] Task ${id} approved, executing...`);
    
    // 如果有执行函数，执行任务
    if (this.executeFn) {
      task.status = SuspendedTaskStatus.EXECUTING;
      this.executeFn(task)
        .then((result) => {
          task.status = SuspendedTaskStatus.COMPLETED;
          task.completedAt = new Date();
          if (task.resolve) {
            task.resolve(result);
          }
          this.persist();
        })
        .catch((error) => {
          task.status = SuspendedTaskStatus.FAILED;
          task.error = error.message;
          if (task.reject) {
            task.reject(error);
          }
          this.persist();
        });
    } else {
      // 没有执行函数，直接 resolve
      if (task.resolve) {
        task.resolve(task);
      }
    }

    this.persist();
  }

  /**
   * 标记任务为已拒绝
   */
  markRejected(id: string, reason?: string): void {
    const task = this.tasks.get(id);
    if (!task) return;

    task.status = SuspendedTaskStatus.REJECTED;
    task.error = reason || 'Approval rejected';

    console.log(`[TaskSuspendManager] Task ${id} rejected: ${task.error}`);

    if (task.reject) {
      task.reject(new Error(task.error));
    }

    this.persist();
  }

  /**
   * 开始轮询（后台运行）
   */
  startPolling(intervalMs?: number): void {
    if (this.pollingInterval) {
      console.log('[TaskSuspendManager] Polling already running');
      return;
    }

    const interval = intervalMs || this.pollingIntervalMs;
    console.log(`[TaskSuspendManager] Starting polling every ${interval}ms`);

    this.pollingInterval = setInterval(async () => {
      await this.pollApprovalStatus();
    }, interval);
  }

  /**
   * 停止轮询
   */
  stopPolling(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
      console.log('[TaskSuspendManager] Polling stopped');
    }
  }

  /**
   * 轮询审批状态
   */
  private async pollApprovalStatus(): Promise<void> {
    const pendingTasks = Array.from(this.tasks.values()).filter(
      t => t.status === SuspendedTaskStatus.PENDING
    );

    if (pendingTasks.length === 0) return;

    for (const task of pendingTasks) {
      try {
        // 使用 cheqId 或 agent id 检查审批状态
        const checkId = task.cheqId || task.name;
        const result = await this.checkApprovalFn(checkId);
        
        console.log(`[TaskSuspendManager] Task ${task.id} status: ${result.status}`);

        if (result.status === 'approved') {
          this.markApproved(task.id);
        } else if (result.status === 'rejected' || result.status === 'timeout') {
          this.markRejected(task.id, `Approval ${result.status}`);
        }
        // 如果是 pending，继续等待
      } catch (error: any) {
        console.error(`[TaskSuspendManager] Error checking approval for task ${task.id}:`, error.message);
      }
    }
  }

  /**
   * 等待任务完成
   * 注意：此方法会等待任务状态变为 COMPLETED, FAILED, REJECTED
   */
  async waitForCompletion(id: string, timeoutMs?: number): Promise<any> {
    const task = this.tasks.get(id);
    if (!task) {
      throw new Error(`Task ${id} not found`);
    }

    // 如果已经完成，直接返回
    if (task.status === SuspendedTaskStatus.COMPLETED) {
      return task;
    }

    if (task.status === SuspendedTaskStatus.FAILED || task.status === SuspendedTaskStatus.REJECTED) {
      throw new Error(task.error || 'Task failed');
    }

    // 轮询等待状态变化
    const startTime = Date.now();
    
    return new Promise((resolve, reject) => {
      const checkStatus = () => {
        const currentTask = this.tasks.get(id);
        if (!currentTask) {
          reject(new Error(`Task ${id} not found`));
          return;
        }

        if (currentTask.status === SuspendedTaskStatus.COMPLETED) {
          resolve(currentTask);
          return;
        }

        if (currentTask.status === SuspendedTaskStatus.FAILED || currentTask.status === SuspendedTaskStatus.REJECTED) {
          reject(new Error(currentTask.error || 'Task failed'));
          return;
        }

        // 检查超时
        if (timeoutMs && Date.now() - startTime > timeoutMs) {
          reject(new Error('Task completion timeout'));
          return;
        }

        // 继续等待
        setTimeout(checkStatus, 100);
      };

      checkStatus();
    });
  }

  /**
   * 持久化到文件
   */
  private async persist(): Promise<void> {
    try {
      const data = Array.from(this.tasks.values()).map(t => ({
        id: t.id,
        name: t.name,
        type: t.type,
        config: t.config,
        status: t.status,
        cheqId: t.cheqId,
        createdAt: t.createdAt.toISOString(),
        approvedAt: t.approvedAt?.toISOString(),
        completedAt: t.completedAt?.toISOString(),
        error: t.error,
      }));
      
      await fs.mkdir(path.dirname(this.storagePath), { recursive: true });
      await fs.writeFile(this.storagePath, JSON.stringify(data, null, 2));
    } catch (error: any) {
      console.error('[TaskSuspendManager] Persist error:', error.message);
    }
  }

  /**
   * 从文件加载
   */
  async load(): Promise<void> {
    try {
      const data = await fs.readFile(this.storagePath, 'utf-8');
      const tasks = JSON.parse(data);
      
      for (const t of tasks) {
        const task: SuspendedTask = {
          ...t,
          createdAt: new Date(t.createdAt),
          approvedAt: t.approvedAt ? new Date(t.approvedAt) : undefined,
          completedAt: t.completedAt ? new Date(t.completedAt) : undefined,
        };
        this.tasks.set(task.id, task);
      }
      
      console.log(`[TaskSuspendManager] Loaded ${this.tasks.size} suspended tasks`);
    } catch (error: any) {
      if (error.code !== 'ENOENT') {
        console.error('[TaskSuspendManager] Load error:', error.message);
      }
    }
  }
}
