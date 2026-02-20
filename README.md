# 紫微智能体治理基础设施 (Ziwei)

欢迎来到紫微生态！这是一套完整的企业级 AI 智能体治理基础设施。

## 🚀 快速开始

### 第一步：了解架构 (5 分钟)
阅读 **[ECOSYSTEM_OVERVIEW.md](./ECOSYSTEM_OVERVIEW.md)** 了解整体架构和三个核心组件。

### 第二步：掌握快速参考 (10 分钟)
阅读 **[QUICK_REFERENCE.md](./QUICK_REFERENCE.md)** 掌握常用命令和配置。

### 第三步：查询详细信息 (按需)
使用 **[INDEX.md](./INDEX.md)** 快速查询文件位置、代码位置和学习路径。

---

## 📚 核心文档

| 文档 | 大小 | 用途 |
|------|------|------|
| [ECOSYSTEM_OVERVIEW.md](./ECOSYSTEM_OVERVIEW.md) | 18KB | 完整生态总结，包含架构、组件、工作流程、数据模型 |
| [QUICK_REFERENCE.md](./QUICK_REFERENCE.md) | 9.2KB | 快速参考指南，包含常用命令、配置、API、故障排查 |
| [INDEX.md](./INDEX.md) | 15KB | 完整索引，包含文件映射、代码位置、学习路径 |

---

## 🏗️ 三大核心组件

### 1️⃣ Tianshu (天枢) - 任务分发中心
- **位置**: `tianshu/`
- **语言**: Python
- **状态**: 规划中
- **功能**: 任务队列、身份管理、权限策略、审计字段注入

### 2️⃣ Taibai (太白) - 适配器框架
- **位置**: `taibai/`
- **语言**: Python
- **状态**: MVP (可用)
- **功能**: 适配器基类、SDK、协议定义、注册表
- **关键类**: `Agent`, `CLIAdapterBase`, `PluginAdapterBase`, `SDKAdapterBase`

### 3️⃣ Diting (谛听) - 治理网关
- **位置**: `diting/`
- **语言**: Go
- **状态**: MVP (可用)
- **功能**: HTTP 代理、风险评估、策略决策、人工审批、审计日志
- **架构**: 5 层设计 (L0-L4)

---

## 🎯 核心特性

✅ **零信任架构** - 所有请求都需要身份验证 (L0)
✅ **人机协同** - AI 提供建议，人类做最终决策 (L3)
✅ **完整审计** - 全链路追踪，决策理由记录 (L4)
✅ **智能降级** - LLM 不可用自动降级到规则引擎
✅ **易于扩展** - 灵活的适配器框架支持多种 Agent

---

## 📊 Diting 5 层架构

```
L0: 身份验证 (X-Agent-Token / Authorization)
    ↓
L1: 风险评估 (规则引擎 + LLM 分析)
    ↓
L2: 策略决策 (Allow / Deny / Review)
    ↓
L3: 人机协同 (CHEQ 确认引擎 + 飞书审批)
    ↓
L4: 审计追溯 (JSONL / PostgreSQL / ClickHouse)
```

---

## 🔄 请求处理流程

```
Agent 发送请求
    ↓ (HTTP + X-Agent-Token)
Diting L0 身份验证
    ↓ (token 有效)
Diting L1 风险评估
    ↓ (规则引擎 + LLM)
Diting L2 策略决策
    ↓ (Allow/Deny/Review)
    ├─ Allow → 转发请求 + 审计
    ├─ Deny → 拒绝请求 + 审计
    └─ Review → 创建 CHEQ + 飞书投递 + 等待审批 + 审计
```

---

## 🚀 快速启动

### 启动 Diting 网关
```bash
cd diting/cmd/diting
go build -o bin/diting ./cmd/diting_allinone
./bin/diting
```

### 发送测试请求
```bash
curl -H "X-Agent-Token: key1" http://localhost:8080/api/users
```

### 查看审计日志
```bash
tail -f diting/data/audit.jsonl
```

---

## 📖 学习路径

### 初级 (了解基础)
1. 阅读 [ECOSYSTEM_OVERVIEW.md](./ECOSYSTEM_OVERVIEW.md)
2. 阅读 [QUICK_REFERENCE.md](./QUICK_REFERENCE.md)
3. 查看 `diting/docs/QUICKSTART.md`

### 中级 (深入理解)
1. 阅读 `diting/docs/ARCHITECTURE_FULL.md`
2. 阅读 `diting/docs/PROJECT_SUMMARY.md`
3. 查看 `diting/cmd/diting/internal/proxy/pipeline.go`
4. 查看 `diting/cmd/diting/internal/cheq/engine.go`

### 高级 (开发扩展)
1. 阅读 `taibai/docs/adapter-development-guide.md`
2. 查看 `taibai/adapters/claude_code_cli/adapter.py`
3. 查看 `diting/cmd/diting/config.yaml`
4. 查看 `diting/cmd/diting/policy_rules.example.yaml`

### 专家 (贡献代码)
1. 查看 `diting/docs/STRUCTURE.md`
2. 查看 `diting/README.md`
3. 查看 `diting/cmd/diting/internal/models/`
4. 查看 `diting/cmd/diting/internal/audit/store.go`

---

## 🎯 常见任务

### 添加新的审批人
编辑 `diting/cmd/diting/config.yaml`:
```yaml
cheq:
  approval_rules:
    - path_prefix: "/admin"
      approval_user_ids: ["user1", "user2", "user3"]
```

### 修改审批超时
编辑 `diting/cmd/diting/config.yaml`:
```yaml
cheq:
  timeout_seconds: 300  # 改为 5 分钟
```

### 添加新的策略规则
编辑 `diting/cmd/diting/policy_rules.yaml`:
```yaml
rules:
  - id: review_api_call
    action: "api_call"
    resource: "/api/sensitive"
    decision: review
    reason: 敏感 API 需人工确认
```

### 启用飞书长连接
编辑 `diting/cmd/diting/config.yaml`:
```yaml
delivery:
  feishu:
    use_long_connection: true
```

---

## 🔍 故障排查

### 请求返回 401
**原因**: 身份验证失败
**解决**: 检查 `X-Agent-Token` 或 `Authorization` 头，确认 token 在 `allowed_api_keys` 列表中

### 请求返回 403
**原因**: 策略拒绝或审批超时
**解决**: 检查 `policy_rules.yaml` 中的规则，或增加 `cheq.timeout_seconds`

### 飞书审批消息未收到
**原因**: 飞书配置错误或投递失败
**解决**: 检查 `app_id` 和 `app_secret`，确认 `approval_user_ids` 有效

### 审计日志为空
**原因**: 审计存储配置错误
**解决**: 检查 `audit.path` 目录是否存在且有写权限

---

## 📞 获取帮助

### 查看日志
```bash
tail -f diting/logs/diting.log
tail -f diting/data/audit.jsonl
```

### 查看配置
```bash
cat diting/cmd/diting/config.yaml
cat diting/cmd/diting/policy_rules.yaml
```

### 查询审计日志
```bash
grep "trace_id" diting/data/audit.jsonl | jq .
```

### 查看文档
- 生态总结: [ECOSYSTEM_OVERVIEW.md](./ECOSYSTEM_OVERVIEW.md)
- 快速参考: [QUICK_REFERENCE.md](./QUICK_REFERENCE.md)
- 完整索引: [INDEX.md](./INDEX.md)
- Diting 项目总结: `diting/docs/PROJECT_SUMMARY.md`
- Diting 完整架构: `diting/docs/ARCHITECTURE_FULL.md`
- Taibai 适配器开发: `taibai/docs/adapter-development-guide.md`

---

## 🎉 总结

紫微是一套完整的、生产就绪的 AI 智能体治理基础设施：

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

---

## 📚 文档结构

```
ziwei/
├── README.md                    # 本文件 - 项目入口
├── ECOSYSTEM_OVERVIEW.md        # 完整生态总结
├── QUICK_REFERENCE.md           # 快速参考指南
├── INDEX.md                     # 完整索引
├── _bmad/                       # BMAD 需求管理
│   ├── README.md                # BMAD 索引
│   ├── README_epics.md          # Epic 列表
│   ├── README_stories.md        # Story 列表
│   └── content/
│       └── epics/               # Epic 详情
│           ├── e001_taibai_sdk.md
│           ├── e002_diting_seccomp.md
│           ├── e003_xiezhi_taibai.md
│           └── e004_nezha_integration.md
├── tianshu/                     # 天枢 - 任务分发中心
├── taibai/                      # 太白 - 适配器框架
└── diting/                      # 谛听 - 治理网关
    ├── README.md
    ├── README_CN.md
    ├── cmd/diting/
    │   ├── main.go
    │   ├── config.yaml
    │   ├── policy_rules.example.yaml
    │   └── internal/
    │       ├── proxy/
    │       ├── policy/
    │       ├── cheq/
    │       ├── audit/
    │       ├── delivery/
    │       ├── models/
    │       └── config/
    └── docs/
        ├── PROJECT_SUMMARY.md
        ├── ARCHITECTURE_FULL.md
        ├── STRUCTURE.md
        ├── QUICKSTART.md
        ├── INSTALL.md
        ├── TEST.md
        └── DEMO.md
```

---

## 🔗 快速链接

- **生态总结**: [ECOSYSTEM_OVERVIEW.md](./ECOSYSTEM_OVERVIEW.md) - 了解整体架构
- **快速参考**: [QUICK_REFERENCE.md](./QUICK_REFERENCE.md) - 常用命令和配置
- **完整索引**: [INDEX.md](./INDEX.md) - 文件位置和代码位置
- **Diting 项目**: [diting/README.md](./diting/README.md) - Diting 项目说明
- **Taibai 适配器**: [taibai/docs/adapter-development-guide.md](./taibai/docs/adapter-development-guide.md) - 适配器开发指南

---

## 💡 建议

1. **第一次使用**: 从 [ECOSYSTEM_OVERVIEW.md](./ECOSYSTEM_OVERVIEW.md) 开始
2. **快速查询**: 使用 [QUICK_REFERENCE.md](./QUICK_REFERENCE.md)
3. **深入学习**: 按照 [INDEX.md](./INDEX.md) 的学习路径
4. **遇到问题**: 查看 [QUICK_REFERENCE.md](./QUICK_REFERENCE.md) 的故障排查部分

---

祝你使用愉快！🎉

如有问题，请查看相关文档或联系技术支持。
