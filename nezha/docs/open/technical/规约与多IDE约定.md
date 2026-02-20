# 规约与多 IDE/CLI 约定

**版本**：v1.0  
**日期**：2026-02-16  
**目的**：约定「仓库规约」与具体 IDE/CLI 无关，**所有规约对 Cursor、Claude Code CLI、Codex 等均生效**；并定义**根目录统一 Agent 文档**，无需每次指定。

---

## 1. 根目录统一 Agent 文档（推荐）

- **文件**：仓库根目录 **`AGENTS.md`**
- **含义**：本仓库的「统一 Agent 规约」；**所有工具（Cursor、Claude Code CLI、Codex）只需加载此文件即可**，无需每次指定其他路径。
- **使用方式**：在各 IDE/CLI 中配置「默认读取项目根目录 AGENTS.md」（或仅指定该文件），即可让 Agent 自动遵循规约；无需再单独指定 `docs/open/technical/...`。

---

## 2. 原则

- **规约与工具解耦**：主仓与子项目、Git、文档归属、BMAD 等规约是**项目级约定**，不依赖 Cursor / Claude Code / Codex 任一产品；在任何一种环境中运行的 Agent 都必须遵守同一套规约。
- **单一入口**：根目录 **AGENTS.md** 为统一入口；其内容与 `docs/open/technical/紫微主仓与文档基础约定.md` 一致，完整版与修订在 docs 中维护。
- **各工具仅做「加载 AGENTS.md」**：`.cursor/`、`.claude/`、`.codex/` 等配置为「读取根目录 AGENTS.md」即可，无需维护多份规约或每次指定文档路径。

---

## 3. 权威规约文档位置（Canonical）

| 用途 | 路径 | 说明 |
|------|------|------|
| **统一 Agent 文档（默认加载）** | **根目录 `AGENTS.md`** | 所有工具默认或仅需指定此文件；内容与下方「主仓与文档基础」一致 |
| **主仓与文档、子项目、BMAD 基础** | `docs/open/technical/紫微主仓与文档基础约定.md` | 完整版与修订在此维护；AGENTS.md 与之同步 |
| **子项目任务与调度** | `docs/open/technical/子项目任务与Agent调度约定.md` | BMAD 角色、工作流对齐、子项目执行边界 |
| **主仓与子项目 Git** | `docs/open/technical/主仓与子项目Git说明.md` | 远程、推送、BMAD 输出由主仓跟踪等 |
| **跨子项目文档方案** | `docs/open/technical/紫微跨子项目文档方案-通用约定.md` | 文档归属、根与子项目 _bmad-output 约定 |

新增规约时，同步更新根目录 **AGENTS.md** 与 `docs/open/technical/紫微主仓与文档基础约定.md`，确保「只读 AGENTS.md」的 Agent 也能获得最新约定。

---

## 4. 各 IDE/CLI 加载方式（统一：读根目录 AGENTS.md）

所有工具**只需加载根目录 `AGENTS.md`**，无需每次指定其他文档。

### 4.1 Cursor

- **约定**：`.cursor/rules/` 下规则指示「始终加载并遵循根目录 `AGENTS.md`」。
- **实现**：`.cursor/rules/ziwei-repo-and-docs.mdc` 要求读取并遵守 `AGENTS.md`（项目根目录）。

### 4.2 Claude Code CLI

- **约定**：配置或项目内入口指示「会话开始或任务前读取根目录 `AGENTS.md` 并遵守」。
- **实现**：`.claude/project-context.md` 要求读取并遵守根目录 `AGENTS.md`。

### 4.3 Codex

- **约定**：预置 prompt 指示「读取根目录 `AGENTS.md` 并遵守」。
- **实现**：`.codex/prompts/repo-conventions.md` 要求读取并遵守根目录 `AGENTS.md`。

### 4.4 BMAD 与多 IDE

- **机制**：BMAD 已具备 `_bmad/_config/ides/`（cursor、claude-code、codex 等），用于各 IDE 的 BMAD 工作流与命令注册。
- **约定**：BMAD 的会话前置上下文可指向根目录 **AGENTS.md**，使通过 BMAD 启动的 Agent 在任意 IDE 下都加载同一规约（可选实现）。

### 4.5 子项目 agent.md 与自动加载（Cursor、Claude、Codex）

- **子项目自认约束**：各子项目（tianshu、xiezhi、taibai、wukong）在**其根目录**提供 **agent.md**，内容为该子项目自认的 Agent 规约（身份与职责、任务消费与获取、必守规约及参考文档）。
- **自动加载方式**（三种 IDE 均支持）：
  - **工作区为紫微主仓（ziwei）**：根目录 `.cursor/rules/subproject-agent-constraints.mdc` 约定，当当前文件或任务位于 `tianshu/`、`xiezhi/`、`taibai/`、`wukong/` 之一时，**同时加载**该子项目根目录的 **agent.md**，与根 **AGENTS.md** 一并遵守。
  - **工作区为子项目目录**（如单独打开 `ziwei/tianshu`）：该子项目下配置的 `.cursor/rules/agent-constraints.mdc`、`.claude/project-context.md`、`.codex/prompts/agent-constraints.md` 指示「读取并遵守本目录的 agent.md」；若存在上级根 **AGENTS.md**，一并遵守。
- **统一性**：Cursor、Claude Code CLI、Codex 任一种环境下，只要进入或打开子项目，即可自动读取对应 **agent.md** 约束，无需每次手动指定。

---

## 5. 业界常见做法对照

| 做法 | 说明 | 本仓采用 |
|------|------|----------|
| **CONTRIBUTING.md** | 开源项目常用，贡献者与机器人可读；多放在仓库根或 `docs/` | 技术规约放在 `docs/open/technical/`，与现有文档分类一致 |
| **单一 Markdown 权威** | 规约正文只在一份文档中维护，其余位置仅引用 | ✅ 权威文档为 `紫微主仓与文档基础约定.md` 等 |
| **各工具仅做加载器** | Cursor rules / Claude project context / Codex prompts 只指向权威路径 | ✅ |
| **AGENTS.md（根目录）** | 根目录统一 Agent 文档，多工具默认读取 | ✅ 本仓采用：根目录 **AGENTS.md** 为统一入口，所有工具只需加载此文件 |
| **.editorconfig** | 编辑器无关的格式约定（缩进、编码等） | 与「项目级行为规约」互补；格式类可继续用 .editorconfig |

---

## 6. 小结

- **统一入口**：根目录 **AGENTS.md** 为本仓库「统一 Agent 文档」；**无需每次指定**，所有工具（Cursor、Claude Code CLI、Codex）只需配置加载该文件即可。
- **所有规约对上述工具均生效**；规约正文在 AGENTS.md 与 `docs/open/technical/紫微主仓与文档基础约定.md` 中保持一致，完整版与修订在 docs 中维护。
- 新增或修改规约时：更新 `docs/open/technical/紫微主仓与文档基础约定.md`，并同步更新根目录 **AGENTS.md**；各 IDE 无需改配置。
