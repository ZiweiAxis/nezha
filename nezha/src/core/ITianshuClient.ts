import {
  AgentIdentity,
  TianshuRegisterRequest,
  TianshuRegisterResponse,
  TianshuHeartbeatRequest,
  ApprovalStatusResult
} from '../types';

/**
 * 天枢客户端接口
 */
export interface ITianshuClient {
  /**
   * 注册 Agent 身份
   */
  register(request: TianshuRegisterRequest): Promise<TianshuRegisterResponse>;

  /**
   * 发送心跳
   */
  heartbeat(request: TianshuHeartbeatRequest): Promise<void>;

  /**
   * 获取 Agent 身份信息
   */
  getIdentity(agentId: string): Promise<AgentIdentity>;

  /**
   * 获取审批状态（待审批/通过/拒绝/超时，FR3）
   */
  getApprovalStatus(agentId: string): Promise<ApprovalStatusResult>;

  /**
   * 检查审批状态（是否已通过）
   */
  checkApprovalStatus(agentId: string): Promise<boolean>;
}
