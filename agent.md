# 悟空（Wukong）子项目 Agent 约束

本文件为本子项目**自认的 Agent 行为约束**。在 Cursor、Claude Code CLI、Codex 中打开本子项目或在本目录下工作时，应自动加载并遵守本文件。若在紫微主仓（ziwei）下工作，须同时遵守根目录 **AGENTS.md**。

---

## 1. 身份与职责

- **悟空**：Agent 生命周期管理 CLI；宿主机侧运行，调用天枢 `POST /api/v1/agents/register`、`POST /api/v1/agents/heartbeat`；与一键启动后的天枢联通验证，不放入 docker-compose。
- 任务由天枢下发；悟空启动的 Agent 通过 Matrix Room 或拉取 API 消费任务。

---

## 2. 本子项目接到的开发任务：去哪里查

- **规划侧待办**（repo/文件）：本子项目 **ISSUE_LIST**（若有）、**_bmad-output/**；若可访问紫微主仓（ziwei），则还有根仓 **docs/open/technical/**、**_bmad-output/planning-artifacts/**（含《下一步执行清单》悟空节）。约定见 `ziwei/docs/open/technical/子项目任务下发与查看约定.md`。
- **与「Element + hulk 端到端」目标相关的具体任务**：见本仓库 **`wukong/docs/悟空-方案相关待办.md`**（W1～W3：Owner 标识与文档、注册待审批、启动的 Agent 能收指令并走谛听）。
- **运行态「要做的内容」**：当前由天枢通过 Matrix 等投递，见根仓 `子项目任务消费快速参考.md`、天枢 `tianshu/docs/任务与消费-实现状态.md`。
- 任务归属与调度见 `ziwei/docs/open/technical/子项目任务与Agent调度约定.md`。

---

## 3. 必守规约

- 代码与配置仅限 **本目录（wukong/）**；跨子项目改动由主仓或对应子项目 Agent 执行。
- 引用根技术文档时使用路径 **`ziwei/docs/open/technical/...`**。
- BMAD（若启用）：产出放在 `wukong/_bmad/`、`wukong/_bmad-output/`。

---

## 4. 参考

- 子项目任务下发与查看：`ziwei/docs/open/technical/子项目任务下发与查看约定.md`
- 子项目任务与 Agent 调度：`ziwei/docs/open/technical/子项目任务与Agent调度约定.md`
- 规约与多 IDE 约定：`ziwei/docs/open/technical/规约与多IDE约定.md`
