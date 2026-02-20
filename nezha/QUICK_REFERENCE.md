# 紫微生态 - 快速参考指南

## 🎯 核心组件速查表

### Tianshu (天枢) - 任务分发中心
```
位置: /home/dministrator/workspace/ziwei/tianshu/
语言: Python
状态: 规划中
功能: 任务队列、身份管理、权限策略、审计字段注入
关键文件: src/core/audit.py
```

### Taibai (太白) - 适配器框架
```
位置: /home/dministrator/workspace/ziwei/taibai/
语言: Python
状态: MVP
功能: 适配器基类、SDK、协议定义、注册表
关键类:
  - Agent: 与 Tianshu/Diting 通信
  - CLIAdapterBase: 命令行工具适配器
  - PluginAdapterBase: 平台集成适配器
  - SDKAdapterBase: 库集成适配器
关键文件:
  - sdk/python/ziwei_taibai/agent.py
  - sdk/python/ziwei_taibai/protocol.py
  - adapters/claude_code_cli/adapter.py
```

### Diting (谛听) - 治理网关
```
位置: /home/dministrator/workspace/ziwei/diting/
语言: Go
状态: MVP
功能: HTTP 代理、风险评估、策略决策、人工审批、审计日志
5 层架构:
  L0: 身份验证 (X-Agent-Token / Authorization)
  L1: 风险评估 (规则引擎 + LLM)
  L2: 策略决策 (Allow/Deny/Review)
  L3: 人机协同 (CHEQ + 飞书)
  L4: 审计追溯 (JSONL/PostgreSQL/ClickHouse)
关键文件:
  - cmd/diting/main.go
  - cmd/diting/internal/proxy/handler.go
  - cmd/diting/internal/proxy/pipeline.go
  - cmd/diting/internal/policy/engine.go
  - cmd/diting/internal/cheq/engine.go
  - cmd/diting/internal/audit/store.go
  - cmd/diting/config.yaml
```

---

## 📊 数据流向

### 请求流程
```
Agent
  ↓ (HTTP + X-Agent-Token)
Diting L0 (身份验证)
  ↓ (token 有效)
Diting L1 (风险评估)
  ↓ (规则引擎 + LLM)
Diting L2 (策略决策)
  ↓ (Allow/Deny/Review)
  ├─ Allow → 转发请求 → L4 审计
  ├─ Deny → 拒绝 → L4 审计
  └─ Review → CHEQ 确认 → 飞书投递 → 等待审批 → L4 审计
```

### 审批流程
```
CHEQ 创建
  ↓
飞书投递 (卡片/长连接)
  ↓
审批人操作 (批准/拒绝)
  ↓
网关轮询检查 (每 2 秒)
  ↓
执行决策 (转发/拒绝)
  ↓
记录审计 (CHEQStatus + Confirmer)
```

---

## 🔑 关键概念

| 概念 | 说明 | 示例 |
|------|------|------|
| **Trace ID** | 全链路追踪 ID | `550e8400-e29b-41d4-a716-446655440000` |
| **Policy Rule ID** | 策略规则 ID | `allow_exec_run`, `review_exec_sudo` |
| **Decision Reason** | 决策理由 | `本地执行放行`, `sudo 需人工确认` |
| **CHEQ Status** | 确认状态 | `pending`, `approved`, `rejected`, `expired` |
| **Approval Policy** | 审批策略 | `any` (任一通过), `all` (全部通过) |
| **Agent Identity** | Agent 身份令牌 | `key1`, `Bearer token123` |

---

## 🚀 快速启动

### 启动 Diting
```bash
cd /home/dministrator/workspace/ziwei/diting/cmd/diting
go build -o bin/diting ./cmd/diting_allinone
./bin/diting
```

### 发送请求
```bash
# 带身份令牌
curl -H "X-Agent-Token: key1" http://localhost:8080/api/users

# 或使用 Authorization
curl -H "Authorization: Bearer key1" http://localhost:8080/api/users
```

### 创建适配器
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
        return TaskResult(task_id=task.id, status="success")
```

---

## 📝 配置速查

### Diting 配置 (config.yaml)

```yaml
# 代理配置
proxy:
  listen_addr: ":8080"
  upstream: "http://localhost:8081"
  allowed_api_keys: ["key1", "key2"]

# 策略配置
policy:
  rules_path: "policy_rules.yaml"

# CHEQ 配置
cheq:
  timeout_seconds: 120
  approval_rules:
    - path_prefix: "/admin"
      risk_level: "high"
      timeout_seconds: 300
      approval_user_ids: ["user1", "user2"]
      approval_policy: "all"

# 飞书配置
delivery:
  feishu:
    app_id: "xxx"
    enabled: true
    approval_user_ids: ["user1"]
    approval_policy: "any"
    use_card_delivery: true
    use_long_connection: true

# 审计配置
audit:
  path: "./data/audit.jsonl"
  redact: ["password", "token"]
```

### 策略规则 (policy_rules.yaml)

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

---

## 🔗 API 速查

### Agent SDK (Taibai)

```python
from ziwei_taibai.agent import Agent

agent = Agent(
    owner="user@company.com",
    tianshu_api_base="http://localhost:8082",
    diting_audit_url="http://localhost:8080/api/audit",
)

# 发现 Tianshu
discovery = agent.discover()

# 注册 Agent
result = agent.register(agent_display_id="my-agent")

# 心跳保活
agent.heartbeat()

# 上报审计
agent.trace("action_type", key1="value1", key2="value2")
```

### Diting 审计查询

```go
// 按 trace_id 查询审计记录
evidence, err := auditStore.QueryByTraceID(ctx, traceID)
if err != nil {
    // 处理错误
}

// 遍历审计记录
for _, e := range evidence {
    fmt.Printf("Decision: %s, Reason: %s\n", e.Decision, e.DecisionReason)
}
```

---

## 📚 文档导航

| 文档 | 位置 | 用途 |
|------|------|------|
| 生态总结 | `ECOSYSTEM_OVERVIEW.md` | 完整架构 |
| 快速参考 | `QUICK_REFERENCE.md` | 本文件 |
| Diting 项目总结 | `diting/docs/PROJECT_SUMMARY.md` | 项目概述 |
| Diting 完整架构 | `diting/docs/ARCHITECTURE_FULL.md` | 5 层架构 |
| Diting 项目结构 | `diting/docs/STRUCTURE.md` | 目录组织 |
| Taibai 适配器开发 | `taibai/docs/adapter-development-guide.md` | 适配器开发 |

---

## 🎯 常见任务

### 任务 1: 添加新的审批人
```yaml
# 在 config.yaml 中修改
cheq:
  approval_rules:
    - path_prefix: "/admin"
      approval_user_ids: ["user1", "user2", "user3"]  # 添加 user3
```

### 任务 2: 修改审批超时
```yaml
# 在 config.yaml 中修改
cheq:
  timeout_seconds: 300  # 改为 5 分钟
```

### 任务 3: 添加新的策略规则
```yaml
# 在 policy_rules.yaml 中添加
rules:
  - id: review_api_call
    action: "api_call"
    resource: "/api/sensitive"
    decision: review
    reason: 敏感 API 需人工确认
```

### 任务 4: 启用飞书长连接
```yaml
# 在 config.yaml 中修改
delivery:
  feishu:
    use_long_connection: true  # 启用 WebSocket
```

### 任务 5: 脱敏敏感字段
```yaml
# 在 config.yaml 中修改
audit:
  redact: ["password", "token", "api_key", "secret"]
```

---

## 🔍 故障排查

### 问题 1: 请求返回 401
**原因**: 身份验证失败
**解决**:
1. 检查 `X-Agent-Token` 或 `Authorization` 头
2. 确认 token 在 `allowed_api_keys` 列表中
3. 检查 Diting 日志

### 问题 2: 请求返回 403
**原因**: 策略拒绝或审批超时
**解决**:
1. 检查 `policy_rules.yaml` 中的规则
2. 如果是审批超时，增加 `cheq.timeout_seconds`
3. 查看审计日志中的 `decision_reason`

### 问题 3: 飞书审批消息未收到
**原因**: 飞书配置错误或投递失败
**解决**:
1. 检查 `app_id` 和 `app_secret` 是否正确
2. 确认 `approval_user_ids` 中的用户 ID 有效
3. 检查 Diting 日志中的飞书投递错误

### 问题 4: 审计日志为空
**原因**: 审计存储配置错误
**解决**:
1. 检查 `audit.path` 目录是否存在
2. 确认目录有写权限
3. 检查 Diting 日志中的审计写入错误

---

## 💡 最佳实践

### 1. 配置管理
- ✅ 敏感项从环境变量覆盖
- ✅ 使用 `.env` 文件管理
- ❌ 不要在 YAML 中写密钥

### 2. 审计日志
- ✅ 记录所有决策
- ✅ 包含完整上下文
- ✅ 支持事后溯源

### 3. 错误处理
- ✅ 优雅降级
- ✅ 清晰的错误信息
- ✅ 完整的错误日志

### 4. 性能优化
- ✅ 缓存策略规则
- ✅ 异步投递飞书
- ✅ 批量写审计日志

### 5. 安全加固
- ✅ 验证所有输入
- ✅ 脱敏敏感字段
- ✅ 限制请求速率

---

## 📞 获取帮助

### 查看日志
```bash
# Diting 日志
tail -f logs/diting.log

# 审计日志
tail -f data/audit.jsonl

# 查询特定 trace_id 的审计
grep "trace_id" data/audit.jsonl | jq .
```

### 查看配置
```bash
# 查看当前配置
cat config.yaml

# 查看策略规则
cat policy_rules.yaml
```

### 测试连接
```bash
# 测试 Diting 连接
curl -H "X-Agent-Token: key1" http://localhost:8080/health

# 测试策略规则
curl -X DELETE -H "X-Agent-Token: key1" http://localhost:8080/api/delete
```

---

## 🎉 总结

紫微生态三大组件：
- **Tianshu**: 任务分发中心 (规划中)
- **Taibai**: 适配器框架 (MVP)
- **Diting**: 治理网关 (MVP)

核心特性：
- ✅ 零信任架构
- ✅ 人机协同
- ✅ 完整审计
- ✅ 智能降级
- ✅ 易于扩展

快速开始：
1. 启动 Diting
2. 配置 Agent
3. 发送请求
4. 查看审计日志
