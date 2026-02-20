# E001: 太白 SDK 开发

## 概述

| 属性 | 值 |
|------|-----|
| Epic ID | E001 |
| 名称 | 太白 SDK 开发 |
| 描述 | Go/Python SDK 实现，用于调用天枢 API |
| 状态 | 🔶 进行中 |
| 优先级 | P0 |
| 依赖方 | E003, E004 |

## 背景

紫微系统架构调整要求：
- **哪吒** 和 **獬豸** 都应该使用太白 SDK 调用天枢
- 不允许直接调用天枢 API
- 太白内部使用 HTTP 还是 WebSocket 是内部实现细节

## 目标

1. 提供统一的天枢调用接口
2. 支持 Go、Python、JavaScript/Node.js
3. 封装认证、连接池、重连等复杂逻辑

## Stories

| Story | 名称 | 描述 |
|-------|------|------|
| S001 | Go HTTP 客户端 | 实现 Go 版 HTTP 客户端基础功能 |
| S002 | Go WebSocket 客户端 | 实现 Go 版 WebSocket 客户端 |
| S003 | Python SDK | 实现 Python 版 SDK |
| S004 | SDK 集成测试 | 编写 SDK 集成测试用例 |

## S001: Go HTTP 客户端

### 任务

- [x] HTTP Client 基础结构
- [x] 消息发送 API
- [x] 用户管理 API
- [x] 房间管理 API

### 实现要点

```go
type Client interface {
    SendMessage(ctx context.Context, msg *Message) (*SendResult, error)
    GetUser(ctx context.Context, userID string) (*User, error)
    GetUserRoles(ctx context.Context, userID string) ([]string, error)
    CreateRoom(ctx context.Context, req *CreateRoomRequest) (*Room, error)
    JoinRoom(ctx context.Context, roomID, userID string) error
    GetRoomMembers(ctx context.Context, roomID string) ([]*User, error)
    Close() error
}
```

### API 映射

| SDK 方法 | 天枢 API |
|----------|----------|
| SendMessage | POST /api/v1/message/forward |
| GetUser | GET /api/v1/users/{userId} |
| GetUserRoles | GET /api/v1/users/{userId}/roles |
| CreateRoom | POST /api/v1/rooms |
| JoinRoom | POST /api/v1/rooms/{roomId}/join |
| GetRoomMembers | GET /api/v1/rooms/{roomId}/members |

## S002: Go WebSocket 客户端

### 任务

- [x] WebSocket 连接管理
- [x] 消息接收
- [x] 自动重连
- [x] 心跳保活

### 实现要点

- 使用 `/ws/stream` 端点订阅消息
- 实现自动重连机制（最大 5 次）
- 心跳间隔 30 秒

## S003: Python SDK

### 任务

- [ ] 实现与 Go SDK 相同的接口
- [ ] 支持异步操作
- [ ] 类型提示完善

### 实现路径

参考 Go SDK 实现，翻译为 Python 异步风格：

```python
class Client(ABC):
    async def send_message(self, msg: Message) -> SendResult: ...
    async def subscribe(self, handler: Callable[[Message], None]) -> None: ...
    async def get_user(self, user_id: str) -> User: ...
    async def create_room(self, req: CreateRoomRequest) -> Room: ...
```

## S004: SDK 集成测试

### 任务

- [ ] 单元测试覆盖
- [ ] 集成测试用例
- [ ] 错误处理测试

### 测试场景

1. 消息发送成功/失败
2. Token 刷新
3. WebSocket 重连
4. 超时处理

## 验收标准

- [ ] Go SDK 可以成功发送消息到天枢
- [ ] Python SDK 功能与 Go SDK 对齐
- [ ] 所有 SDK 方法有对应测试
- [ ] 文档完整

## 相关文档

- [太白 SDK 设计](../../docs/implementing/太白SDK设计.md)
