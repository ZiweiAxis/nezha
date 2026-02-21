# E004: 哪吒集成

## 概述

| 属性 | 值 |
|------|-----|
| Epic ID | E004 |
| 名称 | 哪吒集成 |
| 描述 | 集成谛听 + 太白 SDK |
| 状态 | ✅ 已完成 |
| 优先级 | P1 |
| 依赖方 | E001 (太白 SDK), E002 (谛听) |

## 背景

哪吒（Nezha）是紫微系统的 Agent 生命周期管理器，需要：
1. 集成谛听客户端实现系统调用拦截
2. 集成太白 SDK 实现消息发送

## 目标

1. 集成谛听客户端
2. 集成太白 Go SDK
3. Agent 启动时注入 Seccomp

## Stories

| Story | 名称 | 描述 |
|-------|------|------|
| S010 | 集成谛听客户端 | 集成谛听客户端实现拦截 |
| S011 | 集成太白 SDK | 集成太白 SDK 实现消息发送 |

---

## 验收标准 (Acceptance Criteria)

- [x] 谛听客户端正确集成
- [x] Agent 启动时 Seccomp 注入成功
- [x] 太白 SDK 正确集成
- [x] 消息发送功能正常

## Definition of Done

- [ ] 谛听客户端库引入
- [ ] Seccomp 注入成功
- [ ] 策略回调正确处理
- [ ] 太白 SDK 引入
- [ ] 消息发送功能正常
- [ ] 单元测试通过
- [ ] 集成测试通过
- [ ] 端到端测试通过

---

## S010: 集成谛听客户端

### 任务

- [ ] 引入谛听客户端库
- [ ] 配置 Seccomp 策略
- [ ] Agent 启动时注入 Seccomp

### 实现架构

```
┌─────────────────────────────────────────────┐
│              哪吒 (Nezha)                   │
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │         Agent 进程                   │   │
│  │  ┌─────────┐    ┌─────────────────┐ │   │
│  │  │ Seccomp │◄──►│ 谛听客户端       │ │   │
│  │  │ 过滤器  │    │ DitingClient    │ │   │
│  │  └─────────┘    └────────┬────────┘ │   │
│  │                          │           │   │
│  │                    HTTP │           │   │
│  │                          ▼           │   │
│  │                   ┌──────────┐       │   │
│  │                   │   谛听   │       │   │
│  │                   │  服务端  │       │   │
│  │                   └──────────┘       │   │
│  └─────────────────────────────────────┘   │
└─────────────────────────────────────────────┘
```

### 客户端接口

```go
// 谛听客户端接口
type DitingClient interface {
    // 初始化 Seccomp
    InitSeccomp() error
    
    // 设置策略回调
    SetPolicyHandler(handler PolicyHandler)
    
    // 关闭
    Close() error
}

// 策略处理函数
type PolicyHandler func(ctx context.Context, req *PolicyRequest) (*PolicyResponse, error)
```

---

### T010.1: 引入谛听客户端库

```yaml
---
title: T010.1 引入谛听客户端库
status: pending
agent: default
---
```

**目标**: 在哪吒项目中引入谛听客户端库

**上下文**:
- 工作目录: `/home/dministrator/workspace/ziwei/nezha/`
- 依赖: E002 (谛听) 开发中或完成
- Go: 1.21+

**步骤**:
1. 添加 `go get github.com/ziwei-llc/diting-client`
2. 或使用本地 replace
3. 验证 import 可用

**验收**:
- [ ] 客户端库引入成功
- [ ] 类型定义可用

---

### T010.2: Agent 启动时注入 Seccomp

```yaml
---
title: T010.2 Agent 启动时注入 Seccomp
status: pending
agent: default
---
```

**目标**: 实现 Agent 启动时自动注入 Seccomp

**上下文**:
- 工作目录: `/home/dministrator/workspace/ziwei/nezha/`
- 依赖: T010.1 完成

**步骤**:
1. 初始化谛听客户端
2. 配置策略处理回调
3. 在 Agent 启动时调用 `InitSeccomp()`
4. 处理信号优雅关闭

**验收**:
- [ ] Seccomp 注入成功
- [ ] 可通过 `/proc/self/status` 验证

**验证命令**:
```bash
grep Seccomp /proc/<agent_pid>/status
```

---

### T010.3: 测试验证

```yaml
---
title: T010.3 测试验证
status: pending
agent: default
---
```

**目标**: 验证谛听客户端集成

**上下文**:
- 工作目录: `/home/dministrator/workspace/ziwei/nezha/`
- 依赖: T010.2 完成
- 需要: 谛听服务端运行

**步骤**:
1. 启动 Agent
2. 验证 Seccomp 状态
3. 测试 syscall 拦截
4. 测试策略回调

**验收**:
- [ ] 集成测试通过
- [ ] Seccomp 拦截工作
- [ ] 策略回调触发

---

## S011: 集成太白 SDK

### 任务

- [ ] 引入太白 Go SDK
- [ ] 初始化 Taibai Client
- [ ] 实现消息发送功能

### 实现示例

```go
package nezha

import (
    "context"
    "taibai-sdk-go"
)

type MessageService struct {
    client *taibai.Client
}

func NewMessageService(endpoint, token string) (*MessageService, error) {
    client, err := taibai.NewClient(taibai.Config{
        Endpoint: endpoint,
        Token:    token,
    })
    if err != nil {
        return nil, err
    }
    
    return &MessageService{client: client}, nil
}

func (s *MessageService) SendToRoom(ctx context.Context, roomID, content string) error {
    msg := &taibai.Message{
        MessageID: uuid.New().String(),
        Sender:    "nezha-agent",
        Recipient: taibai.Recipient{
            Type: "room",
            ID:   roomID,
        },
        Content: taibai.Content{
            Type: "text",
            Body: content,
        },
    }
    
    _, err := s.client.SendMessage(ctx, msg)
    return err
}
```

### 配置

```yaml
# config.yaml
diting:
  address: "diting:8080"
  token: "${DITING_TOKEN}"

taibai:
  endpoint: "http://tianshu:8081"
  token: "${TIANSHU_TOKEN}"
```

---

### T011.1: 引入太白 Go SDK

```yaml
---
title: T011.1 引入太白 Go SDK
status: pending
agent: default
---
```

**目标**: 在哪吒项目中引入太白 Go SDK

**上下文**:
- 工作目录: `/home/dministrator/workspace/ziwei/nezha/`
- 依赖: E001 (太白 SDK) 完成

**步骤**:
1. 添加 `go get github.com/ziwei-llc/taibai-sdk-go`
2. 或使用本地 replace
3. 验证 import 可用

**验收**:
- [ ] SDK 引入成功
- [ ] 类型定义可用

---

### T011.2: 实现消息发送功能

```yaml
---
title: T011.2 实现消息发送功能
status: pending
agent: default
---
```

**目标**: 使用太白 SDK 实现消息发送

**上下文**:
- 工作目录: `/home/dministrator/workspace/ziwei/nezha/`
- 依赖: T011.1 完成

**步骤**:
1. 创建 `MessageService` 封装
2. 实现房间消息发送
3. 实现用户消息发送
4. 配置管理

**验收**:
- [ ] 消息发送功能完整
- [ ] 配置加载正确

---

### T011.3: 测试验证

```yaml
---
title: T011.3 测试验证
status: pending
agent: default
---
```

**目标**: 验证太白 SDK 集成

**上下文**:
- 工作目录: `/home/dministrator/workspace/ziwei/nezha/`
- 依赖: T011.2 完成
- 需要: 天枢服务运行

**步骤**:
1. 单元测试
2. 集成测试（发送消息到天枢）
3. E2E 测试（Agent -> 天枢 -> 房间）

**验收**:
- [ ] 单元测试通过
- [ ] 集成测试通过
- [ ] 消息发送成功

---

## 相关文档

- [架构调整方案](../../docs/architecture/紫微架构调整方案.md)
- [开发计划](../../docs/tasks/开发计划.md)
