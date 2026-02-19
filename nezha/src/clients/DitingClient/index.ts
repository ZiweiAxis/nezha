/**
 * DitingClient - 谛听客户端
 * 负责与谛听服务通信：策略下发、审批状态、JIT策略
 */

import { EventEmitter } from 'events';
import WebSocket from 'ws';
import { TaskSuspendManager } from '../../managers/TaskSuspendManager';

export interface DitingConfig {
  baseUrl: string;      // 谛听服务地址 (e.g., http://localhost:8080)
  wsUrl?: string;       // WebSocket 地址 (e.g., ws://localhost:8080)
  clientId?: string;    // 客户端 ID
  pollingInterval?: number;  // 轮询间隔 (ms)
}

export interface ApprovalResult {
  approval_id: string;
  status: 'APPROVED' | 'REJECTED';
  subject: string;
  approved_by?: string;
  note?: string;
  timestamp: string;
}

export interface PolicyPushMessage {
  type: 'policy_push' | 'approval_result' | 'heartbeat_ack' | 'register_ack';
  payload: any;
}

export class DitingClient extends EventEmitter {
  private config: DitingConfig;
  private ws: WebSocket | null = null;
  private taskManager: TaskSuspendManager;
  private connected: boolean = false;
  private reconnectTimer: NodeJS.Timeout | null = null;

  constructor(config: DitingConfig, taskManager: TaskSuspendManager) {
    super();
    this.config = config;
    this.taskManager = taskManager;
  }

  /**
   * 连接到谛听服务
   */
  async connect(): Promise<void> {
    const wsUrl = this.config.wsUrl || this.config.baseUrl.replace('http', 'ws') + '/api/v1/ws/policy';
    
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(wsUrl);

      this.ws.on('open', () => {
        console.log('[DitingClient] WebSocket connected');
        this.connected = true;
        
        // 注册客户端
        this.send({
          type: 'register',
          payload: { client_id: this.config.clientId || 'wukong-' + Date.now() }
        });
        
        resolve();
      });

      this.ws.on('message', (data: WebSocket.Data) => {
        try {
          const message: PolicyPushMessage = JSON.parse(data.toString());
          this.handleMessage(message);
        } catch (err) {
          console.error('[DitingClient] Failed to parse message:', err);
        }
      });

      this.ws.on('close', () => {
        console.log('[DitingClient] WebSocket disconnected');
        this.connected = false;
        this.scheduleReconnect();
      });

      this.ws.on('error', (err) => {
        console.error('[DitingClient] WebSocket error:', err);
        reject(err);
      });
    });
  }

  /**
   * 断开连接
   */
  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.connected = false;
  }

  /**
   * 发送消息
   */
  private send(message: any): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }

  /**
   * 处理接收到的消息
   */
  private handleMessage(message: PolicyPushMessage): void {
    console.log('[DitingClient] Received:', message.type);
    
    switch (message.type) {
      case 'register_ack':
        console.log('[DitingClient] Registered successfully');
        break;

      case 'heartbeat_ack':
        // 心跳响应
        break;

      case 'policy_push':
        // 策略更新
        this.emit('policy:update', message.payload);
        break;

      case 'approval_result':
        // 审批结果 - 关键！
        this.handleApprovalResult(message.payload);
        break;

      default:
        console.log('[DitingClient] Unknown message type:', message.type);
    }
  }

  /**
   * 处理审批结果
   */
  private handleApprovalResult(payload: ApprovalResult): void {
    console.log('[DitingClient] Approval result:', payload);
    
    const { approval_id, status, approved_by, note } = payload;

    if (status === 'APPROVED') {
      // 标记任务为已批准
      this.taskManager.markApproved(approval_id);
      
      // 触发恢复事件
      this.emit('approval:approved', {
        approvalId: approval_id,
        approvedBy: approved_by,
        note
      });
      
      console.log(`[DitingClient] Task ${approval_id} approved, resuming...`);
    } else if (status === 'REJECTED') {
      // 标记任务为已拒绝
      this.taskManager.markRejected(approval_id, note || 'Rejected');
      
      this.emit('approval:rejected', {
        approvalId: approval_id,
        note
      });
      
      console.log(`[DitingClient] Task ${approval_id} rejected`);
    }
  }

  /**
   * 调度重连
   */
  private scheduleReconnect(): void {
    if (this.reconnectTimer) return;
    
    this.reconnectTimer = setTimeout(() => {
      console.log('[DitingClient] Reconnecting...');
      this.connect().catch(err => {
        console.error('[DitingClient] Reconnect failed:', err);
      });
    }, 5000);
  }

  /**
   * 发送心跳
   */
  private startHeartbeat(): void {
    setInterval(() => {
      if (this.connected) {
        this.send({ type: 'heartbeat', payload: {} });
      }
    }, 30000);
  }

  /**
   * 创建审批请求
   */
  async createApprovalRequest(params: {
    subject: string;
    action: string;
    resource: string;
    context?: any;
  }): Promise<string> {
    const response = await fetch(`${this.config.baseUrl}/api/v1/approval/request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    });

    const data = await response.json() as { approval_id: string };
    return data.approval_id;
  }

  /**
   * 查询审批状态
   */
  async getApprovalStatus(approvalId: string): Promise<ApprovalResult> {
    const response = await fetch(`${this.config.baseUrl}/api/v1/approval/${approvalId}`);
    return response.json() as Promise<ApprovalResult>;
  }

  /**
   * 检查连接状态
   */
  isConnected(): boolean {
    return this.connected;
  }
}

export default DitingClient;
