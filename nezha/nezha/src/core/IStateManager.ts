import { AgentInstance, AgentStatus } from '../types';

/**
 * 状态管理器接口
 */
export interface IStateManager {
  /**
   * 保存 Agent 实例状态
   */
  saveInstance(instance: AgentInstance): Promise<void>;

  /**
   * 获取 Agent 实例状态
   */
  getInstance(name: string): Promise<AgentInstance | null>;

  /**
   * 更新 Agent 状态
   */
  updateStatus(name: string, status: AgentStatus): Promise<void>;

  /**
   * 列出所有实例
   */
  listInstances(): Promise<AgentInstance[]>;

  /**
   * 删除实例
   */
  removeInstance(name: string): Promise<void>;

  /**
   * 同步状态到天枢
   */
  syncToTianshu(name: string): Promise<void>;
}
