# BMAD 多子项目管理 — 官方文档与最佳实践

**目的**：基于 BMAD 官方文档与社区信息，整理「用 BMAD 同时管理多个子项目」的推荐做法，供紫微仓库（天枢、谛听、太白等）参考。

**文档日期**：2026-02-13  
**参考来源**：docs.bmad-method.org、GitHub bmad-code-org/BMAD-METHOD、社区讨论与 Issue。

---

## 1. 官方对「多子项目」的定位

### 1.1 何时需要「架构工作流」

官方明确：**多子项目、多 Epic、多 Agent 并行实现、集成复杂**时，应使用 **Phase 3 的 `create-architecture` 工作流**，而不是只写 PRD 就进入实现。

| 场景 | 官方建议 |
|------|----------|
| 多 Epic、多个子项目 | 使用 **architecture** 工作流 |
| 多个 Agent 实现不同部分 | 需要架构文档与 ADR 对齐决策 |
| 子项目间集成复杂 | 先做 Integration Architecture |
| 跨子项目的技术选型需统一 | 用 ADR 记录决策，避免各子项目各自为政 |

出处：[How to Create Architecture](https://docs.bmad-method.org/how-to/workflows/create-architecture/)

### 1.2 架构产出物对「多子项目/单体仓库」的意义

`create-architecture` 产出的 `architecture.md` 包含：

1. **System Architecture** — 系统级组件与交互  
2. **Integration Architecture** — 子项目/服务间如何通信  
3. **Standards and Conventions** — 目录结构、命名、测试等（**官方明确写：对 monorepo 至关重要**）  
4. **API Architecture** — 跨项目/服务边界的 API 风格  
5. **Deployment Architecture** — 多子项目下的 CI/CD、环境与监控  
6. **ADRs** — 关键决策及理由，供所有子项目共同遵守  

要点：**把技术决策写清楚，避免多个 Agent/子项目在实现时冲突。**

---

## 2. 目录与安装：每个子项目一套 _bmad，还是根目录一套？

### 2.1 官方默认模型：一项目一 _bmad

- 安装命令：`npx bmad-method install` 在**当前项目目录**下创建：
  - `_bmad/` — 配置、agent、workflow、bmm/core
  - `_bmad-output/` — 规划与实现产物（PRD、architecture、epics、sprint 等）
- 非交互安装支持 `--directory <path>`，用途包括 **Batch installations across multiple projects**（多项目批量安装）。

因此：**官方默认是「每个项目一个目录、每个目录一次 install」**，即 **每个子项目各自一套 `_bmad/` + `_bmad-output/`**。

### 2.2 与紫微当前做法的一致性

紫微当前是：

- `ziwei/diting/` — 自有 `_bmad/`、`_bmad-output/`
- `ziwei/tianshu/` — 自有 `_bmad/`、`_bmad-output/`

这与官方「每项目一 _bmad」的模型一致，无需改为「只在 ziwei 根目录装一套 BMAD」。

### 2.3 若希望「根目录统一规划、子目录只做实现」

可选做法（官方文档未明确写，但符合其理念）：

- **根目录**（如 `ziwei/`）：  
  - 可选安装 BMAD，用于**跨子项目的规划**：如总体 PRD、总体 architecture（含 Integration、Standards and Conventions、ADR）。  
  - 产出放在根目录的 `_bmad-output/` 或 `docs/`，供各子项目引用。
- **各子项目**（diting、tianshu 等）：  
  - 保留各自 `_bmad/`、`_bmad-output/`，用于本子项目的 Phase 2–4（PRD 可继承根目录或本地细化，architecture 引用根目录 + 本地 ADR）。  

这样既保留「每个子项目独立跑 BMAD 工作流」的能力，又有一份**跨子项目的统一架构与约定**。

---

## 3. 工作流与上下文管理

### 3.1 四阶段与多子项目

| 阶段 | 多子项目下的建议 |
|------|------------------|
| **Phase 1 Analysis** | 可按子项目或按主题做 brainstorming / research / product-brief |
| **Phase 2 Planning** | 若有跨子项目需求，建议在根或主导子项目先有总体 PRD，再在各子项目细化 |
| **Phase 3 Solutioning** | **必须**：用 `create-architecture` 产出统一 architecture + ADR + **Standards and Conventions**；各子项目可再补子项目级 ADR |
| **Phase 4 Implementation** | 各子项目用各自 `_bmad-output/` 的 epics/stories，`dev-story` / `code-review` 在子项目内完成 |

### 3.2 已有项目（Brownfield）与 document-project

- 对**已有代码**的子项目，官方建议用 `document-project` 扫描代码库，生成当前状态文档（技术栈、架构模式、集成点等）。  
- 多子项目时，可**每个子项目各跑一次** document-project，产出分别放在各子项目的 `_bmad-output/` 或 `docs/`。  
- 若存在**根目录级**的总体文档（如 `ziwei/docs/open/technical/紫微智能体治理基础设施-技术方案.md`），应在做架构或 PRD 时让 Agent 读取，以保证与总体架构一致。

### 3.3 project-context 与 document-project

- `project-context.md`：供实现阶段 Agent 使用的「当前项目规则与约束」。  
- 多子项目时：**每个子项目维护自己的 project-context**（若使用），并在其中引用根目录或本地的 architecture、ADR、Standards and Conventions。  
- 社区/Issue 中有将 `document-project` 与 `generate-project-context` 打通的讨论，便于从扫描结果自动生成 project-context；多子项目下同样可「每子项目各一份」。

---

## 4. 社区与官方提到的实践要点

- **显式决策优于隐式约定**：多 Agent、多子项目时，用 ADR 和 architecture 明确写清「为什么这样选」「边界在哪里」，避免实现时冲突。  
- **Standards and Conventions 必写**：目录结构、命名、测试、API 风格等，对 monorepo/多子项目至关重要，应写在 architecture 或根目录共享文档中。  
- **每工作流新会话**：官方建议每个 workflow 使用新 chat，减少上下文混淆；多子项目时，切换子项目或切换规划/实现时，新开会话更稳妥。  
- **/bmad-help**：不确定下一步时，在对应项目目录下跑 `/bmad-help`，会按当前项目状态给出建议。  
- **Discord**：多项目、多 workspace 等具体用法可在 [BMAD Discord](https://discord.gg/gk8jAdXWmj) 的 #bmad-method-help 或 help-requests 论坛询问。

---

## 5. 紫微仓库的推荐用法（小结）

| 维度 | 建议 |
|------|------|
| **目录** | 保持 **每个子项目（diting、tianshu 等）各自 `_bmad/`、`_bmad-output/`**；若要做跨子项目统一规划，可在 `ziwei/` 根目录再装一套 BMAD 或仅在根目录维护共享的 architecture/ADR。 |
| **架构** | 使用 **create-architecture** 产出/更新 **总体** architecture（含 Integration、Standards and Conventions、ADR），子项目实现时引用该文档并遵守约定。 |
| **规划** | 跨子项目需求在总体 PRD 或根目录规划中体现；子项目 PRD/epics 与总体对齐，必要时子项目内再细化。 |
| **实现** | 各子项目在各自目录下跑 create-story / dev-story / code-review，产出保留在各自 `_bmad-output/`。 |
| **文档** | 根目录 `ziwei/docs/` 存放跨子项目技术方案与架构图；各子项目 `docs/` 与 `_bmad-output/` 存放本子项目专属文档与 BMAD 产物。 |

这样既符合 BMAD 官方「一项目一 _bmad」与「多子项目用架构工作流统一决策」的设定，又和当前紫微（天枢、谛听各自 BMAD）的结构兼容，并便于后续加入太白等更多子项目时复用同一套约定与流程。

---

## 6. 参考链接

- [BMAD 官方文档首页](https://docs.bmad-method.org/)
- [Workflow Map（四阶段与工作流）](https://docs.bmad-method.org/reference/workflow-map/)
- [How to Create Architecture（何时用、产出物、ADR）](https://docs.bmad-method.org/how-to/workflows/create-architecture/)
- [Four Phases 说明](https://docs.bmad-method.org/explanation/architecture/four-phases/)
- [Getting Started（安装与 _bmad 目录）](https://docs.bmad-method.org/tutorials/getting-started/)
- [Document an Existing Project（Brownfield）](https://docs.bmad-method.org/how-to/brownfield/document-existing-project/)
- [非交互安装（多项目批量安装）](https://docs.bmad-method.org/how-to/install-bmad/)（见 Non-Interactive Installation）
- [BMAD 完整文档 llms-full.txt](https://docs.bmad-method.org/llms-full.txt)（供 AI 一次性拉取上下文）
- [GitHub: bmad-code-org/BMAD-METHOD](https://github.com/bmad-code-org/BMAD-METHOD)
- [Discord](https://discord.gg/gk8jAdXWmj)
