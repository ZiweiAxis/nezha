# 紫微智能体治理基础设施 - 完整生态总结

## 📋 项目概览

**紫微 (Ziwei)** 是一套完整的企业级 AI 智能体治理基础设施，由三个核心组件组成：

| 组件 | 中文名 | 功能 | 语言 | 状态 |
|------|--------|------|------|------|
| **Tianshu** | 天枢 | 任务分发 & 身份中心 | Python | 规划中 |
| **Taibai** | 太白 | 适配器框架 & SDK | Python | MVP |
| **Diting** | 谛听 | 治理网关 & 审计 | Go | MVP |

---

## 🏗️ 架构设计

### 整体流程

```
┌─────────────────────────────────────────────────────────────┐
│                    Agent (任意框架)                          │
│         Claude Code CLI / Dify / OpenClaw / 自定义          │
└────────────────────────┬────────────────────────────────────┘
                         │ HTTP/gRPC
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              Taibai 适配器框架 (太白)                        │
│  - 发现 Tianshu                                              │
│  - 注册 Agent                                                │
│  - 心跳保活                                                  │
│  - 上报审计到 Diting                                         │
└────────────────────────┬────────────────────────────────────┘
                         │ Taibai Protocol
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              Tianshu 任务分发中心 (天枢)                     │
│  - 任务队列管理                                              │
│  - Agent 身份管理                                            │
│  - 权限策略存储                                              │
└────────────────────────┬────────────────────────────────────┘
                         │ HTTP
                         ▼
┌─────────────────────────────────────────────────────────────┐
│           Diting 治理网关 (谛听) - 5 层架构                  │
├─────────────────────────────────────────────────────────────┤
│ L0: 身份验证 (X-Agent-Token / Authorization)                │
│ L1: 风险评估 (规则引擎 + LLM 分析)                          │
│ L2: 策略决策 (RBAC/ABAC + 风控规则)                         │
│ L3: 人机协同 (CHEQ 确认引擎 + 飞书审批)                     │
│ L4: 审计追溯 (JSONL 日志 + 链上存证)                        │
└────────────────────────┬────────────────────────────────────┘
                         │ HTTP
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                  真实后端 API                                │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔧 核心组件详解

### 1. Tianshu (天枢) - 任务分发中心

**位置**: `/home/dministrator/workspace/ziwei/tianshu/`

**功能**:
- 任务队列管理
- Agent 身份管理与认证
- 权限策略存储
- 审计字段注入

**关键文件**:
- `src/core/audit.py` - 审计字段注入 (message_id, sender, receiver, timestamp)

**状态**: 规划中 (Planning)

---

### 2. Taibai (太白) - 适配器框架

**位置**: `/home/dministrator/workspace/ziwei/taibai/`

**功能**:
- 适配器基类 (CLIAdapterBase, PluginAdapterBase, SDKAdapterBase)
- Ziwei SDK (Agent 类)
- 适配器注册表
- 协议定义

**核心类**:

```python
# Agent SDK - 与 Tianshu 和 Diting 通信
class Agent:
    def discover()           # 发现 Tianshu
    def register()           # 注册 Agent
    def heartbeat()          # 心跳保活
    def trace()              # 上报审计到 Diting
```

**适配器基类**:

```python
class CLIAdapterBase:       # 命令行工具适配器
class PluginAdapterBase:    # 平台集成适配器
class SDKAdapterBase:       # 库集成适配器
class AgentAdapter:         # 自定义协议适配器
```

**已实现适配器**:
- `adapters/claude_code_cli/` - Claude Code CLI 适配器

**协议常量** (`sdk/python/ziwei_taibai/protocol.py`):
```python
EVENT_REGISTER_REQUEST = "m.agent.register_request"
EVENT_IDENTITY = "m.agent.identity"
EVENT_ACTION = "m.agent.action"
EVENT_AUDIT = "m.agent.audit"
EVENT_HEARTBEAT = "m.agent.heartbeat"
EVENT_REVOKE = "m.agent.revoke"

ACTION_FILE_WRITE = "file_write"
ACTION_FILE_READ = "file_read"
ACTION_API_CALL = "api_call"
ACTION_VERIFICATION_PING = "verification_ping"
```

**状态**: MVP (可用)

---

### 3. Diting (谛听) - 治理网关

**位置**: `/home/dministrator/workspace/ziwei/diting/`

**架构**: 5 层设计

#### L0 - 身份验证层
```go
// 从 X-Agent-Token 或 Authorization 提取身份
// 与 allowed_api_keys 列表比对
// 失败返回 401 Unauthorized
```

#### L1 - 风险评估层
```go
// 规则引擎 (policy/engine.go)
// - 基于 HTTP 方法 (GET/DELETE/...)
// - 基于 URL 路径 (/admin, /delete, ...)
// - 基于请求体内容 (危险关键词)
// - 返回风险分数 (0-100)

// LLM 分析 (可选)
// - 集成 Ollama / OpenAI
// - 分析操作意图
// - 自动降级到规则引擎
```

#### L2 - 策略决策层
```go
// PolicyEngine.Evaluate() 返回决策
type Decision struct {
    Kind DecisionKind  // Allow / Deny / Review
    PolicyRuleID string
    DecisionReason string
}
```

#### L3 - 人机协同层
```go
// CHEQ 确认引擎 (cheq/engine.go)
// - 创建待确认对象
// - 支持多审批人 (I-008)
// - 支持审批策略 (any/all) (I-009)
// - 超时自动过期

// 投递方式 (delivery/feishu/)
// - 飞书卡片 (交互式)
// - 飞书长连接 (WebSocket)
// - 企业微信 (规划中)
// - 钉钉 (规划中)
```

#### L4 - 审计追溯层
```go
// Evidence 模型 (models/audit.go)
type Evidence struct {
    TraceID string
    AgentID string
    PolicyRuleID string
    Decision string        // allow/deny/review/approved/rejected/expired
    CHEQStatus string
    Confirmer string
    Timestamp time.Time
    Resource string
    Action string
}

// 存储方式
// - JSONL 文件 (实时)
// - PostgreSQL (结构化)
// - ClickHouse (时序分析)
// - S3/OSS (归档)
```

**关键文件**:

| 文件 | 功能 |
|------|------|
| `cmd/diting/main.go` | 入口点 |
| `cmd/diting/internal/proxy/handler.go` | HTTP 代理处理 |
| `cmd/diting/internal/proxy/pipeline.go` | L0-L4 流水线 |
| `cmd/diting/internal/policy/engine.go` | 策略引擎接口 |
| `cmd/diting/internal/cheq/engine.go` | CHEQ 确认引擎 |
| `cmd/diting/internal/audit/store.go` | 审计存储接口 |
| `cmd/diting/internal/models/decision.go` | 决策模型 |
| `cmd/diting/internal/models/audit.go` | 审计模型 |
| `cmd/diting/config.yaml` | 配置模板 |

**配置示例**:

```yaml
proxy:
  listen_addr: ":8080"
  upstream: "http://localhost:8081"
  allowed_api_keys: ["key1", "key2"]

policy:
  rules_path: "policy_rules.yaml"

cheq:
  timeout_seconds: 120
  approval_rules:
    - path_prefix: "/admin"
      risk_level: "high"
      timeout_seconds: 300
      approval_user_ids: ["user1", "user2"]
      approval_policy: "all"

delivery:
  feishu:
    app_id: "xxx"
    enabled: true
    approval_user_ids: ["user1"]
    approval_policy: "any"
    use_card_delivery: true
    use_long_connection: true

audit:
  path: "./data/audit.jsonl"
  redact: ["password", "token"]
```

**策略规则示例** (`policy_rules.example.yaml`):

```yaml
rules:
  - id: allow_exec_run
    action: "exec:run"
    resource: "*"
    decision: allow
    reason: 本地执行放行

  - id: review_exec_sudo
    action: "exec:sudo"
    resource: "*"
    decision: review
    reason: sudo 需人工确认

  - id: deny_delete
    action: DELETE
    resource: "*"
    decision: deny
    reason: 禁止删除操作
```

**状态**: MVP (可用)

---

## 🔄 工作流程

### 请求处理流程

```
1. Agent 发送请求到 Diting
   ├─ 包含 X-Agent-Token 或 Authorization
   └─ 目标 URL: http://diting:8080/path

2. Diting 生成 trace_id (UUID)
   └─ 用于全链路追踪

3. L0 身份验证
   ├─ 提取 X-Agent-Token
   ├─ 与 allowed_api_keys 比对
   └─ 失败 → 401 + 审计

4. L1 风险评估
   ├─ 规则引擎评分
   ├─ LLM 分析 (可选)
   └─ 综合风险分数

5. L2 策略决策
   ├─ PolicyEngine.Evaluate()
   └─ 返回 Allow / Deny / Review

6. 根据决策执行
   ├─ Allow → 转发请求 + 审计
   ├─ Deny → 拒绝 + 审计
   └─ Review → 创建 CHEQ + 等待审批

7. 如果需要人工审批 (Review)
   ├─ 创建 ConfirmationObject
   ├─ 投递到飞书 (卡片/长连接)
   ├─ 等待审批人确认
   ├─ 超时自动过期
   └─ 根据结果转发或拒绝

8. 记录审计日志
   └─ Evidence → JSONL / PostgreSQL / ClickHouse
```

### 审批流程 (CHEQ)

```
1. 创建 ConfirmationObject
   ├─ ID: UUID
   ├─ Status: pending
   ├─ ExpiresAt: now + timeout
   └─ ConfirmerIDs: [user1, user2]

2. 投递到飞书
   ├─ 方式 1: 卡片 (交互式)
   │  └─ 批准/拒绝按钮
   ├─ 方式 2: 长连接 (WebSocket)
   │  └─ 实时事件推送
   └─ 方式 3: 文本 + 链接
      └─ 手动点击链接

3. 审批人操作
   ├─ 批准 → Status: approved
   ├─ 拒绝 → Status: rejected
   └─ 超时 → Status: expired

4. 网关轮询检查
   ├─ 每 2 秒检查一次
   ├─ 检查 Status 是否终态
   └─ 超时前 60 秒发飞书提醒

5. 执行决策
   ├─ approved → 转发请求
   ├─ rejected → 拒绝请求
   └─ expired → 拒绝请求

6. 记录审计
   └─ CHEQStatus: approved/rejected/expired
      Confirmer: 审批人 ID
```

---

## 📊 数据模型

### RequestContext (请求上下文)

```go
type RequestContext struct {
    AgentIdentity string              // L0 身份
    Method string                     // HTTP 方法
    TargetURL string                  // 目标 URL
    Resource string                   // 资源路径
    Action string                     // 操作类型
    Headers http.Header               // HTTP 头
    Context map[string]string         // 扩展字段 (risk_level 等)
}
```

### Decision (决策结果)

```go
type Decision struct {
    Kind DecisionKind                 // Allow / Deny / Review
    PolicyRuleID string               // 命中的规则 ID
    DecisionReason string             // 决策理由
}
```

### Evidence (审计记录)

```go
type Evidence struct {
    TraceID string                    // 全链路追踪 ID
    SpanID string                     // 跨度 ID (可选)
    AgentID string                    // Agent ID
    PolicyRuleID string               // 策略规则 ID
    DecisionReason string             // 决策理由
    Decision string                   // allow/deny/review/approved/rejected/expired
    CHEQStatus string                 // CHEQ 状态 (可选)
    Confirmer string                  // 审批人 (可选)
    Timestamp time.Time               // 时间戳
    Resource string                   // 资源
    Action string                     // 操作
}
```

### ConfirmationObject (确认对象)

```go
type ConfirmationObject struct {
    ID string                         // 唯一 ID
    TraceID string                    // 关联的 trace_id
    Resource string                   // 资源
    Action string                     // 操作
    Summary string                    // 摘要
    Status ConfirmationStatus         // pending/approved/rejected/expired
    ExpiresAt time.Time               // 过期时间
    ConfirmerIDs []string             // 审批人列表
    ApprovalPolicy string             // any / all
    CreatedAt time.Time               // 创建时间
    UpdatedAt time.Time               // 更新时间
}
```

---

## 🚀 快速开始

### 1. 启动 Diting 网关

```bash
cd /home/dministrator/workspace/ziwei/diting/cmd/diting

# 编译
go build -o bin/diting ./cmd/diting_allinone

# 运行
./bin/diting
```

### 2. 配置 Agent

```python
from ziwei_taibai.adapters.cli_base import CLIAdapterBase
from ziwei_taibai.agent import Agent

class MyAdapter(CLIAdapterBase):
    def __init__(self, config):
        super().__init__(config, "my-cli", [])
        self.sdk = Agent(
            owner=config.owner_id,
            tianshu_api_base="http://localhost:8082",
            diting_audit_url="http://localhost:8080/api/audit",
        )

    async def initialize(self):
        self.sdk.discover()
        self.sdk.register(agent_display_id="my-agent")
        return True

    async def execute_task(self, task):
        # 执行任务
        return TaskResult(task_id=task.id, status="success")
```

### 3. 发送请求

```bash
# 带身份令牌的请求
curl -H "X-Agent-Token: key1" http://localhost:8080/api/users

# 或使用 Authorization
curl -H "Authorization: Bearer key1" http://localhost:8080/api/users
```

---

## 📈 架构演进路线

### Phase 1: MVP (当前)
- ✅ L0 身份验证
- ✅ L1 风险评估 (规则引擎)
- ✅ L2 策略决策 (基础)
- ✅ L3 人机协同 (CHEQ + 飞书)
- ✅ L4 审计追溯 (JSONL)

### Phase 2: 企业级 (3 个月)
- 🔄 完整策略引擎 (RBAC/ABAC)
- 🔄 Web 管理后台
- 🔄 企业微信/钉钉集成
- 🔄 LDAP/AD 认证
- 🔄 多租户支持

### Phase 3: 平台化 (6 个月)
- 🔄 PostgreSQL 存储
- 🔄 ClickHouse 分析
- 🔄 可视化大屏
- 🔄 自动化运营
- 🔄 告警通知系统

### Phase 4: 生态化 (12 个月)
- 🔄 开放 API
- 🔄 插件市场
- 🔄 社区生态
- 🔄 eBPF 内核监控
- 🔄 链上存证

---

## 🔐 安全特性

### 1. 零信任架构
- 所有请求都需要身份验证 (L0)
- 所有操作都需要风险评估 (L1)
- 所有决策都可追溯 (L4)

### 2. 人机协同
- AI 提供建议 (风险评分)
- 人类做最终决策 (CHEQ 审批)
- 平衡效率与安全

### 3. 完整审计
- 全链路追踪 (trace_id)
- 决策理由记录 (decision_reason)
- 审批人信息 (confirmer)
- 时间戳 (毫秒级)

### 4. 智能降级
- LLM 不可用 → 规则引擎
- 飞书不可用 → CLI 审批
- 保证系统始终可用

---

## 📚 文档索引

| 文档 | 位置 | 用途 |
|------|------|------|
| 项目总结 | `diting/docs/PROJECT_SUMMARY.md` | 项目概述 |
| 完整架构 | `diting/docs/ARCHITECTURE_FULL.md` | 5 层架构详解 |
| 项目结构 | `diting/docs/STRUCTURE.md` | 目录组织 |
| 快速开始 | `diting/docs/QUICKSTART.md` | 5 分钟入门 |
| 部署指南 | `diting/docs/INSTALL.md` | 详细部署 |
| 测试场景 | `diting/docs/TEST.md` | 测试用例 |
| 演示脚本 | `diting/docs/DEMO.md` | 演示话术 |
| 适配器开发 | `taibai/docs/adapter-development-guide.md` | 适配器开发 |

---

## 🎯 关键概念

### Trace ID
- 全链路追踪标识符
- 格式: UUID
- 用途: 关联所有相关的审计记录

### Policy Rule ID
- 策略规则标识符
- 用途: 追溯决策依据

### Decision Reason
- 决策理由
- 用途: 解释为什么做出这个决策

### CHEQ Status
- 确认对象状态
- 值: pending / approved / rejected / expired

### Approval Policy
- 审批策略
- any: 任一审批人批准即可
- all: 所有审批人都必须批准

---

## 🔗 集成点

### 与 Tianshu 的集成
- 发现 (Discovery)
- 注册 (Registration)
- 心跳 (Heartbeat)

### 与 Taibai 的集成
- 适配器基类
- SDK (Agent 类)
- 协议定义

### 与飞书的集成
- 卡片投递
- 长连接 (WebSocket)
- 事件回调

### 与后端 API 的集成
- HTTP 反向代理
- 请求转发
- 响应透传

---

## 💡 最佳实践

### 1. 配置管理
- 敏感项从环境变量覆盖
- 不要在 YAML 中写密钥
- 使用 `.env` 文件管理

### 2. 审计日志
- 记录所有决策
- 包含完整上下文
- 支持事后溯源

### 3. 错误处理
- 优雅降级
- 清晰的错误信息
- 完整的错误日志

### 4. 性能优化
- 缓存策略规则
- 异步投递飞书
- 批量写审计日志

### 5. 安全加固
- 验证所有输入
- 脱敏敏感字段
- 限制请求速率

---

## 📞 技术支持

### 常见问题

**Q: 如何添加新的审批人?**
A: 在 `config.yaml` 的 `approval_rules` 中配置 `approval_user_ids`

**Q: 如何修改审批超时?**
A: 在 `config.yaml` 的 `cheq.timeout_seconds` 中修改

**Q: 如何集成企业微信?**
A: 在 `delivery` 中添加企业微信配置 (Phase 2 功能)

**Q: 如何查询审计日志?**
A: 使用 `audit.QueryByTraceID(ctx, traceID)` 按 trace_id 查询

---

## 🎉 总结

紫微 (Ziwei) 是一套完整的、生产就绪的 AI 智能体治理基础设施：

- **Tianshu**: 任务分发中心 (规划中)
- **Taibai**: 适配器框架 (MVP)
- **Diting**: 治理网关 (MVP)

核心特性：
- ✅ 零信任架构
- ✅ 人机协同
- ✅ 完整审计
- ✅ 智能降级
- ✅ 易于扩展

适用场景：
- AI 智能体安全治理
- 企业级审计合规
- 风险决策支持
- 操作审批流程
