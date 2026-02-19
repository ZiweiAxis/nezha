import { AgentConfig, AgentInstance } from '../types';

/**
 * Agent 管理器接口
 */
export interface IAgentManager {
  /**
   * 启动 Agent
   */
  start(config: AgentConfig): Promise<AgentInstance>;

  /**
   * 停止 Agent
   */
  stop(name: string): Promise<void>;

  /**
   * 重启 Agent
   */
  restart(name: string): Promise<AgentInstance>;

  /**
   * 获取 Agent 实例
   */
  getInstance(name: string): Promise<AgentInstance | null>;

  /**
   * 列出所有 Agent 实例
   */
  listInstances(): Promise<AgentInstance[]>;

  /**
   * 获取 Agent 日志
   */
  getLogs(name: string, lines?: number): Promise<string>;
}
