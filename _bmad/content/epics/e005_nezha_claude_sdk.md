# E005: 哪吒集成 Claude Agent SDK

## 概述

| 属性 | 值 |
|------|-----|
| Epic ID | E005 |
| 名称 | 哪吒集成 Claude Agent SDK |
| 描述 | 让哪吒能够调用 Claude Agent SDK 实现 AI Agent 能力 |
| 状态 | 🆕 新建 |
| 优先级 | P0 |
| 依赖方 | - |

## 背景

紫微系统需要具备 AI Agent 能力：
- **哪吒** 作为 Agent 执行器，需要能够调用 Claude Agent SDK
- Claude Agent SDK 提供完整的 Agent 循环能力（思考、工具调用、结果处理）
- 需要与现有太白 SDK 集成，实现消息的发送和接收

## 技术可行性分析

### 1. Claude Agent SDK 概述

**定位**：Anthropic 官方提供的智能体开发框架，把 Claude Code 的能力（读文件、运行命令、编辑代码、搜索网页等）封装成 SDK。

**核心特点**：
- 自主读取文件、运行 Bash、搜索网页、编辑代码等
- 内置工具体系（Read/Write/Edit/Bash/Glob/Grep/WebSearch 等）
- 智能体循环支持
- 工具权限控制
- 钩子（Hooks）在工具调用前后插入自定义逻辑
- MCP 服务器支持
- 提供 Python SDK 和 TypeScript SDK

### 2. 官方文档入口

- 中文：https://platform.claude.com/docs/zh-CN/agent-sdk/overview
- 英文：https://platform.claude.com/docs/en/agent-sdk/overview

### 3. 安装方式

**Python**：
```
pip install claude-agent-sdk
```

**TypeScript**：
```
npm install @anthropic-ai/claude-agent-sdk
```

### 4. 代码示例

**Python 最小示例**：
```python
import anyio
from claude_agent_sdk import query

async def main():
    async for message in query(prompt="What is 2 + 2?"):
        print(message)

anyio.run(main)
```

**Agent 循环示例**：
```python
import asyncio
from claude_agent_sdk import query, ClaudeAgentOptions, AssistantMessage, ResultMessage

async def main():
    async for message in query(
        prompt="Review utils.py for bugs and fix them.",
        options=ClaudeAgentOptions(
            allowed_tools=["Read", "Edit", "Glob"],
            permission_mode="acceptEdits"
        )
    ):
        if isinstance(message, AssistantMessage):
            print(message)

asyncio.run(main())
```

### 5. 关键配置

- `allowed_tools`：控制 Agent 能用哪些工具
- `permission_mode`：
  - `acceptEdits`：自动批准文件修改
  - `bypassPermissions`：完全自动批准
  - `default`：需要人工确认

### 6. 与紫微系统集成

**集成方案**：
1. 哪吒调用 Claude Agent SDK
2. 通过太白 SDK 实现消息收发
3. 工具注册机制对接紫微策略系统

## 目标

1. 实现哪吒调用 Claude Agent SDK
2. 支持工具（Tools）注册和执行
3. 实现 Agent 与天枢的消息互通
4. 支持流式输出和进度跟踪

## Stories

| Story | 名称 | 描述 |
|-------|------|------|
| S012 | Claude Agent SDK 调研 | 调研 Claude Agent SDK 功能和使用方式 |
| S013 | Agent 服务封装 | 封装 Agent 服务，提供统一调用接口 |
| S014 | 工具注册机制 | 实现工具注册机制，支持自定义工具 |
| S015 | 消息通道集成 | 实现 Agent 与天枢的消息互通 |

---

## 验收标准 (Acceptance Criteria)

- [ ] 哪吒能够成功调用 Claude Agent SDK
- [ ] 自定义工具能够注册和执行
- [ ] Agent 输出能够通过天枢发送
- [ ] 文档完整

## Definition of Done

- [ ] Claude Agent SDK 集成完成
- [ ] 至少 3 个内置工具可用
- [ ] 单元测试覆盖率 > 80%
- [ ] 集成测试通过
- [ ] 文档完整（README + API 文档）

---

## S012: Claude Agent SDK 调研

### 任务

- [ ] 调研 Claude Agent SDK 功能
- [ ] 分析集成方案
- [ ] 编写技术调研报告

### 调研要点

1. Claude Agent SDK 的核心 API
2. 工具（Tools）定义和注册方式
3. 流式输出的处理方式
4. 错误处理和重试机制

### 输出

- 技术调研报告
- 集成方案设计文档

---

## S013: Agent 服务封装

### 任务

- [ ] 实现 Agent 服务核心结构
- [ ] 封装 Claude Agent SDK 调用
- [ ] 实现请求/响应处理

### 实现要点

```go
type AgentService struct {
    client  *taibai.Client
    agent   *claude.Agent
    tools   map[string]Tool
}

type Tool interface {
    Name() string
    Description() string
    Execute(ctx context.Context, args map[string]interface{}) (interface{}, error)
}
```

### API 设计

| 方法 | 功能 |
|------|------|
| NewAgentService | 创建 Agent 服务实例 |
| Execute | 执行 Agent 请求 |
| RegisterTool | 注册自定义工具 |
| StreamExecute | 流式执行 Agent 请求 |

---

## S014: 工具注册机制

### 任务

- [ ] 定义工具接口
- [ ] 实现内置工具
- [ ] 实现自定义工具注册

### 内置工具

1. **SendMessage** - 发送消息到天枢
2. **GetUser** - 获取用户信息
3. **SearchKnowledge** - 搜索知识库

### 工具定义示例

```go
type ToolDefinition struct {
    Name        string `json:"name"`
    Description string `json:"description"`
    InputSchema schema `json:"input_schema"`
}
```

---

## S015: 消息通道集成

### 任务

- [ ] 实现 Agent 输出到天枢的消息发送
- [ ] 实现天枢消息到 Agent 的输入转换
- [ ] 支持流式输出

### 消息流程

```
用户消息 (天枢) → 哪吒 → Claude Agent SDK
                              ↓
                        工具执行
                              ↓
Agent 输出 → 天枢 → 用户消息
```

### 实现要点

1. 将天枢消息格式转换为 Agent 输入
2. 将 Agent 输出转换为天枢消息格式
3. 支持流式输出的实时推送

---

## 相关文档

- [太白 SDK 设计](../../docs/implementing/太白SDK设计.md)
- [Claude Agent SDK 官方文档](https://docs.anthropic.com/en/docs/claude-agent/overview)

---

## 技术可行性分析（完整版）

### 1. Claude Agent SDK 概述

**定位**：Anthropic 官方提供的智能体开发框架，把 Claude Code 的能力（读文件、运行命令、编辑代码、搜索网页等）封装成 SDK。

**核心特点**：
- 自主读取文件、运行 Bash、搜索网页、编辑代码等
- 内置工具体系（Read/Write/Edit/Bash/Glob/Grep/WebSearch 等）
- 智能体循环支持
- 工具权限控制（哪些工具可用、是否自动批准）
- 钩子（Hooks）在工具调用前后插入自定义逻辑
- MCP 服务器支持
- 提供 Python SDK 和 TypeScript SDK

### 2. 官方文档入口

- 中文：https://platform.claude.com/docs/zh-CN/agent-sdk/overview
- 英文：https://platform.claude.com/docs/en/agent-sdk/overview

### 3. 安装方式

**Python**：
```bash
pip install claude-agent-sdk
```

**TypeScript**：
```bash
npm install @anthropic-ai/claude-agent-sdk
```

### 4. 代码示例

**Python 最小示例**：
```python
import anyio
from claude_agent_sdk import query

async def main():
    async for message in query(prompt="What is 2 + 2?"):
        print(message)

anyio.run(main)
```

**Python Agent 循环示例**：
```python
import asyncio
from claude_agent_sdk import query, ClaudeAgentOptions, AssistantMessage, ResultMessage

async def main():
    async for message in query(
        prompt="Review utils.py for bugs and fix them.",
        options=ClaudeAgentOptions(
            allowed_tools=["Read", "Edit", "Glob"],
            permission_mode="acceptEdits"
        )
    ):
        if isinstance(message, AssistantMessage):
            print(message)

asyncio.run(main())
```

**自定义工具示例**：
```python
from claude_agent_sdk import tool, create_sdk_mcp_server, ClaudeAgentOptions, ClaudeSDKClient

@tool("greet", "Greet a user", {"name": str})
async def greet_user(args):
    return {"content": [{"type": "text", "text": f"Hello, {args['name']}!"}]}

server = create_sdk_mcp_server(
    name="my-tools",
    version="1.0.0",
    tools=[greet_user],
)
options = ClaudeAgentOptions(
    mcp_servers={"tools": server},
    allowed_tools=["mcptoolsgreet"],
)
```

**钩子示例（安全校验）**：
```python
from claude_agent_sdk import ClaudeAgentOptions, ClaudeSDKClient, HookMatcher

async def check_bash_command(input_data, tool_use_id, context):
    if input_data["tool_name"] != "Bash":
        return {}
    command = input_data["tool_input"].get("command", "")
    if "foo.sh" in command:
        return {
            "hookSpecificOutput": {
                "hookEventName": "PreToolUse",
                "permissionDecision": "deny",
                "permissionDecisionReason": "Command contains forbidden pattern",
            }
        }
    return {}

options = ClaudeAgentOptions(
    allowed_tools=["Bash"],
    hooks={
        "PreToolUse": [
            HookMatcher(matcher="Bash", hooks=[check_bash_command]),
        ],
    },
)
```

### 5. 关键配置

- `allowed_tools`：控制 Agent 能用哪些工具
- `permission_mode`：
  - `acceptEdits`：自动批准文件修改
  - `bypassPermissions`：完全自动批准
  - `default`：需要人工确认
- `mcp_servers`：外部 MCP 服务器配置

### 6. 典型使用场景

1. **代码工程自动化**：代码审查、修复 bug、添加文档、生成测试
2. **企业级智能体工作流**：连接内部系统（CRM、工单、知识库）
3. **研究与信息收集**：自动搜索整理资料、竞品分析
4. **DevOps 助手**：日志查看、错误定位、运维脚本执行
5. **交互式编程助手**：结对编程、Git 集成

### 7. 与紫微系统集成

**集成方案**：
1. 哪吒调用 Claude Agent SDK
2. 通过太白 SDK 实现消息收发
3. 工具注册机制对接紫微策略系统
4. 使用 Hooks 实现安全审批

**消息流程**：
```
用户消息 (天枢) → 哪吒 → Claude Agent SDK
                              ↓
                        工具执行
                              ↓
Agent 输出 → 天枢 → 用户消息
```
