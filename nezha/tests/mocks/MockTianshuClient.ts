import type { ITianshuClient } from '../../src/core/ITianshuClient';
import type {
  AgentIdentity,
  TianshuRegisterRequest,
  TianshuRegisterResponse,
  TianshuHeartbeatRequest,
  ApprovalStatusResult,
} from '../../src/types';
import { AgentStatus, RiskLevel } from '../../src/types';

/**
 * Mock 天枢客户端，不请求真实 API，用于单元测试
 */
export class MockTianshuClient implements ITianshuClient {
  private nextAgentId = 1;

  async register(_request: TianshuRegisterRequest): Promise<TianshuRegisterResponse> {
    const agentId = `mock-agent-${this.nextAgentId++}`;
    return {
      agentId,
      status: AgentStatus.APPROVED,
      requiresApproval: false,
    };
  }

  async heartbeat(_request: TianshuHeartbeatRequest): Promise<void> {}

  async getIdentity(agentId: string): Promise<AgentIdentity> {
    return {
      id: agentId,
      name: '',
      type: '',
      riskLevel: RiskLevel.LOW,
      status: AgentStatus.APPROVED,
      createdAt: new Date(),
    };
  }

  async getApprovalStatus(_agentId: string): Promise<ApprovalStatusResult> {
    return { status: 'approved' };
  }

  async checkApprovalStatus(_agentId: string): Promise<boolean> {
    return true;
  }
}
