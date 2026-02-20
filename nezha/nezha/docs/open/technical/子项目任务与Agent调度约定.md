# 子项目任务与 Agent 调度约定

**版本**：v1.1  
**日期**：2026-02-13  
**目的**：约定需子项目执行的任务由子 Agent 在对应子项目上下文中执行，并按 **BMAD 规范** 做规划校验、**角色设置** 与 **任务执行**；根/紫微侧负责识别与调度，不代做子项目内实现。

---

## 1. 原则

- **根（紫微）**：平台级规划、里程碑、跨模块联调约定、文档与 Epic 映射；识别哪些任务属于哪个子模块。
- **子项目（天枢 / 獬豸 / 太白）**：本模块内的 Issue/Story 实现、代码与配置变更、子项目内 BMAD 工作流；由**该子项目上下文下的 Agent** 执行，且须**按 BMAD 规范做角色与工作流对齐**（见 §5）。

---

## 2. 自动调度子 Agent 的含义

当根/紫微侧（或主仓会话中的 Agent）判定某任务**归属某子项目**时：

1. **不**在主仓会话中直接修改子项目代码或子项目专属配置。
2. **应**将执行调度到子 Agent：
   - 在对应子项目目录（`ziwei/xiezhi`、`ziwei/tianshu`、`ziwei/taibai`）下打开或切换会话，使 Agent 运行在该子项目的 `.cursor/rules`、`_bmad`、`ISSUE_LIST` 等上下文中；
   - 或产出明确的「待子项目执行」任务说明与验收条件，由用户或自动化在子项目目录交付给子 Agent。
3. 若使用支持「按路径/工作区路由」的调度方式，可配置为：任务目标路径属于某子项目时，自动在子项目工作区启动或委托子 Agent。

---

## 3. 任务归属判断（示例）

| 任务类型 | 归属 | 执行位置 |
|----------|------|----------|
| 更新平台 Epic 映射、根技术方案、根规划梳理 | 根 | 主仓（ziwei）Agent |
| xiezhi I-016/I-017/I-018 实现、xiezhi 配置/代码变更 | 獬豸 | 子 Agent（ziwei/xiezhi） |
| tianshu 对接獬豸 DID、tianshu 代码/架构变更 | 天枢 | 子 Agent（ziwei/tianshu） |
| taibai SDK、verification_agent、taibai 文档 | 太白 | 子 Agent（ziwei/taibai） |
| 跨模块联调约定、接口契约、里程碑验收标准 | 根 | 主仓 Agent；具体实现仍由各子 Agent 在各自仓内执行 |

---

## 4. 与根规划的关系

- 《根与子模块规划对齐》《platform-epics-and-submodule-mapping》中列出的子项目 Issue/Epic，其**执行**在子项目内由子 Agent 完成；根文档仅做**引用与状态对齐**。
- 主仓规则见 `.cursor/rules/ziwei-repo-and-docs.mdc` 中「子项目任务与 Agent 调度」一节。

---

## 5. BMAD 规范校验与角色、任务执行

子项目任务规划与执行**必须按 BMAD 规范进行**：在调度到子 Agent 时，应完成**规范校验**、**角色设置**与**工作流对齐**，保证与各子项目 `_bmad/` 一致。

### 5.1 规范校验（BMAD 合规）

- **规划阶段**：子项目 PRD、Architecture、Epics/Stories 须符合 BMAD 四阶段与工作流约定；多子项目时须引用根 `ziwei/docs/open/technical/` 技术方案与根 architecture，并遵守《BMAD-多子项目管理-最佳实践》中的目录、架构、实现约定。
- **实现阶段**：子项目内 Story 开发、代码评审、验收须使用该子项目 `_bmad/` 下定义的工作流（如 dev-story、code-review、implementation-readiness 等），不得跳过或绕过 BMAD 产出物（如 `_bmad-output/` 中的 epics、sprint、acceptance 等）。
- **校验时机**：在根侧产出「待子项目执行」任务时，应标明该任务对应的 **BMAD 阶段与工作流**（如 Phase 3 架构、Phase 4 dev-story）；子项目侧执行前应确认当前子项目 `_bmad` 已安装且与根约定一致。

### 5.2 角色设置（BMAD Agent 角色）

调度到子项目执行时，应按任务类型**选用对应 BMAD 角色**，在子项目上下文中以该角色加载 Agent 或工作流：

| 任务类型 | 建议 BMAD 角色 | 说明 |
|----------|----------------|------|
| 需求/PRD、Epic/Story 拆分、实现就绪检查 | **PM**（Product Manager） | 见 `_bmad/bmm/agents/pm.md` |
| 架构、ADR、集成与标准约定 | **Architect** | 见 `_bmad/bmm/agents/architect.md` |
| 用户旅程、界面与体验 | **UX Designer** | 见 `_bmad/bmm/agents/ux-designer.md` |
| Story 实现、代码变更、技术实现 | **Dev**（Developer） | 见 `_bmad/bmm/agents/dev.md` |
| 测试、验收、质量门禁 | **QA** | 见 `_bmad/bmm/agents/qa.md` |
| 迭代与站会、排期与阻塞协调 | **SM**（Scrum Master） | 见 `_bmad/bmm/agents/sm.md` |
| 业务分析、调研与简报 | **Analyst** | 见 `_bmad/bmm/agents/analyst.md` |

- 各子项目在各自 `_bmad/bmm/agents/` 下应存在与根一致的 Agent 定义（或引用根）；调度时在**子项目目录**下激活对应角色，使 Agent 读取该子项目的 `_bmad`、`_bmad-output/`、`ISSUE_LIST` 等。

### 5.3 任务执行（工作流对齐）

- **执行入口**：子项目内任务应通过 BMAD 工作流或对应角色 Agent 的菜单执行（如 PM 的 [IR] 实现就绪、[CE] Epic/Story，Dev 的 dev-story、code-review），而非在无角色、无工作流的情况下随意修改代码或文档。
- **产出物**：所有规划与实现产出须落在该子项目的 `_bmad-output/` 或文档约定位置，并与根规划引用关系一致（见《根与子模块规划对齐》）。
- **跨阶段**：若任务涉及「先架构再实现」，应先在该子项目下以 Architect 完成架构/ADR，再以 Dev 执行实现；PM/IR 可用于实现前做就绪检查。

### 5.4 小结

- 子项目任务规划与执行 = **BMAD 规范校验** + **按任务类型设置 BMAD 角色** + **在子项目内按 BMAD 工作流执行**。
- 根侧负责：识别任务归属、标明建议阶段与角色、调度到子项目；子项目侧负责：在本地 `_bmad` 下以正确角色与工作流完成任务并更新产出物。

---

*与 `紫微智能体治理基础设施-技术方案.md`、`根与子模块规划对齐.md`、`BMAD-多子项目管理-最佳实践.md` 一致。*
