# E003: 獬豸改造

## 概述

| 属性 | 值 |
|------|-----|
| Epic ID | E003 |
| 名称 | 獬豸改造 |
| 描述 | 使用太白 SDK 替代直接调用天枢 |
| 状态 | 🔶 进行中 |
| 优先级 | P1 |
| 依赖方 | E001 (太白 SDK) |

## 背景

**问题**：獬豸直接调用天枢，未使用太白 SDK

```go
// 当前代码 (问题代码)
http.Post("http://tianshu:8081/api/v1/...", ...)
```

**应改为**：
```go
// 正确方式
taibaiClient.SendApprovalRequest(...)
```

## 目标

1. 移除 `internal/delivery/tianshu/` 直接调用
2. 集成太白 Go SDK
3. 使用太白 SDK 调用天枢投递审批消息

## Stories

| Story | 名称 | 描述 |
|-------|------|------|
| S008 | 移除直接调用 | 移除 `internal/delivery/tianshu/` 直接调用 |
| S009 | 集成太白 SDK | 集成太白 Go SDK 替代直接调用 |

## S008: 移除直接调用

### 任务

- [ ] 定位 `xiezhi/internal/delivery/tianshu/` 中的直接调用
- [ ] 分析调用链
- [ ] 移除直接 HTTP 调用

### 当前代码问题

```go
// xiezhi/internal/delivery/tianshu/tianshu.go
func SendApprovalMessage(req *ApprovalRequest) error {
    // 直接 HTTP 调用 - 需要移除
    resp, err := http.Post(
        "http://tianshu:8081/api/v1/delivery/approval-request",
        "application/json",
        bytes.NewBuffer(data),
    )
    // ...
}
```

## S009: 集成太白 SDK

### 任务

- [ ] 引入太白 Go SDK 依赖
- [ ] 初始化 Taibai Client
- [ ] 替换直接调用为 SDK 调用

### 实现示例

```go
package xiezhi

import (
    "context"
    "taibai-sdk-go"
)

type ApprovalService struct {
    client *taibai.Client
}

func NewApprovalService(endpoint, token string) (*ApprovalService, error) {
    client, err := taibai.NewClient(taibai.Config{
        Endpoint: endpoint,
        Token:    token,
    })
    if err != nil {
        return nil, err
    }
    
    return &ApprovalService{client: client}, nil
}

func (s *ApprovalService) RequestApproval(ctx context.Context, req *ApprovalRequest) (*ApprovalResult, error) {
    // 构建审批消息
    approvalReq := &taibai.ApprovalRequest{
        RequestID:   req.ID,
        Title:       req.Title,
        Content:     req.Content,
        Requester:   req.Requester,
        Approvers:   req.Approvers,
        Priority:    req.Priority,
        CallbackURL: s.getCallbackURL(req.ID),
    }
    
    // 使用太白 SDK 发送
    return s.client.SendApprovalRequest(ctx, approvalReq)
}
```

### 配置更新

```yaml
# config.yaml
taibai:
  endpoint: "http://tianshu:8081"
  token: "${TIANSHU_TOKEN}"
```

## 验收标准

- [ ] 移除所有直接 HTTP 调用天枢的代码
- [ ] 集成太白 Go SDK
- [ ] 审批消息通过太白 SDK 发送
- [ ] 测试验证功能正常

## 相关文档

- [架构调整方案](../../docs/architecture/紫微架构调整方案.md)
- [太白 SDK 设计](../../docs/implementing/太白SDK设计.md)
- [开发计划](../../docs/tasks/开发计划.md)
