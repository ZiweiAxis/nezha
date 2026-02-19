---
stepsCompleted: ['step-01-validate-prerequisites', 'step-02-design-epics', 'step-03-create-stories', 'step-04-final-validation']
inputDocuments:
  - _bmad-output/planning-artifacts/prd.md
  - _bmad-output/planning-artifacts/architecture.md
---

# wukong - Epic Breakdown

## Overview

This document provides the epic and story breakdown for wukong, decomposing the requirements from the PRD and Architecture into implementable stories. Existing E1–E6 and Phase 1 Story structure in this repo can be aligned or merged in the Epic design step.

## Requirements Inventory

### Functional Requirements

FR1: 用户可在首次启动时通过悟空完成 Agent 身份向天枢注册。
FR2: 用户可在身份已缓存时再次启动时复用本地身份而无需重新注册。
FR3: 系统可在注册需审批时展示或轮询审批状态，直至审批通过或超时/拒绝。
FR4: 用户可通过配置（如 WUKONG_OWNER_ID）与天枢/谛听侧约定审批归属（如 Element 房间）。
FR5: 系统可将身份与密钥安全持久化（如本地文件、权限约束）。
FR6: 用户可通过 CLI 启动指定类型的 Agent（如 Claude）并指定名称、工作目录、模式等。
FR7: 用户可停止、重启已运行的 Agent 实例。
FR8: 系统可在启动 Agent 时注入或透传与天枢、谛听相关的环境变量（以便 Agent 连天枢与谛听）。
FR9: 系统可监控 Agent 进程状态并在可配置策略下执行自动重启。
FR10: 系统可维护 Agent 本地状态（如运行状态、治理状态）并持久化。
FR11: 系统可将状态变更与心跳上报至天枢。
FR12: 系统可接收天枢下发的治理状态（如 active/paused/suspended）并据此调整 Agent 行为。
FR13: 用户可通过 CLI 查看单个或多个 Agent 的状态与列表。
FR14: 用户可通过 CLI 执行 wukong claude / list / status / stop / restart / logs / identity / config 等命令。
FR15: 用户可通过环境变量与配置文件（全局/项目）配置天枢地址、owner、谛听等。
FR16: 用户可获取机器可读格式（如 JSON）的列表或状态输出以便脚本与监控集成。
FR17: 用户可在非交互式/后台模式下运行悟空（如 --detach、CI）。
FR18: 系统与天枢的注册、心跳、状态上报 API 的约定与文档一致。
FR19: 审批与治理闭环与谛听、Element（如 DELIVERY_ROOM_ID）的约定一致。
FR20: 文档中说明 Element+hulk 端到端时所需的配置与透传（W1/W3）；若天枢支持待审批，悟空支持处理或文档说明（W2）。
FR21: 用户可查看指定 Agent 的日志（含实时跟踪与尾行数）。
FR22: 系统在配置错误、网络错误、审批未通过等场景下给出明确、可区分的错误信息。
FR23: 用户可通过文档了解审批超时/失败/拒绝后的恢复路径（重试或联系管理员）；审批拒绝后重试行为与该恢复路径一致。

### NonFunctional Requirements

NFR1: 本地模式下，从执行 `wukong claude` 到 Agent 进程就绪的启动时间 ≤ 10 秒（不含网络审批等待）；可通过集成测试或运维监控验证。
NFR2: 状态变更上报至天枢的端到端延迟 ≤ 2 秒；心跳上报延迟 ≤ 1 秒（正常网络条件下）；可通过集成测试或 APM/监控验证。
NFR3: 悟空进程常驻内存占用 ≤ 100MB（单实例、无沙箱时）；可通过运行时监控验证。
NFR4: 身份与私钥仅存储在本地，文件权限为 600（仅所有者可读写）；敏感信息不写入日志。
NFR5: 与天枢/谛听的通信使用 HTTPS 或约定安全通道；密钥与 token 不通过 CLI 参数明文传递。
NFR6: 沙箱模式（Phase 2）下，Agent 在隔离环境中运行，资源与网络按设计隔离。
NFR7: 悟空与天枢之间的可用性目标为 99.9%（排除公网或天枢侧不可用）；心跳与状态上报失败时采用指数退避重试；可通过运维 SLA 或 APM 验证。
NFR8: Agent 进程异常退出且启用自动重启时，在可配置间隔（如 5 秒）内触发重启；本地状态与身份持久化，进程重启后可恢复；可通过集成测试或运维验证。
NFR9: 与天枢 API（注册、心跳、状态上报）的兼容性以文档与约定版本为准；天枢 API 变更时需在文档或发布说明中标注兼容策略。
NFR10: 与谛听、Element（DELIVERY_ROOM_ID、审批闭环）的集成满足文档约定（W1/W3）；集成失败或超时时，错误信息可区分且可追溯。

### Additional Requirements

- 配置管理：支持环境变量与配置文件（全局/项目）；与 PRD 中 config_schema 一致。
- 安全：API/密钥管理、输入验证、敏感信息不落日志；与 PRD Security NFR 一致。
- 监控与日志：结构化日志、性能指标、错误可追踪；与 PRD 可观测及 NFR 测量方法一致。
- 集成：与天枢、谛听、Element 的 API 与约定版本保持一致；文档化兼容策略。
- 参考：现有 epics 文档中 E1–E6 与 Phase 1 Story 表可在 Epic 设计步骤中合并或对齐。

### FR Coverage Map

| FR | Epic | 说明 |
|----|------|------|
| FR1–FR5 | Epic 1 身份管理 | 身份注册、缓存、审批、配置、持久化 |
| FR6–FR9, FR14–FR17 | Epic 2 生命周期与 CLI 核心 | 启动/停止/重启、监控、CLI 命令、配置、JSON、--detach |
| FR10–FR13 | Epic 3 状态与上报 | 本地状态、上报、治理状态接收、CLI 状态/列表 |
| FR18–FR20 | Epic 4 集成与约定 | 天枢/谛听/Element 约定、W1/W2/W3 文档 |
| FR21–FR23 | Epic 5 可观测与恢复 | 日志、错误信息、恢复路径与审批拒绝后重试 |
| NFR1–NFR10 | Epic 6 测试与文档 | 性能、安全、可靠性、集成及测量方法 |

## Epic List

### Epic 1: 身份管理
用户可完成 Agent 身份注册、缓存、审批归属约定，并安全持久化。  
**FRs covered:** FR1, FR2, FR3, FR4, FR5

### Epic 2: 生命周期与 CLI 核心
用户可通过 CLI 启动/停止/重启 Agent，配置环境与脚本化（含 config/list/status 等）。  
**FRs covered:** FR6, FR7, FR8, FR9, FR14, FR15, FR16, FR17

### Epic 3: 状态与上报
用户可查看 Agent 状态与列表，系统可上报并接收天枢治理状态。  
**FRs covered:** FR10, FR11, FR12, FR13

### Epic 4: 集成与约定
与天枢/谛听/Element 约定一致，文档与 W1/W2/W3 就绪。  
**FRs covered:** FR18, FR19, FR20

### Epic 5: 可观测与恢复
用户可查日志、获得明确错误信息与恢复路径（含审批拒绝后重试）。  
**FRs covered:** FR21, FR22, FR23

### Epic 6: 测试与文档
E2E、文档完善、7 天验收及 NFR 验证。  
**NFRs covered:** NFR1–NFR10；验收标准见 PRD。

---

## Epic 1: 身份管理

用户可完成 Agent 身份注册、缓存、审批归属约定，并安全持久化。  
**FRs covered:** FR1, FR2, FR3, FR4, FR5

### Story 1.1: 身份注册与天枢对接

As a 开发者,  
I want 首次启动时通过悟空向天枢完成 Agent 身份注册,  
So that Agent 可被平台识别并进入后续审批或使用流程。

**Acceptance Criteria:**  
**Given** 已配置天枢地址且无本地身份缓存  
**When** 用户执行 `wukong claude`（或等价启动）  
**Then** 悟空调用天枢注册 API 并取得注册结果  
**And** 若需审批，系统展示或轮询审批状态（FR3 在本 Epic 后续 Story 细化）

### Story 1.2: 身份缓存与再次启动复用

As a 开发者,  
I want 身份已缓存时再次启动复用本地身份而无需重新注册,  
So that 启动更快且不重复触发审批。

**Acceptance Criteria:**  
**Given** 本地已有有效身份缓存  
**When** 用户再次执行启动命令  
**Then** 悟空验证缓存有效性后直接使用，不调用注册 API  
**And** 仅在缓存无效或过期时重新注册

### Story 1.3: 审批状态展示与轮询

As a 开发者,  
I want 注册需审批时能看见审批状态或轮询直至通过/超时/拒绝,  
So that 我知道当前处于待审批并知晓结果。

**Acceptance Criteria:**  
**Given** 天枢返回需审批（如 pending）  
**When** 用户等待或主动查询  
**Then** 系统展示明确状态（待审批/通过/拒绝/超时）  
**And** 支持可配置轮询或文档说明手动重试（FR3、FR23 交叉）

### Story 1.4: 审批归属配置（WUKONG_OWNER_ID）

As a 运维/管理员,  
I want 通过配置（如 WUKONG_OWNER_ID）与天枢/谛听约定审批归属（如 Element 房间）,  
So that 审批请求推送到正确的审批人。

**Acceptance Criteria:**  
**Given** 已配置 WUKONG_OWNER_ID（或等价项）  
**When** 注册或治理触发审批  
**Then** 天枢/谛听使用该约定投递审批（如 DELIVERY_ROOM_ID）  
**And** 文档说明 Element+hulk 端到端时的配置（FR4、FR20）

### Story 1.5: 身份与密钥安全持久化

As a 系统,  
I want 将身份与密钥以安全方式持久化（如本地文件、权限约束）,  
So that 重启后可用且不泄露。

**Acceptance Criteria:**  
**Given** 已获得身份与密钥  
**When** 持久化到本地  
**Then** 文件权限为 600（或等价），敏感信息不写入日志  
**And** 满足 NFR4（安全存储）

---

## Epic 2: 生命周期与 CLI 核心

用户可通过 CLI 启动/停止/重启 Agent，配置环境与脚本化。  
**FRs covered:** FR6, FR7, FR8, FR9, FR14, FR15, FR16, FR17

### Story 2.1: Agent 启动/停止/重启

As a 开发者,  
I want 通过 CLI 启动、停止、重启指定类型的 Agent（如 Claude）并指定名称、工作目录等,  
So that 我能管理 Agent 生命周期。

**Acceptance Criteria:**  
**Given** 身份已就绪（Epic 1）  
**When** 用户执行 `wukong claude`（及 stop/restart）  
**Then** Agent 进程按参数启动或停止/重启  
**And** 支持名称、工作目录、模式等选项（FR6、FR7）

### Story 2.2: 启动时环境变量透传（天枢/谛听）

As a 开发者,  
I want 启动 Agent 时自动注入或透传与天枢、谛听相关的环境变量,  
So that Agent 能连天枢与谛听而无需我手动配置。

**Acceptance Criteria:**  
**Given** 悟空已配置天枢/谛听地址或约定  
**When** 启动 Agent 进程  
**Then** 子进程获得 TIANSHU_*、DITING_* 等所需环境变量  
**And** 文档或代码体现 W3（FR8）

### Story 2.3: 进程监控与可配置自动重启

As a 系统,  
I want 监控 Agent 进程状态并在可配置策略下执行自动重启,  
So that 异常退出后可恢复。

**Acceptance Criteria:**  
**Given** 已启用自动重启策略  
**When** Agent 进程异常退出  
**Then** 在可配置间隔（如 5 秒）内触发重启  
**And** 满足 NFR8（FR9）

### Story 2.4: CLI 命令集（claude/list/status/config）

As a 用户,  
I want 通过 CLI 执行 wukong claude / list / status / config 等命令,  
So that 我能操作与配置悟空。

**Acceptance Criteria:**  
**Given** 悟空已安装  
**When** 用户执行上述命令  
**Then** 行为与 PRD/CLI 专项要求一致  
**And** 支持环境变量与配置文件（全局/项目）（FR14、FR15）

### Story 2.5: 机器可读输出与脚本化（JSON、--detach）

As a 运维/脚本,  
I want 获取机器可读格式（如 JSON）的列表或状态并在非交互/后台模式运行,  
So that 可集成监控与 CI。

**Acceptance Criteria:**  
**Given** 支持 --format json（或等价）及 --detach  
**When** 脚本或 CI 调用  
**Then** 输出可解析且进程可后台运行  
**And** 满足 FR16、FR17

---

## Epic 3: 状态与上报

用户可查看 Agent 状态与列表，系统可上报并接收天枢治理状态。  
**FRs covered:** FR10, FR11, FR12, FR13

### Story 3.1: 本地状态维护与持久化

As a 系统,  
I want 维护 Agent 本地状态（运行状态、治理状态）并持久化,  
So that 重启后可恢复展示与上报。

**Acceptance Criteria:**  
**Given** Agent 已启动  
**When** 状态变更  
**Then** 本地状态更新并持久化到约定路径  
**And** 满足 FR10

### Story 3.2: 状态变更与心跳上报天枢

As a 系统,  
I want 将状态变更与心跳上报至天枢,  
So that 平台侧可见且满足 NFR2。

**Acceptance Criteria:**  
**Given** 与天枢联通  
**When** 状态变更或心跳周期到达  
**Then** 按约定 API 上报，延迟满足 ≤2s / ≤1s  
**And** 失败时指数退避重试（FR11、NFR7）

### Story 3.3: 治理状态接收与处理

As a 系统,  
I want 接收天枢下发的治理状态（如 active/paused/suspended）并据此调整 Agent 行为,  
So that 治理策略生效。

**Acceptance Criteria:**  
**Given** 天枢下发治理状态  
**When** 悟空收到  
**Then** 更新本地状态并执行相应行为（如暂停/恢复）  
**And** 满足 FR12

### Story 3.4: CLI 状态与列表查看

As a 用户,  
I want 通过 CLI 查看单个或多个 Agent 的状态与列表,  
So that 我能运维与排障。

**Acceptance Criteria:**  
**Given** 已有运行中或已停止的 Agent  
**When** 用户执行 `wukong list` 或 `wukong status <name>`  
**Then** 展示与本地/天枢一致的状态与列表  
**And** 满足 FR13

---

## Epic 4: 集成与约定

与天枢/谛听/Element 约定一致，文档与 W1/W2/W3 就绪。  
**FRs covered:** FR18, FR19, FR20

### Story 4.1: 天枢 API 约定与文档

As a 开发者/运维,  
I want 系统与天枢的注册、心跳、状态上报 API 的约定与文档一致且兼容策略可查,  
So that 集成稳定可维护。

**Acceptance Criteria:**  
**Given** 使用天枢注册/心跳/状态 API  
**When** 实现或升级  
**Then** 行为与文档一致，API 变更时文档或发布说明标注  
**And** 满足 FR18、NFR9

### Story 4.2: 谛听/Element 审批闭环约定

As a 审批人/运维,  
I want 审批与治理闭环与谛听、Element（如 DELIVERY_ROOM_ID）的约定一致,  
So that Element+hulk 端到端可复现。

**Acceptance Criteria:**  
**Given** 配置 DELIVERY_ROOM_ID 与 WUKONG_OWNER_ID  
**When** 注册或治理触发审批  
**Then** 谛听推送到约定房间，闭环行为与文档一致  
**And** 满足 FR19、NFR10

### Story 4.3: Element+hulk 端到端文档（W1/W2/W3）

As a 开发者/运维,  
I want 文档中说明 Element+hulk 端到端时所需的配置与透传及待审批处理（W1/W2/W3）,  
So that 我能正确部署与排障。

**Acceptance Criteria:**  
**Given** README 或部署/集成文档  
**When** 用户查阅  
**Then** 含 W1（owner 约定）、W3（Agent 环境透传）、W2（待审批时处理或文档说明）  
**And** 与 deploy 文档一致（FR20）

---

## Epic 5: 可观测与恢复

用户可查日志、获得明确错误信息与恢复路径。  
**FRs covered:** FR21, FR22, FR23

### Story 5.1: Agent 日志查看

As a 用户,  
I want 查看指定 Agent 的日志（含实时跟踪与尾行数）,  
So that 我能排障与审计。

**Acceptance Criteria:**  
**Given** 已运行的 Agent  
**When** 用户执行 `wukong logs <name>`（及 -f、--tail 等）  
**Then** 输出该 Agent 的日志，支持实时与尾行  
**And** 满足 FR21

### Story 5.2: 错误信息区分与可追溯

As a 用户,  
I want 在配置错误、网络错误、审批未通过等场景下获得明确、可区分的错误信息,  
So that 我能快速定位问题。

**Acceptance Criteria:**  
**Given** 发生配置错误、网络错误或审批未通过  
**When** 用户执行命令或查看输出  
**Then** 错误信息明确且可区分类型，便于追溯  
**And** 满足 FR22、NFR10

### Story 5.3: 审批超时/失败/拒绝恢复路径文档

As a 用户,  
I want 通过文档了解审批超时/失败/拒绝后的恢复路径（重试或联系管理员）,  
So that 审批拒绝后我知道如何重试或升级。

**Acceptance Criteria:**  
**Given** 用户文档或故障排查指南  
**When** 用户查阅  
**Then** 含审批超时/失败/拒绝后的恢复路径及与 FR23 一致的说明  
**And** 审批拒绝后重试行为与文档一致（FR23）

---

## Epic 6: 测试与文档

E2E、文档完善、7 天验收及 NFR 验证。  
**NFRs covered:** NFR1–NFR10

### Story 6.1: E2E 与 NFR 验证

As a 开发者/QA,  
I want 有 E2E 覆盖主流程（启动→审批若需要→状态同步）并验证 NFR（性能、安全、可靠性、集成）,  
So that 发布前质量可验证。

**Acceptance Criteria:**  
**Given** 主流程与 NFR 测量方法（见 PRD）  
**When** 运行 E2E 与 NFR 相关测试  
**Then** 通过；启动时间、延迟、内存、安全与集成等满足 PRD  
**And** 至少 1 条 E2E 覆盖完整启动与状态同步

### Story 6.2: 文档完善与 7 天验收

As a 产品/运维,  
I want API/用户/故障排查文档完善且至少一个真实场景持续使用 7 天验收通过,  
So that MVP 可交付且可运维。

**Acceptance Criteria:**  
**Given** PRD 中的文档与验收要求  
**When** 文档已发布且 7 天场景跑通  
**Then** API 文档、用户手册、故障排查指南就绪；7 天无阻断  
**And** 与 epics/PRD 的 Epic–FR 映射约定一致
