# 紫微智能体治理基础设施 - 完整索引

## 📚 文档导航

### 核心文档
1. **ECOSYSTEM_OVERVIEW.md** - 完整生态总结
   - 项目概览
   - 架构设计
   - 核心组件详解
   - 工作流程
   - 数据模型
   - 快速开始
   - 架构演进路线
   - 安全特性

2. **QUICK_REFERENCE.md** - 快速参考指南
   - 核心组件速查表
   - 数据流向
   - 关键概念
   - 快速启动
   - 配置速查
   - API 速查
   - 常见任务
   - 故障排查
   - 最佳实践

3. **INDEX.md** - 本文件
   - 文档导航
   - 组件文件映射
   - 关键代码位置
   - 学习路径

---

## 🗂️ 组件文件映射

### Tianshu (天枢) - 消息枢纽

**位置**: `/home/dministrator/workspace/ziwei/tianshu/`

**关键文件**:
```
tianshu/
├── src/
│   ├── main.py                   # 应用入口
│   ├── bridge/feishu.py          # 飞书适配层
│   ├── matrix/client.py          # Matrix 客户端
│   ├── diting_client/            # 谛听审计上报
│   └── identity/                 # 身份管理
├── docs/
└── ...
```

**功能**:
- 飞书 ↔ Matrix 双向消息桥接
- 用户身份映射与房间管理
- Agent 注册与身份管理（DID）
- 与谛听集成进行消息审计

**状态**: 规划中

---

### Taibai (太白) - 适配器框架

**位置**: `/home/dministrator/workspace/ziwei/taibai/`

**关键文件**:
```
taibai/
├── sdk/
│   └── python/
│       └── ziwei_taibai/
│           ├── agent.py           # Agent SDK 核心类
│           ├── protocol.py         # 协议常量定义
│           ├── adapters/
│           │   ├── base.py         # 适配器基类
│           │   ├── cli_base.py     # CLI 适配器基类
│           │   ├── plugin_base.py  # 插件适配器基类
│           │   └── sdk_base.py     # SDK 适配器基类
│           └── registry.py         # 适配器注册表
├── adapters/
│   └── claude_code_cli/
│       ├── adapter.py              # Claude Code CLI 适配器实现
│       ├── config.yaml.example     # 配置示例
│       └── README.md               # 适配器文档
├── docs/
│   └── adapter-development-guide.md # 适配器开发指南
└── README.md                        # 项目说明
```

**核心类**:
- `Agent` - 与 Tianshu/Diting 通信的 SDK
- `CLIAdapterBase` - 命令行工具适配器基类
- `PluginAdapterBase` - 平台集成适配器基类
- `SDKAdapterBase` - 库集成适配器基类
- `AgentAdapter` - 自定义协议适配器基类

**协议常量**:
- `EVENT_REGISTER_REQUEST` - 注册请求
- `EVENT_IDENTITY` - 身份事件
- `EVENT_ACTION` - 操作事件
- `EVENT_AUDIT` - 审计事件
- `EVENT_HEARTBEAT` - 心跳事件
- `EVENT_REVOKE` - 撤销事件

**状态**: MVP

---

### Diting (谛听) - 治理网关

**位置**: `/home/dministrator/workspace/ziwei/diting/`

**关键文件**:
```
diting/
├── cmd/
│   └── diting/
│       ├── main.go                 # 入口点
│       ├── go.mod                  # Go 模块定义
│       ├── go.sum                  # 依赖校验
│       ├── config.yaml             # 配置模板
│       ├── policy_rules.example.yaml # 策略规则示例
│       └── internal/
│           ├── proxy/
│           │   ├── handler.go       # HTTP 代理处理 (L0)
│           │   ├── pipeline.go      # L0-L4 流水线
│           │   └── server.go        # 服务器
│           ├── policy/
│           │   └── engine.go        # 策略引擎接口 (L2)
│           ├── cheq/
│           │   ├── engine.go        # CHEQ 确认引擎 (L3)
│           │   └── types.go         # CHEQ 类型定义
│           ├── audit/
│           │   └── store.go         # 审计存储接口 (L4)
│           ├── delivery/
│           │   └── feishu/          # 飞书投递实现 (L3)
│           ├── models/
│           │   ├── decision.go      # 决策模型 (L2)
│           │   ├── audit.go         # 审计模型 (L4)
│           │   └── confirmation.go  # 确认对象模型 (L3)
│           └── config/
│               └── config.go        # 配置加载
├── docs/
│   ├── PROJECT_SUMMARY.md           # 项目总结
│   ├── ARCHITECTURE_FULL.md          # 完整架构
│   ├── STRUCTURE.md                  # 项目结构
│   ├── QUICKSTART.md                 # 快速开始
│   ├── INSTALL.md                    # 安装指南
│   ├── TEST.md                       # 测试指南
│   └── DEMO.md                       # 演示脚本
├── README.md                         # 项目说明
├── README_CN.md                      # 中文说明
└── LICENSE                           # MIT 许可证
```

**5 层架构**:

| 层 | 名称 | 文件 | 功能 |
|----|------|------|------|
| L0 | 身份验证 | `proxy/handler.go` | X-Agent-Token / Authorization 验证 |
| L1 | 风险评估 | `policy/engine.go` | 规则引擎 + LLM 分析 |
| L2 | 策略决策 | `models/decision.go` | Allow/Deny/Review 决策 |
| L3 | 人机协同 | `cheq/engine.go` | CHEQ 确认 + 飞书投递 |
| L4 | 审计追溯 | `audit/store.go` | JSONL/PostgreSQL/ClickHouse 存储 |

**状态**: MVP

---

## 🔍 关键代码位置

### 请求处理流程

```
1. HTTP 请求到达
   ↓
   proxy/handler.go:proxyHandler()
   ├─ 生成 trace_id
   ├─ 构建 RequestContext
   └─ 调用 pipeline.ServeHTTP()

2. L0 身份验证
   ↓
   proxy/pipeline.go:ServeHTTP() (第 57-72 行)
   ├─ normalizeL0Token()
   ├─ containsString()
   └─ 返回 401 或继续

3. L1 风险评估
   ↓
   policy/engine.go:Evaluate()
   └─ 返回风险分数

4. L2 策略决策
   ↓
   proxy/pipeline.go:ServeHTTP() (第 74-80 行)
   ├─ policy.Evaluate()
   └─ 返回 Decision

5. 根据决策执行
   ↓
   proxy/pipeline.go:ServeHTTP() (第 82-182 行)
   ├─ Allow: 转发请求 (第 83-86 行)
   ├─ Deny: 拒绝请求 (第 87-91 行)
   └─ Review: 创建 CHEQ (第 92-178 行)

6. L3 人机协同 (如果 Review)
   ↓
   cheq/engine.go:Create()
   ├─ 创建 ConfirmationObject
   └─ delivery/feishu/:Deliver()
      └─ 投递到飞书

7. L4 审计追溯
   ↓
   proxy/pipeline.go:appendEvidence()
   └─ audit/store.go:Append()
      └─ 写入 JSONL/PostgreSQL/ClickHouse
```

### 审批流程

```
1. CHEQ 创建
   ↓
   cheq/engine.go:Create()
   └─ 返回 ConfirmationObject

2. 飞书投递
   ↓
   delivery/feishu/:Deliver()
   ├─ 卡片投递 (use_card_delivery)
   └─ 长连接 (use_long_connection)

3. 轮询检查
   ↓
   proxy/pipeline.go:ServeHTTP() (第 144-163 行)
   ├─ cheq.GetByID()
   ├─ 检查 IsTerminal()
   └─ 发送提醒

4. 执行决策
   ↓
   proxy/pipeline.go:ServeHTTP() (第 168-178 行)
   ├─ approved: 转发请求
   ├─ rejected: 拒绝请求
   └─ expired: 拒绝请求

5. 记录审计
   ↓
   proxy/pipeline.go:appendEvidenceWithCHEQ()
   └─ audit/store.go:Append()
```

---

## 📖 学习路径

### 初级 (了解基础)
1. 阅读 `ECOSYSTEM_OVERVIEW.md` - 了解整体架构
2. 阅读 `QUICK_REFERENCE.md` - 掌握快速参考
3. 查看 `diting/docs/QUICKSTART.md` - 5 分钟快速开始

### 中级 (深入理解)
1. 阅读 `diting/docs/ARCHITECTURE_FULL.md` - 理解 5 层架构
2. 阅读 `diting/docs/PROJECT_SUMMARY.md` - 项目详细说明
3. 查看 `cmd/diting/internal/proxy/pipeline.go` - 理解请求流程
4. 查看 `cmd/diting/internal/cheq/engine.go` - 理解审批流程

### 高级 (开发扩展)
1. 阅读 `taibai/docs/adapter-development-guide.md` - 适配器开发
2. 查看 `taibai/adapters/claude_code_cli/adapter.py` - 参考实现
3. 查看 `cmd/diting/config.yaml` - 配置详解
4. 查看 `cmd/diting/policy_rules.example.yaml` - 策略规则详解

### 专家 (贡献代码)
1. 查看 `diting/docs/STRUCTURE.md` - 项目结构
2. 查看 `diting/README.md` - 贡献指南
3. 查看 `cmd/diting/internal/models/` - 数据模型
4. 查看 `cmd/diting/internal/audit/store.go` - 审计接口

---

## 🎯 常见查询

### 我想...

#### 启动 Diting
→ 查看 `QUICK_REFERENCE.md` 的"快速启动"部分

#### 配置 Agent
→ 查看 `QUICK_REFERENCE.md` 的"创建适配器"部分

#### 添加审批人
→ 查看 `QUICK_REFERENCE.md` 的"常见任务 1"

#### 修改审批超时
→ 查看 `QUICK_REFERENCE.md` 的"常见任务 2"

#### 添加策略规则
→ 查看 `QUICK_REFERENCE.md` 的"常见任务 3"

#### 启用飞书长连接
→ 查看 `QUICK_REFERENCE.md` 的"常见任务 4"

#### 脱敏敏感字段
→ 查看 `QUICK_REFERENCE.md` 的"常见任务 5"

#### 排查 401 错误
→ 查看 `QUICK_REFERENCE.md` 的"故障排查 - 问题 1"

#### 排查 403 错误
→ 查看 `QUICK_REFERENCE.md` 的"故障排查 - 问题 2"

#### 排查飞书问题
→ 查看 `QUICK_REFERENCE.md` 的"故障排查 - 问题 3"

#### 排查审计日志问题
→ 查看 `QUICK_REFERENCE.md` 的"故障排查 - 问题 4"

#### 开发新适配器
→ 查看 `taibai/docs/adapter-development-guide.md`

#### 理解请求流程
→ 查看 `cmd/diting/internal/proxy/pipeline.go` 和本文件的"关键代码位置"

#### 理解审批流程
→ 查看 `cmd/diting/internal/cheq/engine.go` 和本文件的"关键代码位置"

#### 查询审计日志
→ 查看 `QUICK_REFERENCE.md` 的"获取帮助 - 查看日志"

---

## 📊 数据模型速查

### RequestContext
```go
type RequestContext struct {
    AgentIdentity string              // L0 身份
    Method string                     // HTTP 方法
    TargetURL string                  // 目标 URL
    Resource string                   // 资源路径
    Action string                     // 操作类型
    Headers http.Header               // HTTP 头
    Context map[string]string         // 扩展字段
}
```
**位置**: `cmd/diting/internal/models/request.go`

### Decision
```go
type Decision struct {
    Kind DecisionKind                 // Allow/Deny/Review
    PolicyRuleID string               // 规则 ID
    DecisionReason string             // 决策理由
}
```
**位置**: `cmd/diting/internal/models/decision.go`

### Evidence
```go
type Evidence struct {
    TraceID string                    // 追踪 ID
    AgentID string                    // Agent ID
    PolicyRuleID string               // 规则 ID
    Decision string                   // 决策
    CHEQStatus string                 // CHEQ 状态
    Confirmer string                  // 审批人
    Timestamp time.Time               // 时间戳
    Resource string                   // 资源
    Action string                     // 操作
}
```
**位置**: `cmd/diting/internal/models/audit.go`

### ConfirmationObject
```go
type ConfirmationObject struct {
    ID string                         // 唯一 ID
    TraceID string                    // 追踪 ID
    Resource string                   // 资源
    Action string                     // 操作
    Summary string                    // 摘要
    Status ConfirmationStatus         // 状态
    ExpiresAt time.Time               // 过期时间
    ConfirmerIDs []string             // 审批人列表
    ApprovalPolicy string             // 审批策略
    CreatedAt time.Time               // 创建时间
    UpdatedAt time.Time               // 更新时间
}
```
**位置**: `cmd/diting/internal/models/confirmation.go`

---

## 🔗 接口速查

### policy.Engine
```go
type Engine interface {
    Evaluate(ctx context.Context, req *RequestContext) (*Decision, error)
}
```
**位置**: `cmd/diting/internal/policy/engine.go`

### cheq.Engine
```go
type Engine interface {
    Create(ctx context.Context, in *CreateInput) (*ConfirmationObject, error)
    GetByID(ctx context.Context, id string) (*ConfirmationObject, error)
    Submit(ctx context.Context, id string, approved bool, confirmerID string) error
}
```
**位置**: `cmd/diting/internal/cheq/engine.go`

### audit.Store
```go
type Store interface {
    Append(ctx context.Context, e *Evidence) error
    QueryByTraceID(ctx context.Context, traceID string) ([]*Evidence, error)
}
```
**位置**: `cmd/diting/internal/audit/store.go`

### delivery.Provider
```go
type Provider interface {
    Deliver(ctx context.Context, in *DeliverInput) error
}
```
**位置**: `cmd/diting/internal/delivery/provider.go`

---

## 🚀 快速命令

### 启动 Diting
```bash
cd /home/dministrator/workspace/ziwei/diting/cmd/diting
go build -o bin/diting ./cmd/diting_allinone
./bin/diting
```

### 发送测试请求
```bash
curl -H "X-Agent-Token: key1" http://localhost:8080/api/users
```

### 查看审计日志
```bash
tail -f /home/dministrator/workspace/ziwei/diting/data/audit.jsonl
```

### 查看配置
```bash
cat /home/dministrator/workspace/ziwei/diting/cmd/diting/config.yaml
```

### 查看策略规则
```bash
cat /home/dministrator/workspace/ziwei/diting/cmd/diting/policy_rules.example.yaml
```

---

## 📞 获取帮助

### 文档
- 生态总结: `ECOSYSTEM_OVERVIEW.md`
- 快速参考: `QUICK_REFERENCE.md`
- 完整索引: `INDEX.md` (本文件)
- Diting 项目总结: `diting/docs/PROJECT_SUMMARY.md`
- Diting 完整架构: `diting/docs/ARCHITECTURE_FULL.md`
- Taibai 适配器开发: `taibai/docs/adapter-development-guide.md`

### 代码
- 请求处理: `cmd/diting/internal/proxy/pipeline.go`
- 审批流程: `cmd/diting/internal/cheq/engine.go`
- 数据模型: `cmd/diting/internal/models/`
- 配置加载: `cmd/diting/internal/config/config.go`

### 配置
- Diting 配置: `cmd/diting/config.yaml`
- 策略规则: `cmd/diting/policy_rules.example.yaml`
- Taibai 配置: `taibai/adapters/claude_code_cli/config.yaml.example`

---

## 🎉 总结

紫微生态包含三个核心组件：

1. **Tianshu (天枢)** - 消息枢纽
   - 位置: `tianshu/`
   - 语言: Python
   - 状态: 规划中
   - 功能：飞书 ↔ Matrix 消息桥接、Agent 注册与身份管理

2. **Taibai (太白)** - 适配器框架
   - 位置: `taibai/`
   - 语言: Python
   - 状态: MVP
   - 关键文件: `sdk/python/ziwei_taibai/agent.py`

3. **Diting (谛听)** - 治理网关
   - 位置: `diting/`
   - 语言: Go
   - 状态: MVP
   - 关键文件: `cmd/diting/internal/proxy/pipeline.go`

核心特性：
- ✅ 零信任架构 (L0 身份验证)
- ✅ 人机协同 (L3 CHEQ 确认)
- ✅ 完整审计 (L4 审计追溯)
- ✅ 智能降级 (LLM → 规则引擎)
- ✅ 易于扩展 (适配器框架)

快速开始：
1. 阅读 `ECOSYSTEM_OVERVIEW.md` 了解架构
2. 阅读 `QUICK_REFERENCE.md` 掌握快速参考
3. 按照 `QUICK_REFERENCE.md` 启动 Diting
4. 查看 `INDEX.md` 本文件快速查询

祝你使用愉快！🎉
