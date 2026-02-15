# 太白对接 Claude Code CLI 方案

**目的**：约定太白**默认提供**的 Claude Code CLI Agent 对接方式，使「以 CLI 形态运行的 Claude 编程助手」能经太白与天枢联络，纳入紫微治理（身份、指令下发、审计）。  
**版本**：v1.0 | **日期**：2026-02-15  
**引用**：《太白原理》；根技术方案 §4；《紫微平台层职责梳理》。

---

## 1. 目标与范围

- **目标**：太白默认提供 **Claude Code CLI Agent** 对接能力，使该 CLI 作为「可被天枢调度、按天枢规范回传」的智能体，开箱可用。
- **范围**：
  - **Claude Code CLI**：指以命令行形态运行的、基于 Claude 的代码/终端助手（如 Anthropic Claude Code、或兼容的 `claude`/`claude-code` 等 CLI），能接收自然语言或结构化任务、执行读文件/写文件/执行命令等、并返回结果。
  - **太白**：提供协议与 SDK，并**默认提供**与该 CLI 的适配器（发现天枢、注册、心跳、指令收发、可选操作上报），不实现 CLI 内部逻辑；执行仍在 CLI，监听效果经谛听机制达到。

---

## 2. 角色与边界

| 角色 | 职责 |
|------|------|
| **天枢** | 下发任务/指令给 Agent、汇聚响应；身份与路由。 |
| **太白** | 联络 Claude Code CLI 与天枢：发现、注册、心跳、**指令转发**、**响应按规范回传**；提供 Claude Code CLI 适配器默认实现。 |
| **Claude Code CLI** | 作为 Agent 本体：接收任务、执行（代码/命令/文件操作）、返回结果。不关心天枢协议，由太白适配器做协议转换。 |
| **谛听** | 一套机制达到监听效果；CLI 侧执行若经谛听（如 `/auth/exec`），则由谛听机制鉴权/审批/审计。 |

---

## 3. 架构概览

```
                    天枢（指令下发 / 响应汇聚）
                           │
                    发现、注册、心跳、收发
                           │
                    ┌──────▼──────┐
                    │ 太白适配器   │  常驻或按需进程
                    │ (Claude Code│  使用太白 SDK；
                    │  CLI Agent) │  协议转换、指令→CLI、CLI 输出→天枢
                    └──────┬──────┘
                           │ 调用 / 驱动
                    ┌──────▼──────┐
                    │ Claude Code │  实际执行：读文件、写文件、执行命令等
                    │    CLI      │
                    └─────────────┘
```

- **太白适配器**：与 verification_agent 不同，不仅做「发现+注册+心跳+一条上报」，而是**持续联络**：接收天枢下发的任务，转成 Claude Code CLI 可接受的输入（如一条自然语言指令或 JSON 任务描述），驱动 CLI 执行，收集 stdout/stderr 或结构化结果，按天枢约定格式回传；可选将「操作类型」上报谛听（如 `file_write`、`api_call`）。
- **Claude Code CLI**：视为黑盒，通过子进程、或 CLI 提供的 API/管道与其交互；适配器不修改 CLI 内部，只做「入参构造 + 输出解析」。

---

## 4. 数据流（对接流程）

1. **启动**  
   用户或系统启动「太白 Claude Code CLI Agent」进程（即适配器 + 内嵌/链式调用 CLI）。  
   适配器用太白 SDK：发现天枢 → 注册（owner 可配置）→ 周期性心跳。

2. **接收任务**  
   天枢通过 Matrix 或 HTTP 将任务下发给该 Agent（由天枢路由到已注册的 agent_id）。  
   适配器收到后，将任务内容转换为 Claude Code CLI 的输入格式（例如单条 prompt、或 `claude --task '...'` 的参数字符串），并调用 CLI。

3. **执行**  
   Claude Code CLI 在本地执行（读/写文件、执行命令等）。若执行命令前经谛听 `/auth/exec`，则由适配器或 CLI 侧集成在执行前请求谛听，按策略 allow/deny/review；执行仍由 CLI 完成。

4. **回传结果**  
   CLI 执行完毕，适配器收集输出（stdout/stderr 或 CLI 返回的结构化结果），按天枢约定的响应格式（如指定事件类型、载荷结构）经太白回传天枢。

5. **操作上报（可选）**  
   适配器可在关键操作后（如完成一次文件写入、一次命令执行）向谛听上报 `m.agent.action` 或等价 HTTP，便于审计与 Trace。

---

## 5. 实现形态建议（太白侧）

- **位置**：`taibai/adapters/claude_code_cli/` 或 `taibai/examples/claude_code_cli_agent/`，与 `examples/verification_agent` 并列；作为太白**默认提供**的预置适配器之一。
- **形态**（可择一或分阶段）：
  - **形态 A：CLI 包装脚本/入口**  
    提供一条命令（如 `taibai-claude-code-agent`），内部：加载太白 SDK → 发现/注册/心跳 → 若当前为「待机模式」则轮询或长连接收天枢任务 → 将任务转成对 Claude Code CLI 的调用（子进程或 shell）→ 收集输出并回传天枢。
  - **形态 B：常驻 Sidecar 进程**  
    适配器为常驻进程，与 Claude Code CLI 分离；适配器负责与天枢的收发，收到任务后通过本地 socket/管道/临时文件将任务交给 CLI，并读取 CLI 写回的结果文件或 socket 回复，再回传天枢。CLI 可由用户手动启动或由适配器按需 spawn。
  - **形态 C：插件/钩子**  
    若 Claude Code CLI 支持插件或钩子（如任务来源扩展），太白提供插件，在「任务输入」处注入来自天枢的任务，在「任务输出」处将结果交给插件再经太白回传。依赖 CLI 的扩展能力。

**推荐**：一期采用**形态 A（包装脚本）**，实现简单、不依赖 CLI 是否支持插件；后续若 CLI 开放 API 或插件，可演进为 B/C。

---

## 6. 配置与环境变量

与现有太白 SDK 及 verification_agent 对齐，并增加 Claude Code CLI 相关项：

| 变量 | 说明 | 示例 |
|------|------|------|
| `TIANSHU_API_BASE` | 天枢 API 根地址 | `http://localhost:8082` |
| `VERIFICATION_OWNER_ID` / `CLAUDE_CODE_AGENT_OWNER_ID` | 注册用 owner | `claude-code-owner` |
| `VERIFICATION_AGENT_ID` / `CLAUDE_CODE_AGENT_ID` | 已有 agent_id（可选） | 留空则每次注册新 ID |
| `DITING_AUDIT_URL` | 谛听审计上报（可选） | 留空则不上报 |
| `CLAUDE_CODE_CLI_PATH` | Claude Code CLI 可执行路径 | `claude` 或 `/usr/local/bin/claude-code` |
| `CLAUDE_CODE_CLI_ARGS` | 调用 CLI 时的默认参数（可选） | 如 `--model claude-3-5-sonnet` |

说明：与验证用智能体共用同一套天枢/谛听相关变量，通过不同示例目录或配置区分「仅验证」与「Claude Code CLI Agent」。

---

## 7. 与现有能力的关系

- **verification_agent**：仅做发现→注册→心跳→（可选）一条上报，用于**接入验证**，无持续任务收发。  
- **Claude Code CLI Agent（本方案）**：在 discovery/register/heartbeat 基础上，增加**持续接收天枢任务 → 驱动 CLI 执行 → 回传结果**，并可选上报操作至谛听，作为太白**默认提供的可执行 Agent** 形态之一。
- **根技术方案 §4.4 预置适配器**：将「Claude Code CLI」列入预置适配器表，实现方式为「太白 CLI 包装 / Sidecar，协议转换与天枢联络」，状态可为「规划/开发中」。

---

## 8. 验收与后续

- **验收**：在本地或 CI 中，天枢 + 太白适配器 + Claude Code CLI 同时就绪时，从天枢下发一条简单任务（如「列出当前目录」），适配器驱动 CLI 执行并将结果回传天枢，天枢侧能正确收到并按约定格式展示。
- **后续**：谛听执行鉴权（如执行命令前调 `/auth/exec`）在适配器或 CLI 侧集成；多任务队列、超时与重试策略可在适配器内迭代。

---

**文档结束**
