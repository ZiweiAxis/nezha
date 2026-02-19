---
stepsCompleted: ['step-01-init', 'step-02-discovery', 'step-03-success', 'step-04-journeys', 'step-05-domain', 'step-06-innovation', 'step-07-project-type', 'step-08-scoping', 'step-09-functional', 'step-10-nonfunctional', 'step-11-polish']
lastEdited: '2026-02-16'
editHistory:
  - date: '2026-02-16'
    changes: '校验报告改进：FR23 补充审批拒绝后重试；NFR 补充测量方法；Project Scoping 增加 Epic–FR 映射约定'
inputDocuments:
  - docs/悟空-方案相关待办.md
  - docs/DEVELOPMENT.md
  - docs/USAGE.md
  - _bmad-output/planning-artifacts/architecture.md
  - _bmad-output/planning-artifacts/epics.md
  - _bmad-output/planning-artifacts/technical-spec.md
  - _bmad-output/planning-artifacts/implementation-plan.md
  - _bmad-output/planning-artifacts/dependencies.md
  - .claude/project-context.md
briefCount: 0
researchCount: 0
brainstormingCount: 0
projectDocsCount: 9
workflowType: 'prd'
classification:
  projectType: cli_tool
  domain: general
  complexity: medium
  projectContext: brownfield
---

# Product Requirements Document - wukong

**Author:** Dministrator  
**Date:** 2026-02-16

---

## Executive Summary

**愿景**：悟空（Wukong）是紫微智能体治理平台的 Agent 生命周期管理器，通过 CLI 一键启动、管理、监控 AI Agent，实现零侵入接入治理。  
**差异化**：不改 Agent 代码即可接入；与天枢（注册/心跳/状态）、谛听（审批/审计）、Element（hulk 审批闭环）形成端到端闭环；CLI 可脚本化，支持 CI/运维集成。  
**目标用户**：开发者（快速接入）、运维/管理员（多实例管理）、审批人（Element 内审批与治理指令）。

---

## Success Criteria

### User Success

- **开发者**：在无需修改 Agent 代码的前提下，通过 CLI 在约 5 分钟内完成接入紫微治理；首次启动完成身份注册（含审批流程），再次启动复用身份。
- **运维/管理员**：能通过 `wukong list` / `wukong status` 查看多 Agent 状态，通过 `wukong stop` / `wukong restart` / `wukong logs` 管理实例；在 Element + hulk 场景下，审批与治理指令闭环可预期（文档与行为一致）。
- **完成瞬间**：用户执行 `wukong claude` 后 Agent 正常跑起、状态同步到天枢；需要审批时在 Element 收到并确认，悟空侧最终完成注册或放行。

### Business Success

- **短期（约 3 个月）**：MVP 交付，至少一个真实场景（如 Element + hulk 端到端）持续使用 7 天无阻断；悟空与天枢/谛听/部署文档对齐，可作为紫微平台的标准 Agent 启动方式试点。
- **中期（6–12 个月）**：多实例管理、沙箱与自动重启等增强能力落地；W2（待审批/轮询）在天枢支持后实现或文档化，形成可复制的企业/团队使用案例。

### Technical Success

- **功能闭环**：身份注册、心跳、状态上报与天枢 API 稳定联通；启动的 Agent 能连天枢与谛听（W3：文档或代码透传 env）。
- **配置与约定**：WUKONG_OWNER_ID 与天枢/谛听侧约定一致（W1）；README/部署文档与 deploy 文档一致。
- **质量**：核心路径单元测试覆盖率 > 80%；E2E 覆盖「启动 → 审批（若需要）→ 状态同步」主流程。

### Measurable Outcomes

| 维度 | 可度量结果 |
|------|------------|
| 用户 | 新用户从安装到首次 `wukong claude` 成功 < 10 分钟；再次启动复用身份无人工审批（或审批一次后持久生效）。 |
| 运维 | 支持通过 CLI 管理 ≥1 个 Agent；list/status/stop/restart/logs 可用。 |
| 集成 | Element + hulk 端到端：注册→审批→放行、治理指令→审批→放行 可复现；文档可查。 |
| 质量 | 单元测试覆盖率 > 80%；至少 1 条 E2E 覆盖完整启动与状态同步。 |

---

## Product Scope

### MVP - Minimum Viable Product

- **身份管理（E1）**：天枢/太白注册、身份缓存、验证与分级审批；天枢客户端（注册/心跳/状态上报）。
- **生命周期与 CLI（E2–E3）**：Agent 启动/停止/重启与进程监控；Claude 适配器与 diting-hook 配置；状态管理与天枢上报；CLI：`wukong claude` / list / status / stop / restart / logs / identity。
- **Element + hulk 约定（W1、W3）**：文档约定 WUKONG_OWNER_ID 与天枢/谛听一致；文档或代码保证启动的 Agent 可连天枢与谛听。
- **测试与文档（E4）**：E2E 覆盖主流程；API/用户/故障排查文档完善；至少一个真实场景持续使用 7 天验收。

### Growth Features (Post-MVP)

- **沙箱与多实例**：Docker 沙箱（E5）、多 Agent 管理与自动重启（E6）。
- **审批与集成增强**：天枢支持注册「待审批」后，悟空实现 W2（待审批处理与可选轮询或文档说明）。
- **体验与可观测**：更丰富的日志与状态展示、可选监控/告警集成。

### Vision (Future)

- 更多 Agent 适配器（如 Cursor）与通用适配器框架；社区/企业适配器生态。
- 深度沙箱（如 gVisor）、更强安全与合规能力；与飞书/Web 控制台等渠道的集成。

---

## User Journeys

### 1. 开发者（主路径）— 张三

张三开发了基于 Claude 的代码审查 Agent，需要接入公司紫微治理平台。**开场**：不想改 Agent 代码，希望尽快接好就用。**过程**：安装悟空、配置天枢地址、执行 `wukong claude`；首次自动注册，若需审批则在 Element 收到通知并确认；再次启动复用本地身份。**高潮**：5 分钟内完成接入，Agent 跑起且状态同步到天枢。**结果**：无需改代码、审批一次持久生效，可专注业务。

### 2. 开发者（边界 / 审批）— 首次注册待审批

首次注册触发中/高风险审批。**过程**：悟空提交注册后返回「待审批」或轮询中；用户在 Element（hulk 房间）收到审批请求并确认。**可能失败**：超时、拒绝或网络中断；悟空展示明确状态或文档说明，用户可重试或联系管理员。**恢复**：审批通过后身份持久化，后续启动不再重复审批。

### 3. 运维 / 管理员 — 李四

李四负责公司内多台 AI Agent 实例。**开场**：需要统一查看状态、重启异常实例、查日志。**过程**：`wukong list` 看所有实例，`wukong status <name>` 看详情，`wukong stop` / `wukong restart` 管理，`wukong logs` 排查。**高潮**：状态与天枢一致，批量操作与日志可预期。**结果**：运维可控、故障可追溯。

### 4. 审批人 / 治理 — hulk（Element）

hulk 在 Element 接收悟空侧触发的审批。**开场**：需对 Agent 注册或敏感操作做放行决策。**过程**：注册流中谛听推送申请到 DELIVERY_ROOM_ID，hulk 在 Element 确认；治理指令下发后，Agent 执行触发谛听规则，审批再次推回 Element，hulk 确认后谛听放行。**高潮**：注册与治理双闭环在 Element 内完成。**结果**：审批可追溯、与天枢/谛听约定一致（含 WUKONG_OWNER_ID）。

### 5. 安全 / 沙箱（Vision）— 王五

王五要求 Agent 在隔离环境运行。**过程**：使用 `wukong claude --mode sandbox` 或 `deep-sandbox`，悟空创建隔离容器并注入 diting-hook。**结果**：审计完整、隔离有效，满足安全策略。

### Journey Requirements Summary

| 能力领域 | 由旅程揭示的需求 |
|----------|------------------|
| 身份与注册 | 注册、缓存、验证、分级审批、与天枢/太白一致；W1 owner 约定、W2 待审批处理（或文档）。 |
| CLI 与运维 | `wukong claude` / list / status / stop / restart / logs / identity；可脚本化、输出与错误明确。 |
| 集成 | 与天枢、谛听、Element（DELIVERY_ROOM_ID、WUKONG_OWNER_ID）的约定与实现；W3 Agent 环境透传。 |
| 可观测与恢复 | 状态可见、日志可查、审批/失败状态明确、恢复路径文档化。 |

---

## Domain-Specific Requirements

### Compliance & Regulatory

- 与天枢、谛听及主仓部署文档的约定一致（W1/W3）；审批与治理闭环可追溯、可复现。
- 无强行业监管；以平台内约定与运维/审计需求为主。

### Technical Constraints

- **身份与密钥**：安全存储（如文件权限 600）、不落日志。
- **集成**：启动的 Agent 必须能连天枢与谛听（环境变量或悟空透传）；文档或代码明确 TIANSHU_*、DITING_* 等。
- **可观测**：日志与状态满足运维排障与审计需要。

### Integration Requirements

- 天枢 API：注册、心跳、状态上报；DELIVERY_ROOM_ID、owner 映射与 Matrix/Element 一致。
- 谛听：审批推送、放行回调；Agent 侧敏感操作经谛听（如 /auth/exec）。
- Matrix/Element：hulk 审批场景下 WUKONG_OWNER_ID 与天枢/谛听侧约定一致。

### Risk Mitigations

- **API 变更**：与天枢/太白团队对齐，关键路径抽象或文档化。
- **审批超时/失败**：明确状态与重试策略或文档说明（含 W2 待审批）。

---

## CLI Specific Requirements

### Project-Type Overview

悟空为 CLI 优先的 Agent 生命周期管理工具：用户通过终端命令启动、管理、监控 Agent，并与天枢/谛听集成；支持可脚本化与多种输出格式，便于 CI/运维集成。

### Technical Architecture Considerations

- **命令结构 (command_structure)**：`wukong claude` [options]、`wukong list|status|stop|restart|logs|identity|config`；子命令与选项与 epics/USAGE 一致。
- **输出格式 (output_formats)**：默认 table；支持 `--format json`（如 list）供脚本与监控使用；错误与状态码明确、可解析。
- **配置模型 (config_schema)**：环境变量（TIANSHU_API_URL、WUKONG_OWNER_ID、DITING_* 等）；全局 `~/.wukong/config.json`；可选项目级 `.wukong.config.js`；文档约定与 deploy 一致（W1）。
- **脚本化支持 (scripting_support)**：非交互式执行、`--detach` 后台、可配置超时与退出码；CI 示例见 USAGE。

### Implementation Considerations

- 与天枢/谛听集成的配置（含 W3 透传）需在文档或代码中明确；CLI 错误信息需友好且可区分（配置错误、网络错误、审批未通过等）。
- Shell completion 列为 Growth，非 MVP 必须。

---

## Project Scoping & Phased Development

### MVP Strategy & Philosophy

**MVP Approach:** 问题解决型 MVP——最小可行路径验证「悟空 + 天枢 + 谛听 + Element」端到端可用；用户能通过 `wukong claude` 完成注册（含审批）、启动与状态同步，无需改 Agent 代码。  
**Resource Requirements:** 1–2 名全职开发可支撑 Phase 1；与天枢/谛听侧约定与联调需预留时间。

### MVP Feature Set (Phase 1)

**Core User Journeys Supported:**  
开发者首次/再次启动（张三）、审批闭环（hulk/Element）、运维查看与管理（李四）；边界场景（待审批/超时）有文档或明确状态。

**Must-Have Capabilities:**  
身份管理（E1）：注册、缓存、验证、分级审批、天枢客户端；生命周期与 CLI（E2–E3）：`wukong claude`/list/status/stop/restart/logs/identity、状态上报与 diting-hook；W1/W3 文档与约定；E4：E2E、文档、7 天验收。

### Post-MVP Features

**Phase 2 (Post-MVP):**  
Docker 沙箱（E5）、多 Agent 与自动重启（E6）；W2 待审批/轮询（天枢支持后）；可观测与 Shell completion 等体验增强。

**Phase 3 (Expansion):**  
更多适配器（如 Cursor）、通用适配器框架与生态；深度沙箱（gVisor）；飞书/Web 等渠道集成。

### Risk Mitigation Strategy

**Technical:** 天枢/谛听 API 变更 → 保持对齐与抽象；审批超时/失败 → 明确状态与文档（W2）。  
**Market:** 通过 7 天真实场景与 Element+hulk 闭环验证「有用」；再扩展多实例与沙箱。  
**Resource:** MVP 可先不实现沙箱与 W2 轮询，以文档与手动重试兜底。

**Epic–FR 映射约定：** 与 `_bmad-output/planning-artifacts/epics.md` 的 Epic–Story 及 FR 映射保持一致；规划与迭代时同步更新 PRD 与 epics。

---

## Functional Requirements

### 身份与注册 (Identity & Registration)

- FR1: 用户可在首次启动时通过悟空完成 Agent 身份向天枢注册。
- FR2: 用户可在身份已缓存时再次启动时复用本地身份而无需重新注册。
- FR3: 系统可在注册需审批时展示或轮询审批状态，直至审批通过或超时/拒绝。
- FR4: 用户可通过配置（如 WUKONG_OWNER_ID）与天枢/谛听侧约定审批归属（如 Element 房间）。
- FR5: 系统可将身份与密钥安全持久化（如本地文件、权限约束）。

### Agent 生命周期 (Agent Lifecycle)

- FR6: 用户可通过 CLI 启动指定类型的 Agent（如 Claude）并指定名称、工作目录、模式等。
- FR7: 用户可停止、重启已运行的 Agent 实例。
- FR8: 系统可在启动 Agent 时注入或透传与天枢、谛听相关的环境变量（以便 Agent 连天枢与谛听）。
- FR9: 系统可监控 Agent 进程状态并在可配置策略下执行自动重启。

### 状态与上报 (State & Reporting)

- FR10: 系统可维护 Agent 本地状态（如运行状态、治理状态）并持久化。
- FR11: 系统可将状态变更与心跳上报至天枢。
- FR12: 系统可接收天枢下发的治理状态（如 active/paused/suspended）并据此调整 Agent 行为。
- FR13: 用户可通过 CLI 查看单个或多个 Agent 的状态与列表。

### CLI 与配置 (CLI & Configuration)

- FR14: 用户可通过 CLI 执行 wukong claude / list / status / stop / restart / logs / identity / config 等命令。
- FR15: 用户可通过环境变量与配置文件（全局/项目）配置天枢地址、owner、谛听等。
- FR16: 用户可获取机器可读格式（如 JSON）的列表或状态输出以便脚本与监控集成。
- FR17: 用户可在非交互式/后台模式下运行悟空（如 --detach、CI）。

### 集成与约定 (Integration & Compliance)

- FR18: 系统与天枢的注册、心跳、状态上报 API 的约定与文档一致。
- FR19: 审批与治理闭环与谛听、Element（如 DELIVERY_ROOM_ID）的约定一致。
- FR20: 文档中说明 Element+hulk 端到端时所需的配置与透传（W1/W3）；若天枢支持待审批，悟空支持处理或文档说明（W2）。

### 可观测与恢复 (Observability & Recovery)

- FR21: 用户可查看指定 Agent 的日志（含实时跟踪与尾行数）。
- FR22: 系统在配置错误、网络错误、审批未通过等场景下给出明确、可区分的错误信息。
- FR23: 用户可通过文档了解审批超时/失败/拒绝后的恢复路径（重试或联系管理员）；审批拒绝后重试行为与该恢复路径一致。

---

## Non-Functional Requirements

### Performance

- 本地模式下，从执行 `wukong claude` 到 Agent 进程就绪的启动时间 ≤ 10 秒（不含网络审批等待）；可通过集成测试或运维监控验证。
- 状态变更上报至天枢的端到端延迟 ≤ 2 秒；心跳上报延迟 ≤ 1 秒（正常网络条件下）；可通过集成测试或 APM/监控验证。
- 悟空进程常驻内存占用 ≤ 100MB（单实例、无沙箱时）；可通过运行时监控验证。

### Security

- 身份与私钥仅存储在本地，文件权限为 600（仅所有者可读写）；敏感信息不写入日志。
- 与天枢/谛听的通信使用 HTTPS 或约定安全通道；密钥与 token 不通过 CLI 参数明文传递。
- 沙箱模式（Phase 2）下，Agent 在隔离环境中运行，资源与网络按设计隔离。

### Reliability

- 悟空与天枢之间的可用性目标为 99.9%（排除公网或天枢侧不可用）；心跳与状态上报失败时采用指数退避重试；可通过运维 SLA 或 APM 验证。
- Agent 进程异常退出且启用自动重启时，在可配置间隔（如 5 秒）内触发重启；本地状态与身份持久化，进程重启后可恢复；可通过集成测试或运维验证。

### Integration

- 与天枢 API（注册、心跳、状态上报）的兼容性以文档与约定版本为准；天枢 API 变更时需在文档或发布说明中标注兼容策略。
- 与谛听、Element（DELIVERY_ROOM_ID、审批闭环）的集成满足文档约定（W1/W3）；集成失败或超时时，错误信息可区分且可追溯。
