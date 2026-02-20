# BMAD 链路一致性检查：PRD → 架构 → Epics → Stories → 代码实现

**执行角色**：PM Agent（按 BMAD 机制）  
**检查日期**：2026-02-16  
**范围**：根（ziwei）与子项目（diting、tianshu、taibai、wukong）的 PRD、架构方案、Epics、Stories 与代码实现之间的一致性。

---

## 1. 检查维度与数据源

| 链路环节 | 根（ziwei） | 谛听（diting） | 天枢（tianshu） | 太白（taibai） | 悟空（wukong） |
|----------|-------------|----------------|-----------------|----------------|----------------|
| **PRD** | product-brief、紫微平台规划梳理（无单独 prd.md） | _bmad-output/planning-artifacts/prd.md | _bmad-output/planning-artifacts/prd.md | 根技术方案 §4 + 太白边界决策（无子项目 prd.md） | _bmad-output/planning-artifacts/prd.md |
| **架构** | architecture-ziwei.md、技术方案 | planning-artifacts/architecture.md | planning-artifacts/architecture.md | ADR-001、根 §4 | planning-artifacts/architecture.md |
| **Epics** | platform-epics-and-submodule-mapping（E-P1～E-P7） | planning-artifacts/epics.md（Epic 1～11） | planning-artifacts/epics-and-stories.md（E1～E11） | 边界决策、P1 协议对齐 | implementation-plan（阶段式，无 Epic 编号） |
| **Stories/Issue** | 映射到子项目 Issue/Epic | ISSUE_LIST（I-001～I-022）、implementation-artifacts/*.md | epics-and-stories 内 Story ID（E1-S1 等）、next-stage | P1 协议与文档对齐 | implementation-plan 任务列表、ROADMAP |
| **代码** | 无业务代码，仅 docs/_bmad | cmd/diting、internal、pkg/chain 等 | 天枢代码库 | sdk/python、adapters、verification_agent | wukong CLI/包（若已实现） |

---

## 2. 根（ziwei）链路一致性

### 2.1 PRD ↔ 架构

- **PRD 代理**：产品简报（product-brief-ziwei）、紫微平台规划梳理 定义愿景、范围、子模块（天枢/谛听/太白）；技术方案 提供能力与接口细节。
- **架构**：architecture-ziwei.md、技术方案 明确平台复合体、天枢/谛听/太白职责、链归属谛听、天枢调用谛听 DID。
- **一致性**：✅ 产品简报与规划梳理中的「功能下沉子模块」「链归属谛听」「天枢通过谛听 DID 接口」与 architecture-ziwei ADR-001/ADR-002、技术方案 一致。

### 2.2 架构 ↔ Epics

- **平台 Epic**：E-P1～E-P7（身份/DID、通信/Matrix、策略与审批、审计与存证、企业 IM、太白接入、链与 DID 贯通）。
- **架构对应**：E-P1/E-P7 与「DID、链归属谛听、天枢调用谛听 DID」一致；E-P3/E-P4 与谛听策略/审计/链一致；E-P6 与太白协议/SDK 一致。
- **一致性**：✅ platform-epics-and-submodule-mapping 与 architecture-ziwei、技术方案 无冲突；依赖顺序 I-016→I-017→I-018 在映射中明确。

### 2.3 Epics ↔ 子项目 Issue/Story

- **映射**：E-P1～E-P7 已映射到 diting（I-016～I-018、Epic 1～9）、tianshu（epics-and-stories、I-018）、taibai（协议/SDK/verification_agent）。
- **一致性**：✅ 实现就绪报告（2026-02-15）已做 FR→Epic 覆盖校验，13 项 FR 100% 覆盖；子项目 ISSUE_LIST 与 platform-epics 映射一致。

### 2.4 缺口与建议（根）

- **PRD 命名**：根无单独 `prd.md`，以产品简报 + 技术方案作为范围输入；实现就绪报告已记录，可选在 planning-artifacts 增加或重命名一份 PRD 便于工具链一致。
- **Story 粒度**：根层不展开 Story/AC，由各子项目在 _bmad-output 或 ISSUE_LIST 维护；符合当前「平台 Epic ↔ 子模块映射」设计。

---

## 3. 谛听（diting）链路一致性

### 3.1 PRD ↔ 架构

- **PRD**：prd.md 含 FR-01～FR-27、NFR、3AF Exec；价值主张与 v1 验收与架构对齐。
- **架构**：architecture.md 与 6 组件、All-in-One、CHEQ、审计、链子模块设计一致；chain-submodule-design-I016 与 I-016/I-017 对应。
- **一致性**：✅ PRD FR 与 epics.md 的 FR Coverage Map 对应；架构中链归属、DID/存证 API 与 ISSUE_LIST I-016～I-018 描述一致。

### 3.2 架构 ↔ Epics ↔ Stories/Issue

- **Epics**：epics.md 中 Epic 1～11，其中 **Epic 10** 为链与 DID（Stories 10.1～10.6），与 I-016（设计）、I-017（最小链+DID/存证）、I-018（天枢对接）对应。
- **Implementation artifacts**：diting/_bmad-output/implementation-artifacts/ 存在 10-*.md（如 10-3-chain-audit-verify、10-5-chain-mount-and-config、10-6-audit-to-chain-integration）与 1-1、5-1、6-1 等，对应各 Epic/Story。
- **ISSUE_LIST**：I-016～I-018 已标 **Done**；I-019/I-020（单测、E2E）已 Done；与 platform-epics E-P7 及根架构「链与 DID 贯通」一致。
- **一致性**：✅ 架构→Epic 10→I-016/I-017/I-018→implementation-artifacts 与 ISSUE_LIST 状态一致。

### 3.3 Stories/Issue ↔ 代码实现

- **链与 DID**：ISSUE_LIST I-016（设计）、I-017（最小链+DID API）对应代码为 **diting/pkg/chain/**（local.go、merkle.go、ledger.go、store.go、types.go）、**diting/internal/chain/**（handler.go、audit_bridge.go）；I-018 为天枢侧调用，谛听暴露 DID/存证 API。
- **一致性**：✅ 存在 pkg/chain 与 internal/chain，与 I-016/I-017 及 Epic 10 实现路径一致；I-017 完成标志（config.chain-run.yaml、/chain/health）与代码可对应。

---

## 4. 天枢（tianshu）链路一致性

### 4.1 PRD ↔ 架构

- **PRD**：tianshu/prd.md（输入含 DELIVERY、DEVELOPMENT、ROADMAP 等）；价值主张与旅程与架构对齐。
- **架构**：architecture.md 与 Matrix、飞书 Bridge、身份/注册、审批闭环、谛听对接 一致。
- **一致性**：✅ 无冲突；E4-S4「注册完成后通知谛听初始化权限」、E7 审计与谛听对接 与根架构「天枢↔谛听」约定一致。

### 4.2 架构 ↔ Epics ↔ Stories

- **Epics-and-Stories**：epics-and-stories.md 中 E1～E11，每 Epic 下含 Story ID（如 E1-S1、E4-S4、E4-S5）；E4 为 Agent 注册（含谛听初始化），E7 为审计与谛听对接，E10 为 Agent 协作。
- **根 E-P7（链与 DID 贯通）**：平台映射要求天枢 I-018（注册/心跳调用谛听 DID）；tianshu 侧为「调用方」，epics-and-stories 中 E4（注册）、E7（谛听）与 I-018 语义一致。
- **一致性**：✅ 各子项目应对焦事项与进度同步 记录 I-018 已实现、E-P7 联调已通过；epics-and-stories 与根 platform-epics 映射无冲突。

### 4.3 Stories ↔ 代码实现

- **实现状态**：根侧记录「E-P7 天枢侧待 I-018」已改为「I-018 已实现、联调通过」；tianshu 代码库中注册/心跳与谛听 DID 接口调用的实现需在子项目内核对（本报告不逐文件扫描）。
- **建议**：子项目内可做一次「E4/E7 相关 Story → 代码路径」的轻量追溯，确保 E4-S4（谛听初始化）、E4-S5（心跳）、I-018（DID 调用）有明确代码落点。

---

## 5. 太白（taibai）链路一致性

### 5.1 PRD / 架构

- **PRD**：无子项目 prd.md；**根技术方案 §4** 为太白协议与接入规范权威定义；《太白边界决策》明确边界与 SDK/verification_agent。
- **架构**：ADR-001（可扩展 Agent 适配器架构）、根 §4（事件类型、SDK 能力、适配器）。
- **一致性**：✅ 协议与文档对齐（P1）已完成（2026-02-15）；taibai/docs、sdk、adapters 与根 §4 一致。

### 5.2 Epics / Stories ↔ 代码

- **Epic 层级**：无独立 Epic 列表；「P1 协议与 §4 一致」「接入验证」为对焦事项。
- **代码**：taibai/sdk/python、taibai/adapters（如 claude_code_cli）、verification_agent 与根 E-P6（太白接入规范）、技术方案 §4 对应。
- **一致性**：✅ 边界决策与 P1-协议与文档对齐 已记录；代码路径与「SDK + 预置适配器 + 验证智能体」一致。

---

## 6. 悟空（wukong）链路一致性

### 6.1 PRD ↔ 架构

- **PRD**：wukong/_bmad-output/planning-artifacts/prd.md 明确「Agent 生命周期管理器」、一键启动/管理/监控、天枢对接、沙箱等。
- **架构**：architecture.md 与 LangGraph、BaseAgent、工具与图编排 一致（若为同一代码库形态）；ROADMAP 与 PRD 场景一致。
- **一致性**：✅ PRD 与 architecture 无冲突。

### 6.2 Epics / Stories

- **Epics**：无单独 epics.md 或 Epic 编号列表；**implementation-plan.md** 为阶段式（阶段 1～4：基础设施、核心功能、功能完善、测试文档），**ROADMAP.md** 为 Phase 0～3 与 Sprint 1～3（身份管理、生命周期、状态与 CLI）。
- **与 PRD 对应**：PRD 场景（开发者接入、多 Agent 管理、沙箱）与 ROADMAP Phase 1～2、implementation-plan 阶段 2～3 可对应，但**无显式 Epic/Story ID**，可追溯性弱于 diting/tianshu。
- **一致性**：⚠️ **建议**：若需与 BMAD 标准链路完全对齐，可增加 wukong epics-and-stories 或 ISSUE_LIST，将 ROADMAP/implementation-plan 任务赋予 Epic/Story ID，并可与 implementation-artifacts 或代码模块对应。

### 6.3 Stories ↔ 代码实现

- **代码**：wukong 若已实现 CLI（如 wukong claude、wukong list），则与 PRD/ROADMAP 的「身份管理、生命周期、状态与 CLI」对应；具体需在 wukong 目录下做「ROADMAP Sprint → 代码路径」核对。
- **结论**：当前为 ⚠️ 部分一致；建议补 Epic/Story 清单后再做一次 Story→代码 追溯。

---

## 7. 跨子项目与根的对齐

| 检查项 | 结果 |
|--------|------|
| 根技术方案 ↔ 根架构（architecture-ziwei） | ✅ 一致 |
| 根平台 Epic（E-P1～E-P7）↔ 根架构与映射 | ✅ 一致 |
| 根 Epic 映射 ↔ diting ISSUE_LIST（I-016～I-018） | ✅ 一致，且 I-016/I-017/I-018 已 Done |
| 根 Epic 映射 ↔ tianshu epics-and-stories、I-018 | ✅ 一致，I-018 已实现 |
| 根 Epic 映射 ↔ taibai 协议/SDK/验证智能体 | ✅ 一致 |
| diting PRD/架构/Epics ↔ diting 代码（链/DID） | ✅ 一致，pkg/chain、internal/chain 存在 |
| tianshu Epics/Stories ↔ 根 E-P7 与 I-018 | ✅ 一致 |
| wukong PRD/架构 ↔ ROADMAP/implementation-plan | ✅ 一致；Epic/Story 编号 ⚠️ 建议补充 |

---

## 8. 总结与建议

### 8.1 一致性结论

- **根**：PRD（产品简报+技术方案）→ 架构 → 平台 Epic → 子项目映射 **一致**；无单独 prd.md 已由实现就绪报告记录。
- **谛听**：PRD → 架构 → Epics（含 Epic 10）→ ISSUE_LIST（I-016～I-018）→ implementation-artifacts → **代码（pkg/chain、internal/chain）** 链路完整、一致。
- **天枢**：PRD → 架构 → epics-and-stories → 根 E-P7/I-018 **一致**；Story→代码 建议在子项目内做轻量追溯。
- **太白**：根 §4 + 边界决策 → 协议/SDK/适配器/验证智能体 **一致**；无子项目 PRD 符合当前边界约定。
- **悟空**：PRD → 架构 → ROADMAP/implementation-plan **一致**；建议补充 **Epic/Story 清单** 以便与 BMAD 标准链路及代码模块一一对应。

### 8.2 建议后续动作

1. **wukong**：在 _bmad-output/planning-artifacts 增加 epics.md 或 ISSUE_LIST，将 ROADMAP/implementation-plan 任务赋予 Epic/Story ID，并可选与 implementation-artifacts 或目录对应。
2. **tianshu**：在子项目内做一次 E4/E7 与 I-018 相关 Story → 代码路径的简短追溯，并可在 next-stage 或 pm-what-to-do-next 中记录。
3. **根**：若需工具链/审计统一，可考虑在 planning-artifacts 增加或重命名一份 PRD（如 prd-ziwei.md），引用产品简报与技术方案，便于与子项目 prd.md 命名对齐。

---

*本报告按 BMAD 链路（PRD → 架构 → Epics → Stories → 代码实现）执行一致性检查，供根与子项目规划及实现就绪使用。*
