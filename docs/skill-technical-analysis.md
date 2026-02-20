# 技能系统技术分析报告

## 1. Claude Agent SDK (OpenClaw) Skill 机制

### 1.1 核心原理

OpenClaw 的 Skill 机制是**文档式**的，核心是：

```
用户请求 → Agent 自主读取 SKILL.md → 按文档指引执行
```

### 1.2 SKILL.md 格式

```yaml
---
name: skill-name
description: 技能描述，包含触发场景和使用时机
metadata:
  openclaw:
    requires:
      bins: ["curl"]  # 依赖的可执行文件
---

# 技能说明

## 触发条件
- 关键词: xxx

## 使用方法
按照以下步骤执行...

## 示例
```

### 1.3 工具调用流程

```
1. 用户: "帮我查天气"
2. Agent 分析意图 → 匹配 weather skill
3. Agent 读取 SKILL.md 内容作为上下文
4. Agent 按照文档指引执行（可能是自然语言描述的操作）
5. 如果需要执行命令，使用 exec 工具
6. 返回结果
```

### 1.4 与传统 Function Calling 的区别

| 维度 | OpenClaw (文档式) | Function Calling (GPTs) |
|------|------------------|------------------------|
| 定义 | SKILL.md + YAML frontmatter | JSON Schema |
| 触发 | Agent 自主读取 | API 强制格式 |
| 执行 | Agent 按文档指引 | 直接调用函数 |
| 灵活性 | 高 | 低 |

---

## 2. MiniMax API Function Calling 分析

### 2.1 MiniMax 支持的工具调用

根据文档，MiniMax M2.1 **支持** Anthropic 兼容的 tools 格式：

```json
{
  "tools": [
    {
      "type": "function",
      "function": {
        "name": "weather",
        "description": "查询天气",
        "parameters": {
          "type": "object",
          "properties": {
            "city": {"type": "string"}
          },
          "required": ["city"]
        }
      }
    }
  ]
}
```

### 2.2 当前问题：tools 返回空

测试发现：
- 发送 `tools=[]` → API 正常返回文本
- 发送 `tools=[{...}]` → API 返回空 (length: 0)

可能原因：
1. MiniMax API 对 tools 参数的处理有特殊限制
2. 需要特定的模型配置
3. API 版本/端点问题

### 2.3 解决方案

**方案 A: 文本解析模式（当前尝试）**
- 不发送 tools 给 API
- 让 LLM 在响应文本中生成调用格式
- 服务端解析并执行

**方案 B: 切换到 OpenAI 兼容端点**
- 使用 `https://api.minimax.io/v1` 而非 `/anthropic`
- 可能解决 tools 问题

---

## 3. 当前实现分析

### 3.1 已实现组件

| 组件 | 状态 | 说明 |
|------|------|------|
| SkillRegistry | ✅ | 扫描加载 SKILL.md |
| SkillLoader | ✅ | 转换为 Tool 格式 |
| SkillExecutor | ✅ | 执行 Skill 脚本 |
| 上下文注入 | ✅ | SKILL.md 内容注入到对话 |
| Tool Call 执行 | ⚠️ | MiniMax API 问题 |

### 3.2 工作流程（当前）

```
用户: "郑州天气怎么样"
    ↓
1. SkillLoader.find_by_intent() → 匹配 weather
2. 注入 SKILL.md 上下文到 messages
3. 发送 messages 给 MiniMax (tools=None)
4. MiniMax 返回: "我来帮你查天气 <invoke name='weather'>..."
5. 解析 <invoke> 标签
6. 执行 Skill
7. 返回结果
```

### 3.3 问题

第4步：MiniMax 返回空（当 tools 参数不为空时）
第5步：解析成功，但第6步没有执行循环

---

## 4. 推荐方案

### 4.1 短期：纯文本解析模式

不依赖 API 的 function calling，而是在响应中解析调用格式：

```python
# 从响应中提取
<invoke name="weather">
  <parameter name="city">郑州</parameter>
</invoke>

# 执行并返回结果
```

优点：
- 不依赖 API 的 tools 支持
- 兼容所有 LLM
- 实现简单

缺点：
- 依赖 prompt 让 LLM 生成特定格式
- 解析可能不稳定

### 4.2 长期：OpenAI 兼容端点

切换到 MiniMax 的 OpenAI 兼容端点：
- URL: `https://api.minimax.io/v1`
- API 格式: OpenAI 格式

可能解决 tools 问题。

---

## 5. 下一步

1. **调试当前文本解析流程** - 确保 Tool Call 能被正确解析和执行
2. **优化 Skill 文档** - 让 LLM 更可靠地生成调用格式
3. **考虑切换 API 端点** - 尝试 OpenAI 兼容模式

---

## 附录：MiniMax API 端点对比

| 端点 | 格式 | tools 支持 |
|------|------|------------|
| `https://api.minimax.io/anthropic` | Anthropic 兼容 | 有问题 |
| `https://api.minimax.io/v1` | OpenAI 兼容 | 待测试 |
