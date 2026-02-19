import { AgentConfig, AgentInstance } from '../types';

/**
 * Agent 适配器接口
 * 每种 Agent 类型（Claude、Cursor 等）需要实现此接口
 */
export interface IAgentAdapter {
  /**
   * 适配器名称
   */
  readonly name: string;

  /**
   * 启动 Agent
   */
  start(config: AgentConfig): Promise<AgentInstance>;

  /**
   * 停止 Agent
   */
  stop(instance: AgentInstance): Promise<void>;

  /**
   * 重启 Agent
   */
  restart(instance: AgentInstance): Promise<AgentInstance>;

  /**
   * 检查 Agent 状态
   */
  checkStatus(instance: AgentInstance): Promise<boolean>;

  /**
   * 配置 diting-hook
   */
  configureDitingHook(instance: AgentInstance): Promise<void>;
}
