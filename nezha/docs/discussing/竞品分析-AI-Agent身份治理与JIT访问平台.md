# 竞品分析：AI Agent 身份治理与 JIT 访问平台

> 创建时间：2026-02-17

## 一、整体结构

```
JIT / PAM（人+机器）
├── CyberArk
├── BeyondTrust
├── Delinea
├── miniOrange
├── PAM One Identity Safeguard
├── 12Port Platform
├── StrongDM
└── ARCON

云 / 多云 JIT Access
├── Apono
└── Okta JIT Provisioning

动态授权 / ABAC 平台
├── Axiomatics
└── NextLabs

AI Agent 身份治理
├── Britive
├── Oasis (AAM™)
└── Lumos
```

---

## 二、JIT / PAM（人与非人类身份的临时权限）

**核心逻辑**：申请-审批-临时权限（时间+范围）-自动回收，和"动态策略生命周期"高度一致。

| 产品 | 厂商 | 核心特点（相关点） | 主要差异 |
|------|------|------------------|---------|
| CyberArk PAM | CyberArk | 典型 PAM 套件，支持 Zero Standing Privileges、时间/范围受限的 JIT 访问，自动回收权限。 | 主体是人/服务账号，资源是服务器/数据库/云，没有 Agent DID、本体层概念。 |
| BeyondTrust Modern PAM | BeyondTrust | Just-In-Time Access at Cloud Scale，用临时访问替代静态特权，支持 Slack/Teams 审批。 | 同上，主体仍是传统身份，面向基础设施访问。 |
| Delinea PAM | Delinea | PAM 套件，支持 JIT 特权访问、时间窗口、审批流。 | 偏 Windows / 传统 IT，对云原生 / AI Agent 支持有限。 |
| miniOrange PAM / JIT Access | miniOrange | 明确的 JIT Access 解决方案，支持时间窗口、审批流、ABAC/RBAC。 | 更偏 SMB / 通用 IT，不是专门为 AI Agent / 数据本体层设计。 |
| One Identity Safeguard | One Identity | 综合 PAM 平台，密码库，会话监控、远程访问控制，强调 least privilege & JIT。 | 传统 IGA / PAM，没有 Agent DID / 数据本体层。 |
| 12Port Platform | 12Port | 新一代 Zero Trust PAM，强调 Zero Standing Privileges、身份隔离，会话智能，支持人类和非人类身份。 | 比传统 PAM 更偏"零信任访问代理"，但主体仍非 AI Agent DID。 |
| StrongDM JIT Access | StrongDM | 专门做 Just-In-Time Access Platform，对基础设施（数据库、服务器、K8s 等）提供时间受限的访问 + 审批流。 | 资源是基础设施，不是业务系统 / 本体层。 |

**共同点**：
- 都有"申请 → 审批 → 临时权限 → 自动回收"的闭环

**差异点**：
- 主体：多是"人 / 服务账号 / 云角色"，没有 Agent DID 主体
- 资源：多是"服务器 / 数据库 / 云资源"，没有 Palantir 本体层 / 业务系统语义层
- 策略层：主要是 RBAC / ABAC + 时间/审批，没有数据视图映射 + 风险评分 + CHEQ 人类确认

---

## 三、云 / 多云 JIT Access 平台

| 产品 | 厂商 | 核心特点 |
|------|------|---------|
| Apono Just-in-Time Access | Apono | 专注云应用的 JIT 访问，自动申请/审批/撤销，支持 Okta/Azure AD、AWS/GCP/Azure，支持人类和非人类身份（包括 AI Agent）。 |
| Okta Just-In-Time Provisioning | Okta | 在用户首次登录时即时创建/更新账号，并动态授权。 |

**与紫微架构对比**：
- Apono 明确支持非人类身份 / AI Agent 的 JIT 访问
- 但资源是云资源 / SaaS 应用，没有本体层，行级数据控制等

---

## 四、动态授权 / ABAC 平台（偏数据级控制）

| 产品 | 厂商 | 核心特点 |
|------|------|---------|
| Axiomatics ABAC / PBAC 平台 | Axiomatics | 典型 ABAC / 策略驱动授权平台，用 XACML 表达策略，对应用、数据库、API 做实时、细粒度授权。 |
| NextLabs Application Enforcer / ABAC | NextLabs | 以 ABAC + 动态授权为核心，强调数据级安全、零信任架构，支持多种应用和数据源。 |

**与紫微架构对比**：
- 都支持"主体-动作-资源-环境"属性驱动的策略，可以做到非常细粒度的数据访问控制
- 但主体仍是传统身份，没有专门为 AI Agent / DID / 任务级动态策略建模

---

## 五、AI Agent 身份与访问治理（最接近紫微定位）

| 产品 | 厂商 | 核心定位与能力 |
|------|------|---------------|
| Britive Agentic Identity Security | Britive | 在原有云 PAM 基础上，专门扩展出 Agentic AI Identity Security：为 AI Agent 提供 Zero Standing Privileges、运行时授权，JIT Access、持续策略执行。支持 Agent Registry、运行时 ABAC/PBAC、无密钥 JIT 凭证、MCP 工具代理等。 |
| Oasis Agentic Access Management (AAM™) | Oasis Security | 定位为行业首个 Agentic Access Management 平台，在 AI Agent 和企业系统之间插入一层：把每个请求变成意图理解 → 策略判决 → JIT 短生命周期身份 → 完整审计链。强调 intent-aware、least-privilege、just-in-time access。 |
| Lumos Agentic AI Security / IAM | Lumos | 把 AI Agent 纳入身份治理，强调 Agentic AI Security，同时提供 just-in-time access for privileged entitlements，用户可通过 Web AppStore / CLI / Slack / Teams 申请细粒度访问。 |

**与紫微架构对比**：

**相似点**：
- 明确把 AI Agent 当作非人类身份治理对象
- 强调 JIT / 短生命周期权限 + 策略驱动 + 审计

**差异点**：
- 主体身份模型：多基于传统机器身份 / 服务账号，没有上升到 DID 原生
- 资源层：主要是 SaaS / 云应用 / 数据库，没有"Palantir 本体层 + 行列级数据视图映射"
- 策略层：多是"云权限 / API 权限"，而不是"数据视图 + 风险评分 + CHEQ 确认"一体化策略

---

## 六、选型建议

### 商业选型 / 对标

把紫微架构（DID + Agent + 数据本体 + CHEQ + 动态策略）当成"未来目标状态"：

| 对标目标 | 参考产品 | 说明 |
|---------|---------|------|
| Agent 身份治理层 | Britive / Oasis / Lumos | Agent 身份 + JIT |
| 数据级策略引擎 | Axiomatics / NextLabs | ABAC + 动态授权 |
| 申请-审批-临时权限流程 | CyberArk / BeyondTrust / Delinea / Apono | PAM / JIT 模式 |

### 自研架构设计参考

| 模块 | 参考对象 |
|------|---------|
| JIT 流程 | StrongDM / Apono / miniOrange |
| Agent 身份模型 | Britive 的 Agent Registry + DID / SPIFFE 支持 |
| 动态授权 | Axiomatics / NextLabs 的 ABAC 引擎 |
| 意图理解 + 策略执行 | Oasis AAM 的"意图 → 策略 → JIT 身份 → 审计链" |

---

## 七、紫微的独特定位

紫微的差异化优势：

1. **原生 DID 身份模型**：不是基于传统服务账号，而是真正的去中心化身份
2. **数据本体层**：不只是云资源，而是业务系统的语义层（Palantir 本体）
3. **CHEQ 人类确认**：不只是审批流，而是带签名的确认协议
4. **一体化策略**：数据视图 + 风险评分 + CHEQ 确认的组合

这些是目前商业竞品都没有的独特设计。

---

## 相关文档

- [动态策略生命周期管理-提案.md](./动态策略生命周期管理-提案.md)
- [网关拦截流程设计-提案.md](./网关拦截流程设计-提案.md)
- [风险分析层技术方案-提案.md](./风险分析层技术方案-提案.md)
