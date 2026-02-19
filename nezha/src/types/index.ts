/**
 * Agent 状态枚举
 */
export enum AgentStatus {
  PENDING = 'pending',           // 等待审批
  APPROVED = 'approved',         // 已审批
  RUNNING = 'running',           // 运行中
  STOPPED = 'stopped',           // 已停止
  FAILED = 'failed',             // 失败
  RESTARTING = 'restarting',     // 重启中
}

/**
 * 运行模式
 */
export enum RunMode {
  LOCAL = 'local',               // 本地模式
  SANDBOX = 'sandbox',           // Docker 沙箱
  DEEP_SANDBOX = 'deep-sandbox', // gVisor 深度沙箱
}

/**
 * 风险等级
 */
export enum RiskLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
}

/**
 * Agent 身份信息
 */
export interface AgentIdentity {
  id: string;
  name: string;
  type: string;
  riskLevel: RiskLevel;
  status: AgentStatus;
  createdAt: Date;
  approvedAt?: Date;
}

/**
 * Agent 配置
 */
export interface AgentConfig {
  name: string;
  type: string;
  mode: RunMode;
  workDir?: string;
  env?: Record<string, string>;
  autoRestart?: boolean;
  restartPolicy?: RestartPolicy;
}

/**
 * 重启策略
 */
export interface RestartPolicy {
  enabled: boolean;
  maxRetries: number;
  delay: number; // 毫秒
  backoff: 'immediate' | 'linear' | 'exponential';
}

/**
 * Agent 实例信息
 */
export interface AgentInstance {
  id: string;
  name: string;
  type: string;
  mode: RunMode;
  status: AgentStatus;
  pid?: number;
  containerId?: string;
  startedAt?: Date;
  stoppedAt?: Date;
  restartCount: number;
}

/**
 * 天枢注册请求
 */
export interface TianshuRegisterRequest {
  name: string;
  type: string;
  riskLevel: RiskLevel;
  metadata?: Record<string, any>;
}

/**
 * 天枢注册响应
 */
export interface TianshuRegisterResponse {
  agentId: string;
  status: AgentStatus;
  requiresApproval: boolean;
}

/**
 * 天枢心跳请求
 */
export interface TianshuHeartbeatRequest {
  agentId: string;
  status: AgentStatus;
  metrics?: AgentMetrics;
}

/**
 * Agent 指标
 */
export interface AgentMetrics {
  cpu?: number;
  memory?: number;
  uptime?: number;
}

/** 审批展示状态：待审批/通过/拒绝/超时（FR3） */
export type ApprovalDisplayStatus = 'pending' | 'approved' | 'rejected' | 'timeout';

export interface ApprovalStatusResult {
  status: ApprovalDisplayStatus;
}
