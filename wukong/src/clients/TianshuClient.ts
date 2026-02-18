import {
  AgentIdentity,
  TianshuRegisterRequest,
  TianshuRegisterResponse,
  TianshuHeartbeatRequest,
  AgentStatus,
  RiskLevel,
  ApprovalStatusResult,
  ApprovalDisplayStatus
} from '../types';
import { ITianshuClient } from '../core/ITianshuClient';

/** 天枢 API 与太白/集成方案约定一致：宿主机一键部署时默认 8082 */
const DEFAULT_TIANSHU_API_URL = 'http://localhost:8082';

/**
 * 天枢客户端实现（对接天枢 POST /api/v1/agents/register、/api/v1/agents/heartbeat）
 */
export class TianshuClient implements ITianshuClient {
  private baseUrl: string;
  private apiKey?: string;
  private ownerId?: string;

  constructor(baseUrl?: string, apiKey?: string, ownerId?: string) {
    this.baseUrl = (baseUrl || process.env.TIANSHU_API_URL || DEFAULT_TIANSHU_API_URL).replace(/\/$/, '');
    this.apiKey = apiKey || process.env.TIANSHU_API_KEY;
    this.ownerId = ownerId || process.env.WUKONG_OWNER_ID;
  }

  async register(request: TianshuRegisterRequest): Promise<TianshuRegisterResponse> {
    const ownerId = this.ownerId || process.env.WUKONG_OWNER_ID || 'wukong-default-owner';
    const body = { owner_id: ownerId, agent_display_id: request.name || undefined };
    const res = await this.fetch('/api/v1/agents/register', {
      method: 'POST',
      body: JSON.stringify(body),
    }) as {
      agent_id?: string;
      status?: string;
      requires_approval?: boolean;
      error?: string;
    };
    const agentId = res.agent_id;
    if (!agentId) throw new Error('Tianshu register response missing agent_id');
    const status =
      res.status === 'pending'
        ? AgentStatus.PENDING
        : res.status === 'approved'
          ? AgentStatus.APPROVED
          : AgentStatus.APPROVED;
    const requiresApproval = res.requires_approval ?? (status === AgentStatus.PENDING);
    return {
      agentId,
      status,
      requiresApproval,
    };
  }

  async heartbeat(request: TianshuHeartbeatRequest): Promise<void> {
    const body = { agent_id: request.agentId, status: request.status };
    await this.fetch('/api/v1/agents/heartbeat', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  async getIdentity(agentId: string): Promise<AgentIdentity> {
    const data = await this.fetch(`/api/v1/agents/${encodeURIComponent(agentId)}`) as { agent_id?: string; status?: string };
    if (!data.agent_id) throw new Error('Tianshu getIdentity: missing agent_id');
    const status = data.status === 'pending' ? AgentStatus.PENDING : AgentStatus.APPROVED;
    return {
      id: data.agent_id,
      name: '',
      type: '',
      riskLevel: RiskLevel.LOW,
      status,
      createdAt: new Date(),
    };
  }

  /** 获取审批展示状态（待审批/通过/拒绝/超时），FR3 */
  async getApprovalStatus(agentId: string): Promise<ApprovalStatusResult> {
    try {
      const data = await this.fetch(`/api/v1/agents/${encodeURIComponent(agentId)}`) as { status?: string };
      const s = (data.status || 'pending').toLowerCase();
      const status: ApprovalDisplayStatus =
        s === 'approved' ? 'approved' : s === 'rejected' ? 'rejected' : s === 'timeout' ? 'timeout' : 'pending';
      return { status };
    } catch (err: any) {
      if (err.status === 404) return { status: 'rejected' };
      throw err;
    }
  }

  async checkApprovalStatus(agentId: string): Promise<boolean> {
    const { status } = await this.getApprovalStatus(agentId);
    return status === 'approved';
  }

  private async fetch(endpoint: string, options: RequestInit & { body?: string } = {}): Promise<any> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    const data = response.headers.get('content-type')?.includes('application/json')
      ? await response.json().catch(() => ({}))
      : {};
    if (!response.ok) {
      const err = new Error(`Tianshu API error: ${response.status} ${response.statusText}`);
      (err as any).status = response.status;
      (err as any).body = data;
      throw err;
    }
    return data;
  }
}
