# E002: 谛听 Seccomp

## 概述

| 属性 | 值 |
|------|-----|
| Epic ID | E002 |
| 名称 | 谛听 Seccomp |
| 描述 | Seccomp 拦截实现，策略执行点 |
| 状态 | ✅ 已完成 |
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

---

## 验收标准 (Acceptance Criteria)

- [x] Seccomp 过滤器正确拦截指定 syscall
- [x] 策略缓存在内存中正常工作
- [x] 与獬豸 HTTP 通信正常
- [x] 审批回调机制可用

## Definition of Done

- [ ] Seccomp BPF 过滤器能够拦截 execve/fork/mount 等危险 syscall
- [ ] SECCOMP_RET_NOTIFY 机制正常工作
- [ ] Syscall 参数能够正确解析
- [ ] 策略缓存支持过期和更新
- [ ] 与獬豸 HTTP 通信支持超时和重试
- [ ] 审批回调机制可用
- [ ] 单元测试和集成测试通过

---

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

---

### T005.1: Seccomp 通知处理

```yaml
---
title: T005.1 Seccomp 通知处理
status: pending
agent: default
---
```

**目标**: 实现 Linux Seccomp 通知机制

**上下文**:
- 工作目录: `/home/dministrator/workspace/ziwei/diting/`
- 依赖: Go 1.21+, Linux kernel 5.0+
- 依赖库: golang.org/x/sys/unix

**步骤**:
1. 实现 Seccomp BPF 过滤器
2. 配置 SECCOMP_RET_NOTIFY 模式
3. 读取 `/proc/self/status` 验证 Seccomp 状态
4. 实现通知fd监听循环

**验收**:
- [ ] Seccomp 过滤器正确加载
- [ ] 通知 fd 能够读取 syscall 请求
- [ ] 返回 ALLOW/BLOCK 响应

**测试命令**:
```bash
grep Seccomp /proc/self/status
```

---

### T005.2: Syscall 参数解析

```yaml
---
title: T005.2 Syscall 参数解析
status: pending
agent: default
---
```

**目标**: 解析 Seccomp 通知中的 syscall 参数

**上下文**:
- 工作目录: `/home/dministrator/workspace/ziwei/diting/`
- 依赖: T005.1 完成

**步骤**:
1. 解析 `seccomp_data` 结构
2. 提取 syscall 编号和参数
3. 解析字符串参数（路径、命令等）
4. 构建结构化的 syscall 信息

**验收**:
- [ ] 能够获取 syscall 编号
- [ ] 能够解析文件路径、命令参数
- [ ] 支持常见 syscall 解析

---

### T005.3: 策略匹配引擎

```yaml
---
title: T005.3 策略匹配引擎
status: pending
agent: default
---
```

**目标**: 实现基于策略的 syscall 决策

**上下文**:
- 工作目录: `/home/dministrator/workspace/ziwei/diting/`
- 依赖: T005.2 完成

**步骤**:
1. 定义策略规则结构
2. 实现规则匹配逻辑
3. 支持白名单/黑名单模式
4. 返回决策结果

**验收**:
- [ ] 规则能够正确匹配
- [ ] 白名单模式工作
- [ ] 黑名单模式工作

---

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

---

### T006.1: 内存缓存实现

```yaml
---
title: T006.1 内存缓存实现
status: pending
agent: default
---
```

**目标**: 实现策略内存缓存

**上下文**:
- 工作目录: `/home/dministrator/workspace/ziwei/diting/`
- 依赖: S005 完成

**步骤**:
1. 创建 `cache.go` 文件
2. 实现 `PolicyCache` 结构体
3. 实现 `Get`/`Set` 方法
4. 添加读写锁

**验收**:
- [ ] 缓存能存储策略
- [ ] 并发安全

---

### T006.2: 缓存更新机制

```yaml
---
title: T006.2 缓存更新机制
status: pending
agent: default
---
```

**目标**: 实现缓存动态更新

**上下文**:
- 工作目录: `/home/dministrator/workspace/ziwei/diting/`
- 依赖: T006.1 完成

**步骤**:
1. 实现 TTL 过期机制
2. 添加主动刷新接口
3. 支持批量更新

**验收**:
- [ ] TTL 过期有效
- [ ] 主动刷新工作

---

### T006.3: 缓存淘汰策略

```yaml
---
title: T006.3 缓存淘汰策略
status: pending
agent: default
---
```

**目标**: 实现缓存容量管理

**上下文**:
- 工作目录: `/home/dministrator/workspace/ziwei/diting/`
- 依赖: T006.2 完成

**步骤**:
1. 实现 LRU 淘汰策略
2. 添加容量限制
3. 记录缓存命中率

**验收**:
- [ ] LRU 淘汰有效
- [ ] 容量限制生效

---

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

---

### T007.1: HTTP 客户端封装

```yaml
---
title: T007.1 HTTP 客户端封装
status: pending
agent: default
---
```

**目标**: 实现与獬豸通信的 HTTP 客户端

**上下文**:
- 工作目录: `/home/dministrator/workspace/ziwei/diting/`
- 依赖: S005, S006 完成
- 依赖库: Go 标准库 net/http

**步骤**:
1. 创建 `xiezhi_client.go`
2. 实现 HTTP 客户端配置
3. 添加连接池支持
4. 实现超时控制

**验收**:
- [ ] HTTP 客户端可用
- [ ] 超时配置有效

---

### T007.2: 策略请求接口

```yaml
---
title: T007.2 策略请求接口
status: pending
agent: default
---
```

**目标**: 实现策略决策 API 调用

**上下文**:
- 工作目录: `/home/dministrator/workspace/ziwei/diting/`
- 依赖: T007.1 完成

**步骤**:
1. 定义请求/响应结构
2. 实现 `/api/v1/policy/decide` 调用
3. 处理响应解析
4. 集成缓存层

**验收**:
- [ ] API 调用成功
- [ ] 响应正确解析
- [ ] 缓存集成工作

---

### T007.3: 审批回调处理

```yaml
---
title: T007.3 审批回调处理
status: pending
agent: default
---
```

**目标**: 实现审批回调机制

**上下文**:
- 工作目录: `/home/dministrator/workspace/ziwei/diting/`
- 依赖: T007.2 完成

**步骤**:
1. 实现回调接口
2. 处理审批结果
3. 异步通知机制
4. 超时处理

**验收**:
- [ ] 回调接收成功
- [ ] 异步处理工作

---

## 相关文档

- [架构调整方案](../../docs/architecture/紫微架构调整方案.md)
