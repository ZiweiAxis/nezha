# E003: 獬豸改造

## 概述

| 属性 | 值 |
|------|-----|
| Epic ID | E003 |
| 名称 | 獬豸改造 |
| 描述 | 使用太白 SDK 替代直接调用天枢 |
| 状态 | ✅ 已完成 |
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

---

## 验收标准 (Acceptance Criteria)

- [x] 移除所有直接 HTTP 调用天枢的代码
- [x] 集成太白 Go SDK
- [x] 审批消息通过太白 SDK 发送
- [x] 测试验证功能正常

## Definition of Done

- [ ] 分析报告完成（所有直接调用位置）
- [ ] `internal/delivery/tianshu/` 模块移除
- [ ] 太白 Go SDK 正确引入
- [ ] 所有 HTTP 调用替换为 SDK 调用
- [ ] 编译通过
- [ ] 单元测试通过
- [ ] 集成测试通过
- [ ] 性能无明显下降

---

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

---

### T008.1: 分析直接调用位置

```yaml
---
title: T008.1 分析直接调用位置
status: pending
agent: default
---
```

**目标**: 定位所有直接调用天枢的位置

**上下文**:
- 工作目录: `/home/dministrator/workspace/ziwei/xiezhi/`
- 依赖: E001 (太白 SDK) 开发中

**步骤**:
1. 使用 `grep -r "http://tianshu"` 搜索
2. 使用 `grep -r "http.Post\|http.Get\|http.Do"` 搜索
3. 分析调用链和依赖关系
4. 生成分析报告

**验收**:
- [ ] 所有直接调用位置已定位
- [ ] 分析报告包含调用方、被调用方、参数

**输出**: 分析报告（Markdown 格式）

---

### T008.2: 移除 delivery/tianshu 模块

```yaml
---
title: T008.2 移除 delivery/tianshu 模块
status: pending
agent: default
---
```

**目标**: 移除直接调用模块

**上下文**:
- 工作目录: `/home/dministrator/workspace/ziwei/xiezhi/`
- 依赖: T008.1 完成

**步骤**:
1. 删除 `internal/delivery/tianshu/` 目录
2. 更新 import 引用
3. 移除相关配置
4. 更新 go.mod

**验收**:
- [ ] 目录已删除
- [ ] 无残留引用
- [ ] go.mod 更新正确

---

### T008.3: 验证构建

```yaml
---
title: T008.3 验证构建
status: pending
agent: default
---
```

**目标**: 验证移除后项目能够编译

**上下文**:
- 工作目录: `/home/dministrator/workspace/ziwei/xiezhi/`
- 依赖: T008.2 完成

**步骤**:
1. 运行 `go build ./...`
2. 修复编译错误
3. 运行 `go vet`
4. 确认无警告

**验收**:
- [ ] 编译通过
- [ ] vet 无警告

---

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

---

### T009.1: 引入太白 Go SDK

```yaml
---
title: T009.1 引入太白 Go SDK
status: pending
agent: default
---
```

**目标**: 在项目中引入太白 Go SDK

**上下文**:
- 工作目录: `/home/dministrator/workspace/ziwei/xiezhi/`
- 依赖: E001 完成，或使用本地 replace

**步骤**:
1. 添加 `go get github.com/ziwei-llc/taibai-sdk-go`
2. 或使用本地 replace: `replace github.com/ziwei-llc/taibai-sdk-go => ../taibai-sdk-go`
3. 验证 import 可用

**验收**:
- [ ] SDK 引入成功
- [ ] import 无错误

---

### T009.2: 替换直接 HTTP 调用

```yaml
---
title: T009.2 替换直接 HTTP 调用
status: pending
agent: default
---
```

**目标**: 使用太白 SDK 替换所有直接 HTTP 调用

**上下文**:
- 工作目录: `/home/dministrator/workspace/ziwei/xiezhi/`
- 依赖: T009.1 完成

**步骤**:
1. 创建 `taibai_client.go` 封装
2. 替换所有 `http.Post/Get/Do` 调用
3. 保持原有接口不变
4. 添加配置加载

**验收**:
- [ ] 所有调用已替换
- [ ] 原有功能保持

---

### T009.3: 测试验证

```yaml
---
title: T009.3 测试验证
status: pending
agent: default
---
```

**目标**: 验证集成后功能正常

**上下文**:
- 工作目录: `/home/dministrator/workspace/ziwei/xiezhi/`
- 依赖: T009.2 完成
- 需要: 天枢服务运行

**步骤**:
1. 运行单元测试 `go test ./...`
2. 集成测试（调用天枢）
3. 验证审批消息发送
4. 性能对比

**验收**:
- [ ] 单元测试通过
- [ ] 集成测试通过
- [ ] 审批功能正常

---

## 相关文档

- [架构调整方案](../../docs/architecture/紫微架构调整方案.md)
- [太白 SDK 设计](../../docs/implementing/太白SDK设计.md)
- [开发计划](../../docs/tasks/开发计划.md)
