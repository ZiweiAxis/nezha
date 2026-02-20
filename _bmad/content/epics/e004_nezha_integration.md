# E004: 哪吒集成

## 概述

| 属性 | 值 |
|------|-----|
| Epic ID | E004 |
| 名称 | 哪吒集成 |
| 描述 | 集成谛听 + 太白 SDK |
| 状态 | 🔶 进行中 |
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

### 使用示例

```go
package nezha

import (
    "context"
    "diting-client"
)

func NewAgent(config *AgentConfig) (*Agent, error) {
    // 初始化谛听客户端
    diting, err := diting.NewClient(diting.Config{
        Address: config.DitingAddr,
        Token:   config.DitingToken,
    })
    if err != nil {
        return nil, err
    }
    
    // 设置策略处理
    diting.SetPolicyHandler(func(ctx context.Context, req *diting.PolicyRequest) (*diting.PolicyResponse, error) {
        // 自定义策略处理逻辑
        return &diting.PolicyResponse{
            Decision: diting.DecisionAllow,
        }, nil
    })
    
    // 初始化 Seccomp
    if err := diting.InitSeccomp(); err != nil {
        return nil, err
    }
    
    return &Agent{
        diting: diting,
    }, nil
}
```

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

## 验收标准

- [ ] 谛听客户端正确集成
- [ ] Agent 启动时 Seccomp 注入成功
- [ ] 太白 SDK 正确集成
- [ ] 消息发送功能正常

## 相关文档

- [架构调整方案](../../docs/architecture/紫微架构调整方案.md)
- [开发计划](../../docs/tasks/开发计划.md)
