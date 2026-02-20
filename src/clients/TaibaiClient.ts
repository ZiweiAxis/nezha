/**
 * TaibaiClient - 太白客户端
 * 负责与太白服务通信：消息发送、房间管理
 * 对应 Go SDK: taibai/sdk/go/
 */

import { EventEmitter } from 'events';

export interface TaibaiConfig {
  serverAddress: string;  // 太白服务地址 (e.g., http://localhost:8083)
  token?: string;         // 认证 token
  apiKey?: string;        // API Key
}

export interface SendMessageRequest {
  roomId: string;
  content: string;
  messageType?: string;   // 默认: m.text
  format?: string;        // 默认: plain
  body?: string;
}

export interface SendMessageResponse {
  event_id: string;
  room_id: string;
  sender?: string;
  timestamp?: number;
}

export interface MessageEvent {
  event_id: string;
  room_id: string;
  sender: string;
  type: string;
  timestamp: number;
  content: Record<string, unknown>;
}

export interface MessagesResponse {
  chunk: MessageEvent[];
  start: string;
  end: string;
}

/**
 * Taibai 客户端 - 对接太白 SDK (Matrix 协议)
 * 
 * 太白 SDK 使用 Matrix 协议进行消息传递:
 * - POST /_matrix/client/r0/rooms/{roomId}/send/m.room.message
 * - GET /_matrix/client/r0/rooms/{roomId}/messages
 */
export class TaibaiClient extends EventEmitter {
  private config: TaibaiConfig;
  private baseUrl: string;
  private token: string;

  constructor(config: TaibaiConfig) {
    super();
    this.config = config;
    this.baseUrl = this.normalizeUrl(config.serverAddress);
    this.token = config.token || config.apiKey || '';
  }

  private normalizeUrl(url: string): string {
    // 确保 URL 有 http:// 前缀
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'http://' + url;
    }
    // 移除尾部斜杠
    return url.replace(/\/$/, '');
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
    query?: Record<string, string>
  ): Promise<T> {
    let url = `${this.baseUrl}${path}`;
    
    // 添加查询参数
    if (query) {
      const params = new URLSearchParams(query);
      url += '?' + params.toString();
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({})) as Record<string, unknown>;
      throw new Error(
        `Taibai API error: ${response.status} ${response.statusText} - ${(errorBody.error as string) || (errorBody.message as string) || 'Unknown error'}`
      );
    }

    // 处理空响应
    const text = await response.text();
    if (!text) {
      return {} as T;
    }

    return JSON.parse(text) as T;
  }

  /**
   * 发送文本消息到房间
   */
  async sendTextMessage(roomId: string, content: string): Promise<SendMessageResponse> {
    return this.sendMessage({
      roomId,
      content,
      messageType: 'm.text',
      format: 'plain',
    });
  }

  /**
   * 发送 HTML 消息到房间
   */
  async sendHTMLMessage(roomId: string, content: string, html: string): Promise<SendMessageResponse> {
    return this.sendMessage({
      roomId,
      content,
      body: content,  // plain text fallback
      messageType: 'm.text',
      format: 'html',
    });
  }

  /**
   * 发送卡片消息到房间 (Matrix card)
   */
  async sendCardMessage(roomId: string, card: Record<string, unknown>): Promise<SendMessageResponse> {
    return this.sendMessage({
      roomId,
      content: JSON.stringify(card),
      messageType: 'm.custom.card',  // 自定义消息类型
      format: 'plain',
    });
  }

  /**
   * 发送消息到房间
   */
  async sendMessage(req: SendMessageRequest): Promise<SendMessageResponse> {
    const messageType = req.messageType || 'm.text';
    const format = req.format || 'plain';
    
    const body = {
      msgtype: messageType,
      format: format,
      body: req.body || req.content,
      content: req.content,
    };

    return this.request<SendMessageResponse>(
      'POST',
      `/_matrix/client/r0/rooms/${encodeURIComponent(req.roomId)}/send/m.room.message`,
      body
    );
  }

  /**
   * 获取房间消息
   */
  async getRoomMessages(
    roomId: string,
    limit: number = 20,
    from?: string
  ): Promise<MessagesResponse> {
    const query: Record<string, string> = {
      limit: String(limit),
      dir: 'b',
    };
    
    if (from) {
      query['from'] = from;
    }

    return this.request<MessagesResponse>(
      'GET',
      `/_matrix/client/r0/rooms/${encodeURIComponent(roomId)}/messages`,
      undefined,
      query
    );
  }

  /**
   * 获取特定消息
   */
  async getMessage(roomId: string, eventId: string): Promise<MessageEvent> {
    return this.request<MessageEvent>(
      'GET',
      `/_matrix/client/r0/rooms/${encodeURIComponent(roomId)}/event/${encodeURIComponent(eventId)}`
    );
  }

  /**
   * 删除消息 (redact)
   */
  async redactMessage(roomId: string, eventId: string, reason?: string): Promise<void> {
    const body = reason ? { reason } : {};
    
    await this.request(
      'PUT',
      `/_matrix/client/r0/rooms/${encodeURIComponent(roomId)}/redact/${encodeURIComponent(eventId)}`,
      body
    );
  }

  /**
   * 创建房间
   */
  async createRoom(options: {
    name?: string;
    topic?: string;
    isPrivate?: boolean;
  }): Promise<{ room_id: string }> {
    const body = {
      name: options.name,
      topic: options.topic,
      visibility: options.isPrivate ? 'private' : 'public',
    };

    return this.request<{ room_id: string }>(
      'POST',
      '/_matrix/client/r0/createRoom',
      body
    );
  }

  /**
   * 加入房间
   */
  async joinRoom(roomIdOrAlias: string): Promise<{ room_id: string }> {
    return this.request<{ room_id: string }>(
      'POST',
      `/_matrix/client/r0/join/${encodeURIComponent(roomIdOrAlias)}`
    );
  }

  /**
   * 离开房间
   */
  async leaveRoom(roomId: string): Promise<void> {
    await this.request(
      'POST',
      `/_matrix/client/r0/rooms/${encodeURIComponent(roomId)}/leave`
    );
  }

  /**
   * 获取用户信息
   */
  async getProfile(userId: string): Promise<{
    displayname?: string;
    avatar_url?: string;
  }> {
    return this.request(
      'GET',
      `/_matrix/client/r0/profile/${encodeURIComponent(userId)}`
    );
  }

  /**
   * 测试连接
   */
  async ping(): Promise<boolean> {
    try {
      await this.request<{ flows: unknown[] }>('GET', '/_matrix/client/versions');
      return true;
    } catch {
      return false;
    }
  }
}

export default TaibaiClient;
