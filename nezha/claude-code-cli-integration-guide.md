# Claude Code CLI 编程调用完整方案

## 概述

Claude Code 是 Anthropic 官方提供的命令行工具，支持交互式和非交互式（编程）调用。本文档详细说明如何在程序中调用 Claude Code CLI。

## 安装信息

- **包名**: `@anthropic-ai/claude-code`
- **当前版本**: 2.1.42
- **安装命令**: `npm install -g @anthropic-ai/claude-code`
- **可执行文件**: `claude`
- **Node.js 要求**: >= 18.0.0

## 核心调用方式

### 1. 非交互式模式（--print）

这是编程调用的主要方式，适合脚本和自动化场景。

#### 基本用法

```bash
claude --print "你的提示词"
```

#### 示例

```bash
# 简单问答
claude --print "What is 2+2?"
# 输出: 4

# 代码生成
claude --print "Write a Python function to calculate fibonacci"

# 文件操作（需要在项目目录中）
cd /path/to/project
claude --print "Read the README.md and summarize it"
```

### 2. 绕过嵌套检查

Claude Code 默认不允许在已有会话中嵌套运行。如需在 Claude Code 会话内调用，需要取消 `CLAUDECODE` 环境变量：

```bash
env -u CLAUDECODE claude --print "你的提示词"
```

### 3. 输出格式控制

#### 文本输出（默认）

```bash
claude --print "What is the capital of France?"
# 输出: The capital of France is Paris.
```

#### JSON 输出

```bash
claude --print --output-format json "What is 2+2?"
```

输出结构：
```json
{
  "type": "result",
  "subtype": "success",
  "is_error": false,
  "duration_ms": 9245,
  "duration_api_ms": 8906,
  "num_turns": 1,
  "result": "\n\nThe capital of France is Paris.",
  "stop_reason": null,
  "session_id": "de4f8738-e376-4de6-a66c-91151a45a342",
  "total_cost_usd": 0.044398,
  "usage": {
    "input_tokens": 2333,
    "cache_creation_input_tokens": 4340,
    "cache_read_input_tokens": 5366,
    "output_tokens": 117,
    "service_tier": "standard"
  },
  "modelUsage": {
    "claude-sonnet-4-5-20250929": {
      "inputTokens": 2333,
      "outputTokens": 117,
      "cacheReadInputTokens": 5366,
      "cacheCreationInputTokens": 4340,
      "costUSD": 0.044398
    }
  }
}
```

#### 流式 JSON 输出

```bash
claude --print --output-format stream-json --verbose "你的提示词"
```

流式输出会实时返回多个 JSON 对象，包括：
- 系统初始化信息
- 思考过程（thinking）
- 响应内容
- 最终结果统计

### 4. 模型选择

```bash
# 使用 Haiku（快速、低成本）
claude --print --model haiku "Quick calculation: 3+3?"

# 使用 Sonnet（默认，平衡性能）
claude --print --model sonnet "Analyze this code"

# 使用 Opus（最强大）
claude --print --model opus "Complex reasoning task"

# 使用完整模型名称
claude --print --model claude-sonnet-4-5-20250929 "Your prompt"
```

### 5. 会话管理

#### 继续最近的会话

```bash
claude --continue --print "继续之前的对话"
# 或简写
claude -c -p "继续之前的对话"
```

#### 恢复特定会话

```bash
# 通过会话 ID
claude --resume <session-id> --print "新的提示"

# 交互式选择会话
claude --resume --print "新的提示"
```

#### 指定会话 ID

```bash
claude --session-id <uuid> --print "你的提示词"
```

### 6. 工具和权限控制

#### 限制可用工具

```bash
# 只允许特定工具
claude --print --tools "Bash,Read,Write" "你的提示词"

# 禁用所有工具
claude --print --tools "" "你的提示词"

# 使用默认工具集
claude --print --tools "default" "你的提示词"
```

#### 允许/禁止特定工具

```bash
# 允许特定工具和命令
claude --print --allowed-tools "Bash(git:*) Edit" "你的提示词"

# 禁止特定工具
claude --print --disallowed-tools "Bash(rm:*) Write" "你的提示词"
```

#### 权限模式

```bash
# 自动接受编辑
claude --print --permission-mode acceptEdits "你的提示词"

# 绕过所有权限检查（仅用于沙箱环境）
claude --print --dangerously-skip-permissions "你的提示词"

# 计划模式（需要用户批准）
claude --print --permission-mode plan "你的提示词"
```

### 7. 系统提示词定制

```bash
# 替换系统提示词
claude --print --system-prompt "You are a Python expert" "Write a decorator"

# 追加系统提示词
claude --print --append-system-prompt "Always use type hints" "Write a function"
```

### 8. 预算和成本控制

```bash
# 设置最大预算（美元）
claude --print --max-budget-usd 0.10 "你的提示词"
```

### 9. 结构化输出（JSON Schema）

```bash
# 使用 JSON Schema 验证输出
claude --print --json-schema '{"type":"object","properties":{"name":{"type":"string"},"age":{"type":"number"}},"required":["name","age"]}' "Extract person info from: John is 30 years old"
```

### 10. MCP 服务器集成

```bash
# 加载 MCP 配置
claude --print --mcp-config /path/to/mcp-config.json "你的提示词"

# 加载多个 MCP 配置
claude --print --mcp-config config1.json config2.json "你的提示词"

# 仅使用指定的 MCP 配置
claude --print --strict-mcp-config --mcp-config config.json "你的提示词"
```

### 11. 调试模式

```bash
# 启用调试模式
claude --print --debug "你的提示词"

# 过滤调试类别
claude --print --debug "api,hooks" "你的提示词"

# 排除特定类别
claude --print --debug "!1p,!file" "你的提示词"

# 输出到文件
claude --print --debug-file /tmp/claude-debug.log "你的提示词"
```

## 编程语言集成示例

### Python

```python
import subprocess
import json

def call_claude(prompt, model="sonnet", output_format="json"):
    """调用 Claude Code CLI"""
    cmd = [
        "claude",
        "--print",
        "--output-format", output_format,
        "--model", model,
        prompt
    ]

    # 如果在 Claude Code 会话中运行，需要取消环境变量
    env = os.environ.copy()
    env.pop('CLAUDECODE', None)

    result = subprocess.run(
        cmd,
        capture_output=True,
        text=True,
        env=env,
        timeout=60
    )

    if output_format == "json":
        return json.loads(result.stdout)
    return result.stdout

# 使用示例
response = call_claude("What is 2+2?", model="haiku")
print(response['result'])  # 输出: 4

# 带工具限制
def call_claude_safe(prompt):
    cmd = [
        "claude", "--print",
        "--tools", "Read,Grep,Glob",  # 只允许读取操作
        "--output-format", "json",
        prompt
    ]
    env = os.environ.copy()
    env.pop('CLAUDECODE', None)
    result = subprocess.run(cmd, capture_output=True, text=True, env=env)
    return json.loads(result.stdout)
```

### Node.js

```javascript
const { spawn } = require('child_process');

function callClaude(prompt, options = {}) {
    return new Promise((resolve, reject) => {
        const args = [
            '--print',
            '--output-format', options.format || 'json',
            '--model', options.model || 'sonnet',
            prompt
        ];

        const env = { ...process.env };
        delete env.CLAUDECODE;  // 绕过嵌套检查

        const claude = spawn('claude', args, { env });

        let stdout = '';
        let stderr = '';

        claude.stdout.on('data', (data) => {
            stdout += data.toString();
        });

        claude.stderr.on('data', (data) => {
            stderr += data.toString();
        });

        claude.on('close', (code) => {
            if (code !== 0) {
                reject(new Error(`Claude exited with code ${code}: ${stderr}`));
            } else {
                try {
                    const result = options.format === 'json'
                        ? JSON.parse(stdout)
                        : stdout;
                    resolve(result);
                } catch (e) {
                    reject(e);
                }
            }
        });
    });
}

// 使用示例
(async () => {
    const response = await callClaude('What is 2+2?', { model: 'haiku' });
    console.log(response.result);
})();
```

### Bash

```bash
#!/bin/bash

# 简单封装函数
call_claude() {
    local prompt="$1"
    local model="${2:-sonnet}"

    env -u CLAUDECODE claude --print \
        --output-format json \
        --model "$model" \
        "$prompt"
}

# 使用示例
result=$(call_claude "What is 2+2?" "haiku")
echo "$result" | jq -r '.result'

# 带错误处理
call_claude_safe() {
    local prompt="$1"
    local output

    output=$(env -u CLAUDECODE claude --print \
        --tools "Read,Grep,Glob" \
        --max-budget-usd 0.05 \
        --output-format json \
        "$prompt" 2>&1)

    if [ $? -eq 0 ]; then
        echo "$output"
    else
        echo "Error: $output" >&2
        return 1
    fi
}
```

### Go

```go
package main

import (
    "encoding/json"
    "fmt"
    "os/exec"
    "os"
)

type ClaudeResponse struct {
    Type      string  `json:"type"`
    Result    string  `json:"result"`
    IsError   bool    `json:"is_error"`
    TotalCost float64 `json:"total_cost_usd"`
}

func callClaude(prompt string, model string) (*ClaudeResponse, error) {
    cmd := exec.Command("claude",
        "--print",
        "--output-format", "json",
        "--model", model,
        prompt,
    )

    // 取消 CLAUDECODE 环境变量
    env := os.Environ()
    var newEnv []string
    for _, e := range env {
        if !strings.HasPrefix(e, "CLAUDECODE=") {
            newEnv = append(newEnv, e)
        }
    }
    cmd.Env = newEnv

    output, err := cmd.Output()
    if err != nil {
        return nil, err
    }

    var response ClaudeResponse
    err = json.Unmarshal(output, &response)
    if err != nil {
        return nil, err
    }

    return &response, nil
}

func main() {
    response, err := callClaude("What is 2+2?", "haiku")
    if err != nil {
        panic(err)
    }
    fmt.Println(response.Result)
}
```

## 高级用法

### 1. 流式处理

```python
import subprocess
import json

def stream_claude(prompt):
    """流式处理 Claude 响应"""
    cmd = [
        "claude", "--print",
        "--output-format", "stream-json",
        "--verbose",
        prompt
    ]

    env = os.environ.copy()
    env.pop('CLAUDECODE', None)

    process = subprocess.Popen(
        cmd,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        env=env
    )

    for line in process.stdout:
        if line.strip():
            try:
                event = json.loads(line)
                if event['type'] == 'assistant':
                    # 处理助手消息
                    content = event['message']['content']
                    for item in content:
                        if item['type'] == 'text':
                            print(item['text'], end='', flush=True)
            except json.JSONDecodeError:
                continue

    process.wait()

# 使用
stream_claude("Explain quantum computing")
```

### 2. 批量处理

```python
import concurrent.futures
import subprocess
import json

def process_prompt(prompt):
    """处理单个提示词"""
    cmd = ["claude", "--print", "--output-format", "json", "--model", "haiku", prompt]
    env = os.environ.copy()
    env.pop('CLAUDECODE', None)
    result = subprocess.run(cmd, capture_output=True, text=True, env=env)
    return json.loads(result.stdout)

# 并行处理多个提示词
prompts = [
    "What is 2+2?",
    "What is 3+3?",
    "What is 4+4?",
]

with concurrent.futures.ThreadPoolExecutor(max_workers=3) as executor:
    results = list(executor.map(process_prompt, prompts))

for prompt, result in zip(prompts, results):
    print(f"{prompt} => {result['result']}")
```

### 3. 会话持久化

```python
class ClaudeSession:
    def __init__(self, session_id=None):
        self.session_id = session_id

    def chat(self, prompt, continue_session=True):
        cmd = ["claude", "--print", "--output-format", "json"]

        if continue_session and self.session_id:
            cmd.extend(["--resume", self.session_id])
        elif self.session_id:
            cmd.extend(["--session-id", self.session_id])

        cmd.append(prompt)

        env = os.environ.copy()
        env.pop('CLAUDECODE', None)

        result = subprocess.run(cmd, capture_output=True, text=True, env=env)
        response = json.loads(result.stdout)

        # 保存会话 ID
        if not self.session_id:
            self.session_id = response.get('session_id')

        return response['result']

# 使用
session = ClaudeSession()
print(session.chat("My name is Alice"))
print(session.chat("What's my name?"))  # 会记住上下文
```

## 最佳实践

### 1. 错误处理

```python
def call_claude_with_retry(prompt, max_retries=3):
    for attempt in range(max_retries):
        try:
            cmd = ["claude", "--print", "--output-format", "json", prompt]
            env = os.environ.copy()
            env.pop('CLAUDECODE', None)

            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                env=env,
                timeout=60
            )

            if result.returncode != 0:
                raise Exception(f"Claude failed: {result.stderr}")

            response = json.loads(result.stdout)

            if response.get('is_error'):
                raise Exception(f"Claude error: {response.get('result')}")

            return response

        except subprocess.TimeoutExpired:
            if attempt == max_retries - 1:
                raise
            print(f"Timeout, retrying... ({attempt + 1}/{max_retries})")
        except Exception as e:
            if attempt == max_retries - 1:
                raise
            print(f"Error: {e}, retrying... ({attempt + 1}/{max_retries})")
```

### 2. 成本监控

```python
class CostTracker:
    def __init__(self, max_cost=1.0):
        self.total_cost = 0.0
        self.max_cost = max_cost

    def call_claude(self, prompt, **kwargs):
        if self.total_cost >= self.max_cost:
            raise Exception(f"Cost limit reached: ${self.total_cost:.4f}")

        response = call_claude(prompt, **kwargs)
        cost = response.get('total_cost_usd', 0)
        self.total_cost += cost

        print(f"Request cost: ${cost:.4f}, Total: ${self.total_cost:.4f}")
        return response

# 使用
tracker = CostTracker(max_cost=0.50)
tracker.call_claude("Analyze this code", model="haiku")
```

### 3. 安全沙箱

```python
def call_claude_sandboxed(prompt):
    """在受限环境中调用 Claude"""
    cmd = [
        "claude", "--print",
        "--tools", "Read,Grep,Glob",  # 只允许读取
        "--disallowed-tools", "Bash",  # 禁止执行命令
        "--max-budget-usd", "0.05",    # 限制成本
        "--output-format", "json",
        prompt
    ]

    env = os.environ.copy()
    env.pop('CLAUDECODE', None)

    # 限制工作目录
    result = subprocess.run(
        cmd,
        capture_output=True,
        text=True,
        env=env,
        cwd="/safe/directory",
        timeout=30
    )

    return json.loads(result.stdout)
```

## 常见问题

### 1. 嵌套会话错误

**问题**: `Error: Claude Code cannot be launched inside another Claude Code session`

**解决**: 使用 `env -u CLAUDECODE` 取消环境变量

```bash
env -u CLAUDECODE claude --print "your prompt"
```

### 2. 权限被拒绝

**问题**: Claude 请求权限但在非交互模式下无法响应

**解决**: 使用适当的权限模式

```bash
# 自动接受编辑
claude --print --permission-mode acceptEdits "your prompt"

# 或在沙箱中绕过权限
claude --print --dangerously-skip-permissions "your prompt"
```

### 3. 超时问题

**问题**: 长时间运行的任务超时

**解决**: 增加超时时间或使用会话恢复

```python
# 增加超时
subprocess.run(cmd, timeout=300)  # 5 分钟

# 或使用会话恢复
session_id = response['session_id']
# 稍后恢复
claude --resume {session_id} --print "continue"
```

### 4. 成本控制

**问题**: API 调用成本过高

**解决**: 使用预算限制和更便宜的模型

```bash
# 使用 Haiku 模型（最便宜）
claude --print --model haiku --max-budget-usd 0.10 "your prompt"
```

## 工具能力

Claude Code 在 `--print` 模式下可以使用以下工具：

- **Task**: 启动子代理
- **TaskOutput**: 获取任务输出
- **Bash**: 执行 shell 命令
- **Glob**: 文件模式匹配
- **Grep**: 代码搜索
- **Read**: 读取文件
- **Edit**: 编辑文件
- **Write**: 写入文件
- **NotebookEdit**: 编辑 Jupyter notebook
- **WebFetch**: 获取网页内容
- **WebSearch**: 网页搜索
- **TaskStop**: 停止后台任务
- **AskUserQuestion**: 询问用户（交互模式）
- **Skill**: 执行技能/插件
- **EnterPlanMode**: 进入计划模式
- **ToolSearch**: 搜索可用工具

## 性能优化建议

1. **选择合适的模型**:
   - 简单任务用 `haiku`（快速、便宜）
   - 复杂任务用 `sonnet`（平衡）
   - 最复杂任务用 `opus`（最强）

2. **使用 JSON 输出**: 便于解析和处理

3. **限制工具集**: 只启用需要的工具，提高安全性和性能

4. **会话复用**: 对于多轮对话，复用会话 ID 可以利用缓存

5. **并行处理**: 独立的提示词可以并行处理

6. **成本监控**: 使用 `--max-budget-usd` 和 JSON 输出中的成本信息

## 参考资源

- **官方文档**: https://code.claude.com/docs/en/overview
- **GitHub**: https://github.com/anthropics/claude-code
- **NPM**: https://www.npmjs.com/package/@anthropic-ai/claude-code
- **Discord 社区**: https://anthropic.com/discord

## 总结

Claude Code CLI 提供了强大的编程接口，通过 `--print` 模式可以轻松集成到各种自动化工作流中。关键要点：

1. 使用 `--print` 进行非交互式调用
2. 使用 `--output-format json` 获取结构化输出
3. 通过 `env -u CLAUDECODE` 绕过嵌套检查
4. 选择合适的模型平衡性能和成本
5. 使用权限模式和工具限制确保安全
6. 实施错误处理和成本监控

这个方案可以满足从简单脚本到复杂自动化系统的各种需求。
