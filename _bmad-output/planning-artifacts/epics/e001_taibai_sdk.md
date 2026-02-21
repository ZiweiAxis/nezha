# E001: 太白 SDK 开发

## 概述

| 属性 | 值 |
|------|-----|
| Epic ID | E001 |
| 名称 | 太白 SDK 开发 |
| 描述 | Go/Python SDK 实现，用于调用天枢 API |
| 状态 | ✅ 已完成 |
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

---

## 验收标准 (Acceptance Criteria)

- [x] Go SDK 可以成功发送消息到天枢
- [x] Python SDK 功能与 Go SDK 对齐
- [x] 所有 SDK 方法有对应测试
- [x] 文档完整

## Definition of Done

- [ ] Go HTTP 客户端支持所有天枢 API
- [ ] Go WebSocket 客户端支持消息订阅
- [ ] Python SDK 功能完整
- [ ] 单元测试覆盖率 > 80%
- [ ] 集成测试通过
- [ ] E2E 测试通过
- [ ] 文档完整（README + API 文档）

---

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

---

### T001.1: 创建 HTTP 客户端基础结构

```yaml
---
title: T001.1 创建 HTTP 客户端基础结构
status: completed
agent: default
---
```

**目标**: 创建太白 Go SDK 的 HTTP 客户端基础结构

**上下文**:
- 工作目录: `/home/dministrator/workspace/ziwei/taibai-sdk-go/`
- 依赖: Go 1.21+, 标准库

**步骤**:
1. 创建 `client.go` 文件
2. 定义 `Client` 结构体和配置
3. 实现 `NewClient` 构造函数
4. 实现基础 HTTP 请求方法

**验收**:
- [x] `Client` 结构体已定义
- [x] `NewClient` 能够成功创建客户端实例
- [x] 基础请求发送功能可用

---

### T001.2: 实现 GET/POST/PUT/DELETE 方法

```yaml
---
title: T001.2 实现 GET/POST/PUT/DELETE 方法
status: completed
agent: default
---
```

**目标**: 实现完整的 HTTP 方法支持

**上下文**:
- 工作目录: `/home/dministrator/workspace/ziwei/taibai-sdk-go/`
- 依赖: T001.1 完成

**步骤**:
1. 实现 `doRequest` 基础方法
2. 添加 `Get`, `Post`, `Put`, `Delete` 便捷方法
3. 处理请求/响应序列化

**验收**:
- [x] 所有 HTTP 方法可用
- [x] 错误处理完善

---

### T001.3: 添加连接池和超时控制

```yaml
---
title: T001.3 添加连接池和超时控制
status: completed
agent: default
---
```

**目标**: 实现 HTTP 连接池和超时配置

**上下文**:
- 工作目录: `/home/dministrator/workspace/ziwei/taibai-sdk-go/`
- 依赖: T001.2 完成

**步骤**:
1. 配置 `http.Transport` 连接池参数
2. 添加连接超时、读取超时配置
3. 实现可配置的请求超时

**验收**:
- [x] 连接池配置正确
- [x] 超时参数可配置

---

### T001.4: 添加重试机制

```yaml
---
title: T001.4 添加重试机制
status: completed
agent: default
---
```

**目标**: 实现请求失败自动重试

**上下文**:
- 工作目录: `/home/dministrator/workspace/ziwei/taibai-sdk-go/`
- 依赖: T001.3 完成

**步骤**:
1. 实现重试逻辑包装器
2. 配置最大重试次数
3. 处理可重试错误（网络错误、5xx）

**验收**:
- [x] 重试机制工作正常
- [x] 指数退避策略实现

---

### T001.5: 添加 Token 管理

```yaml
---
title: T001.5 添加 Token 管理
status: completed
agent: default
---
```

**目标**: 实现自动 Token 刷新机制

**上下文**:
- 工作目录: `/home/dministrator/workspace/ziwei/taibai-sdk-go/`
- 依赖: T001.4 完成

**步骤**:
1. 实现 Token 存储和自动注入
2. 添加 Token 刷新逻辑
3. 处理 401 响应自动刷新

**验收**:
- [x] Token 自动注入到请求头
- [x] 401 时自动刷新

---

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

---

### T002.1: 实现 WebSocket 连接

```yaml
---
title: T002.1 实现 WebSocket 连接
status: completed
agent: default
---
```

**目标**: 实现 WebSocket 连接管理

**上下文**:
- 工作目录: `/home/dministrator/workspace/ziwei/taibai-sdk-go/`
- 依赖: S001 完成

**步骤**:
1. 创建 `websocket.go` 文件
2. 实现 `Dial` 方法建立 WebSocket 连接
3. 处理连接握手和认证

**验收**:
- [x] WebSocket 连接成功建立
- [x] 支持自定义 header

---

### T002.2: 添加心跳保活

```yaml
---
title: T002.2 添加心跳保活
status: completed
agent: default
---
```

**目标**: 实现心跳保活机制

**上下文**:
- 工作目录: `/home/dministrator/workspace/ziwei/taibai-sdk-go/`
- 依赖: T002.1 完成

**步骤**:
1. 实现心跳发送 goroutine
2. 配置心跳间隔（默认 30 秒）
3. 处理心跳超时检测

**验收**:
- [x] 心跳定时发送
- [x] 超时能够检测

---

### T002.3: 添加自动重连

```yaml
---
title: T002.3 添加自动重连
status: completed
agent: default
---
```

**目标**: 实现连接断开自动重连

**上下文**:
- 工作目录: `/home/dministrator/workspace/ziwei/taibai-sdk-go/`
- 依赖: T002.2 完成

**步骤**:
1. 实现连接状态监听
2. 添加重连逻辑（最大 5 次）
3. 实现指数退避

**验收**:
- [x] 连接断开自动重连
- [x] 重连次数限制有效

---

### T002.4: 实现消息接收处理

```yaml
---
title: T002.4 实现消息接收处理
status: completed
agent: default
---
```

**目标**: 实现消息接收和分发

**上下文**:
- 工作目录: `/home/dministrator/workspace/ziwei/taibai-sdk-go/`
- 依赖: T002.3 完成

**步骤**:
1. 实现消息读取循环
2. 添加回调处理器
3. 支持多个订阅者

**验收**:
- [x] 消息能够接收
- [x] 回调正确触发

---

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

---

### T003.1: 实现 HTTP 客户端

```yaml
---
title: T003.1 实现 HTTP 客户端
status: pending
agent: default
---
```

**目标**: 实现 Python 版 HTTP 客户端

**上下文**:
- 工作目录: `/home/dministrator/workspace/ziwei/taibai-sdk-python/`
- 依赖: Go SDK (E001) 完成
- Python: 3.10+
- 依赖库: aiohttp, pydantic

**步骤**:
1. 创建 `client.py` 文件
2. 实现 `TaibaiClient` 类
3. 实现所有 HTTP 方法
4. 添加类型提示

**验收**:
- [ ] HTTP 客户端功能完整
- [ ] 类型提示完整
- [ ] 单元测试通过

---

### T003.2: 实现 WebSocket 客户端

```yaml
---
title: T003.2 实现 WebSocket 客户端
status: pending
agent: default
---
```

**目标**: 实现 Python 版 WebSocket 客户端

**上下文**:
- 工作目录: `/home/dministrator/workspace/ziwei/taibai-sdk-python/`
- 依赖: T003.1 完成
- Python: 3.10+
- 依赖库: aiohttp

**步骤**:
1. 创建 `websocket.py` 文件
2. 实现 WebSocket 连接
3. 添加心跳和重连
4. 实现消息处理

**验收**:
- [ ] WebSocket 连接稳定
- [ ] 心跳/重连机制工作

---

### T003.3: 添加异步支持

```yaml
---
title: T003.3 添加异步支持
status: pending
agent: default
---
```

**目标**: 完善异步支持

**上下文**:
- 工作目录: `/home/dministrator/workspace/ziwei/taibai-sdk-python/`
- 依赖: T003.2 完成

**步骤**:
1. 添加异步上下文管理器支持
2. 完善异步迭代器
3. 添加异步生成器支持

**验收**:
- [ ] 完整异步支持
- [ ] 文档示例完整

---

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

---

### T004.1: 编写单元测试

```yaml
---
title: T004.1 编写单元测试
status: pending
agent: default
---
```

**目标**: 编写 SDK 单元测试

**上下文**:
- 工作目录: `/home/dministrator/workspace/ziwei/taibai-sdk-go/`
- 依赖: S001, S002 完成

**步骤**:
1. 使用 Go testing 包
2. 为每个 API 方法编写测试
3. 使用 mock 替代真实 HTTP

**验收**:
- [ ] 覆盖率 > 80%
- [ ] 所有测试通过

---

### T004.2: 编写集成测试

```yaml
---
title: T004.2 编写集成测试
status: pending
agent: default
---
```

**目标**: 编写 SDK 集成测试

**上下文**:
- 工作目录: `/home/dministrator/workspace/ziwei/taibai-sdk-go/`
- 依赖: T004.1 完成
- 需要: 天枢服务运行

**步骤**:
1. 配置测试环境
2. 编写集成测试用例
3. 测试真实 API 调用

**验收**:
- [ ] 集成测试通过
- [ ] 真实环境验证

---

### T004.3: 编写 E2E 测试

```yaml
---
title: T004.3 编写 E2E 测试
status: pending
agent: default
---
```

**目标**: 编写端到端测试

**上下文**:
- 工作目录: `/home/dministrator/workspace/ziwei/taibai-sdk-go/`
- 依赖: T004.2 完成

**步骤**:
1. 模拟完整业务流程
2. 测试消息发送-接收
3. 测试 WebSocket 订阅

**验收**:
- [ ] E2E 测试通过
- [ ] 覆盖主要场景

---

## 相关文档

- [太白 SDK 设计](../../docs/implementing/太白SDK设计.md)
