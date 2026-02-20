# 紫微仓库 · 统一 Agent 规约

**本文件为根目录「统一 Agent 文档」**：Cursor、Claude Code CLI、Codex 等均默认或通过最小配置加载此文件即可，**无需每次单独指定**。所有在本仓库中运行的 Agent 必须遵循以下规约。

> 完整版与修订历史见：`docs/open/technical/紫微主仓与文档基础约定.md`。多 IDE 加载方式见：`docs/open/technical/规约与多IDE约定.md`。

---

## 基础规范（必守）

- **子仓库均为 submodule**：天枢（tianshu）、谛听（diting）、太白（taibai）、**悟空（wukong）** 以及**源于 wukong 的子项目**在主仓中均以 **git submodule** 形式存在；子项目其余代码由子仓自行管理。
- **BMAD 文档按 BMAD 规范仍在子项目目录内**：各子项目的 BMAD 文档与产出（PRD、架构、Epics、`_bmad/`、`_bmad-output/planning-artifacts` 等）**依然按 BMAD 规范存放在该子项目目录下**（如 `tianshu/_bmad-output/`、`diting/_bmad/`），不挪到主仓根路径。
- **Git 层面**：子项目仓库在 `.gitignore` 中**忽略** `_bmad/`、`_bmad-output/`，不提交这些文档；**主仓**负责**跟踪并提交**各子项目下的 `_bmad/`、`_bmad-output/`，从而实现「文档在子项目里、版本由主仓管」。

## Git 提交原则

- **主项目与子项目一起提交**：每次提交时，必须同时检查并提交主项目和所有子项目（tianshu、diting、taibai、wukong）的更改，确保版本一致性。
- **提交前检查子项目状态**：使用 `git status` 分别检查主项目和每个子项目的修改情况，确保没有遗漏。

## 仓库与 Git

- **主仓（ziwei）**：推 NAS；跟踪根目录 `docs/`、`_bmad/`、`_bmad-output/`，以及各子项目目录下的 `_bmad/`、`_bmad-output/`；子项目其余代码不进入主仓。
- **子项目**：统一在 GitHub 组织 ZiweiAxis 下（或约定之组织），仓库名与模块名一致；在主仓中为 **submodule**。子仓 `.gitignore` 中忽略 `_bmad/`、`_bmad-output/`，不在子仓提交 BMAD 文档。

## 文档归属（docs/）

- **根权威技术文档**：放在 `ziwei/docs/open/technical/`。引用时使用路径 `ziwei/docs/open/technical/...`。
- **分类**：`open/`（technical、product、community、governance）、`business/`、`ip/`、`internal/`；详见 `docs/README.md`。

## 引用与一致性

- 子项目 PRD/架构/对齐文档**必须引用**根 `ziwei/docs/open/technical/紫微智能体治理基础设施-技术方案.md` 及根 planning-artifacts（若存在）；新建或修改根技术文档时放在 `docs/open/technical/`，并更新所有引用为 `ziwei/docs/open/technical/...`。

## 子项目 Agent 约束（agent.md）

- 各子项目（tianshu、diting、taibai、wukong）在其根目录提供 **agent.md**，为该子项目自认的规约（身份与职责、任务消费与获取、必守规约）。在子项目目录下工作时，**须同时加载并遵守该子项目的 agent.md**；Cursor、Claude、Codex 已配置为自动读取，见 `docs/open/technical/规约与多IDE约定.md` §4.5。

## 子项目任务与 Agent 调度

- **归属原则**：需在子项目内执行的任务，由**该子项目上下文下的 Agent 执行**，不在主仓 Agent 中代做子项目代码/配置修改。
- **自动调度**：在对应子项目目录（`ziwei/diting`、`ziwei/tianshu`、`ziwei/taibai`、`ziwei/wukong` 及源于 wukong 的子项目）下启动或切换会话，使 Agent 在该子项目的规则、ISSUE_LIST 及该子项目目录下的 `_bmad/`、`_bmad-output/` 执行；上述 BMAD 文档在 Git 上由主仓跟踪，子仓不提交。
- **BMAD 规范与角色**：子项目任务须**按 BMAD 规范校验**，并设置对应 BMAD 角色（PM/Architect/Dev/QA/SM 等）与工作流；详见 `docs/open/technical/子项目任务与Agent调度约定.md` §5。
