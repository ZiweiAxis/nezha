# E002: 谛听 Seccomp

## 概述

| 属性 | 值 |
|------|-----|
| Epic ID | E002 |
| 名称 | 谛听 Seccomp |
| 描述 | Seccomp 拦截实现，策略执行点 |
| 状态 | 🔶 进行中 |
| 优先级 | P1 |
| 依赖方 | E004 |

## 背景

谛听（Di Ting）是紫微系统的 PEP（Policy Enforcement Point），负责：
1. 拦截 Agent 的系统调用
2. 与獬豸通信获取策略决策
3. 实现 Seccomp 通知处理

## 目标

1. 实现 Linux Seccomp 通知机制
2. 实现策略本地缓存
3. 实现与獬豸的 HTTP 通信
4. 实现审批回调机制

## Stories

| Story | 名称 | 描述 |
|-------|------|------|
| S005 | Seccomp 核心实现 | Seccomp 通知处理、syscall 拦截 |
| S006 | 策略缓存 | 本地策略缓存机制 |
| S007 | 与獬豸通信 | HTTP 调用獬豸获取策略决策 |

## S005: Seccomp 核心实现

### 任务

- [ ] Seccomp BPF 过滤器配置
- [ ] SECCOMP_RET_NOTIFY 处理
- [ ] Syscall 参数解析
- [ ] 请求队列管理

### 实现架构

```
用户空间                              内核空间
┌─────────────────────────────────────────────┐
│              谛听进程                       │
│  ┌─────────┐    ┌──────────┐    ┌───────┐ │
│  │ Seccomp │◄──►│ 请求队列 │◄──►│ 决策  │ │
│  │ 过滤器   │    │          │    │ 处理器│ │
│  └─────────┘    └──────────┘    └───────┘ │
│       ▲                                   │
│       │ SECCOMP_RET_NOTIFY                │
└───────┼───────────────────────────────────┘
        │
   ┌────┴────┐
   │  Syscall │
   └─────────┘
```

### 关键代码结构

```go
// Seccomp 通知处理
type SeccompHandler struct {
    fd int
    ctx context.Context
}

func (h *SeccompHandler) HandleNotification(req *SeccompNotifyRequest) (*SeccompNotifyResponse, error) {
    // 1. 解析 syscall 参数
    // 2. 查找缓存策略
    // 3. 如无缓存，调用獬豸获取决策
    // 4. 返回响应（ALLOW/BLOCK）
}
```

### 支持的 Syscall

| Syscall | 描述 | 风险级别 |
|---------|------|----------|
| execve | 执行命令 | 高 |
| fork/vfork | 进程创建 | 中 |
| clone | 线程创建 | 中 |
| mount | 挂载文件系统 | 高 |
| openat | 打开文件 | 低 |
| read/write | 文件读写 | 低 |

## S006: 策略缓存

### 任务

- [ ] 内存缓存实现
- [ ] 缓存过期机制
- [ ] 缓存更新通知

### 缓存设计

```go
type PolicyCache struct {
    mu    sync.RWMutex
    items map[string]CacheEntry
}

type CacheEntry struct {
    Policy   *Policy
    ExpireAt time.Time
}
```

### 缓存策略

| 场景 | 缓存时间 |
|------|----------|
| 首次请求 | 无缓存，查询獬豸 |
| 缓存命中 | 直接返回 |
| 缓存过期 | 后台刷新 |

## S007: 与獬豸通信

### 任务

- [ ] HTTP 客户端实现
- [ ] 策略决策 API 调用
- [ ] 审批回调处理
- [ ] 超时与重试

### API 接口

```
POST /api/v1/policy/decide
Content-Type: application/json
X-Agent-Token: <token>

{
  "syscall": "execve",
  "args": ["/bin/sh", "-c", "ls"],
  "agent_id": "agent-001",
  "timestamp": 1708329600
}
```

### 响应格式

```json
{
  "decision": "ALLOW",
  "reason": "allowed by policy rule-001",
  "cache_ttl": 300
}
```

## 验收标准

- [ ] Seccomp 过滤器正确拦截指定 syscall
- [ ] 策略缓存在内存中正常工作
- [ ] 与獬豸 HTTP 通信正常
- [ ] 审批回调机制可用

## 相关文档

- [架构调整方案](../../docs/architecture/紫微架构调整方案.md)
