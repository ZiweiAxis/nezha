# BMAD 模式 AI 对话结束识别研究分析报告

## 一、现状分析

### 1.1 当前工作流架构

通过分析 `~/workspace/ziwei/_bmad/core/workflows/party-mode/` 和 `advanced-elicitation`，发现：

**Party Mode 核心特性：**
- 多 Agent 协作讨论框架
- 基于用户输入驱动的交互模式
- 智能 Agent 选择机制（2-3 个 Agent 响应）
- 角色扮演一致性维护

**现有退出机制：**
```markdown
退出触发器（exit_triggers）：['*exit', 'goodbye', 'end party', 'quit']
用户选择 [E] 退出
```

### 1.2 存在的问题

**当前退出机制完全依赖：**
1. 用户主动选择 [E] 选项
2. 用户发送退出关键词

**缺失的能力：**
- ❌ 对话轮次计数上限
- ❌ 时间限制
- ❌ 共识/收敛检测
- ❌ 静默期检测
- ❌ 自动退出提醒

---

## 二、结束条件识别方案

### 2.1 轮次上限（Round Limit）

**原理：** 设置最大对话轮次，达到后自动结束

**配置参数：**
```yaml
bmad:
  party_mode:
    max_rounds: 10        # 默认 10 轮对话
    warn_at: 8            # 第 8 轮提醒用户
```

**触发逻辑：**
```
IF current_round >= max_rounds:
    → 触发自动退出流程
    → 显示 "已达到最大对话轮次"
    → 执行优雅退出
```

### 2.2 时间限制（Time Limit）

**原理：** 设置会话最长时间，到期自动结束

**配置参数：**
```yaml
bmad:
  party_mode:
    max_duration_minutes: 30
    warn_at_minutes: 25
```

**触发逻辑：**
```
IF elapsed_time >= max_duration_minutes:
    → 触发自动退出流程
    → 显示 "会话时间已达上限"
```

### 2.3 共识检测（Consensus Detection）

**原理：** 当多个 Agent 的观点趋于一致时，视为达成共识

**实现方法：**
1. **语义相似度检测：**
   - 对比最近 N 轮中 Agent 观点的语义嵌入
   - 计算余弦相似度
   - 阈值判断（相似度 > 0.85）

2. **关键词收敛检测：**
   - 追踪高频关键词
   - 当关键分歧点消失时判定收敛

**示例配置：**
```yaml
bmad:
  consensus:
    enabled: true
    similarity_threshold: 0.85
    lookback_rounds: 3
    convergence_indicator: "agreed|consensus|exactly"
```

### 2.4 静默期检测（Silence Detection）

**原理：** 当用户或 Agent 长时间无新内容输入时结束

**检测维度：**
1. **用户静默：** 用户 N 分钟无输入
2. **内容重复：** 连续 M 轮对话内容高度相似

**配置参数：**
```yaml
bmad:
  silence_detection:
    user_timeout_minutes: 5
    content_similarity_threshold: 0.9
    consecutive_similar_rounds: 3
```

### 2.5 用户主动干预

**现有实现：**
- 退出关键词检测
- [E] 菜单选项

**可扩展：**
- 投票中断（用户投票结束）
- 优先级中断（特定用户命令）

---

## 三、技术实现方案

### 3.1 状态跟踪机制

在 frontmatter 中添加对话状态追踪：

```yaml
---
workflowType: 'party-mode'
conversation_state:
  current_round: 5
  started_at: "2026-02-19T10:00:00Z"
  last_activity_at: "2026-02-19T10:25:00Z"
  consensus_reached: false
  silence_count: 0
  exit_flags:
    round_limit: false
    time_limit: false
    consensus: false
    silence: false
    user_requested: false
---
```

### 3.2 核心检测模块

**建议文件结构：**
```
_bmad/core/workflows/party-mode/
├── workflow.md
├── steps/
│   ├── step-01-agent-loading.md
│   ├── step-02-discussion-orchestration.md
│   ├── step-03-graceful-exit.md
│   └── (NEW) step-00-check-termination.md  # 新增：结束条件检查
```

**step-00-check-termination.md 逻辑：**
```markdown
# 步骤 0: 对话结束条件检查

## 检查项目

### 1. 轮次检查
- 读取 frontmatter `conversation_state.current_round`
- IF current_round >= max_rounds: 设置 exit_flags.round_limit = true

### 2. 时间检查
- 计算 elapsed_time = now - started_at
- IF elapsed_time >= max_duration: 设置 exit_flags.time_limit = true

### 3. 共识检查
- 分析最近 N 轮对话内容
- 计算 Agent 观点相似度
- IF similarity > threshold: 设置 exit_flags.consensus = true

### 4. 静默检查
- 检查用户活跃时间
- 检查内容重复度
- IF silence detected: 设置 exit_flags.silence = true

### 5. 综合判定
IF any exit_flag is true:
    → 加载 step-03-graceful-exit.md
ELSE:
    → 继续 step-02-discussion-orchestration.md
```

### 3.3 配置参数设计

**全局配置（config.yaml）：**
```yaml
bmad:
  party_mode:
    # 对话限制
    max_rounds: 10
    max_duration_minutes: 30
    
    # 警告阈值
    warn_at_rounds: 8
    warn_at_minutes: 25
    
    # 共识检测
    consensus:
      enabled: true
      threshold: 0.85
      lookback: 3
    
    # 静默检测
    silence:
      enabled: true
      user_timeout_minutes: 5
      content_similarity: 0.9
      
    # 退出触发
    exit_triggers:
      - "*exit"
      - "goodbye" 
      - "end party"
      - "quit"
```

### 3.4 消息提示设计

**警告提示（达到阈值时）：**
```
🔔 提示：对话已进行 8 轮（上限 10 轮）
💡 您可以选择继续或输入 [E] 退出
```

**自动退出提示：**
```
⏰ 已达到最大对话轮次（10 轮）
🎊 感谢参与！正在结束对话...
```

---

## 四、BMAD 工作流集成

### 4.1 修改现有流程

**step-02-discussion-orchestration.md 改造：**

```markdown
## 修改：在每轮对话后添加结束检查

### 7. Exit Condition Checking (扩展)

#### 7.1 基础检查（现有）
- 用户消息包含退出关键词
- 用户选择 [E]

#### 7.2 自动检查（新增）
加载 `./step-00-check-termination.md` 执行：
- 轮次上限检查
- 时间限制检查  
- 共识检测
- 静默检测

IF 任何自动退出条件满足:
    → 显示结束提示
    → 加载 step-03-graceful-exit.md
```

### 4.2 实现优先级

**Phase 1（基础）：**
- 轮次上限检测（最简单可靠）
- 用户退出关键词检测

**Phase 2（增强）：**
- 时间限制检测
- 用户警告提示

**Phase 3（高级）：**
- 共识检测
- 静默检测

### 4.3 向后兼容性

**设计原则：**
- 默认关闭自动退出（保持现有行为）
- 通过配置启用
- 用户可随时覆盖

```yaml
bmad:
  party_mode:
    auto_exit_enabled: false  # 默认不启用
    
# 用户可通过配置或命令启用
```

---

## 五、推荐实现方式

### 5.1 最小可行实现（Phase 1）

只需修改 `step-02-discussion-orchestration.md`：

```markdown
### 6. Response Round Completion

[EXISTING: 显示菜单选项]

### 7. Round Counter Update (NEW)

- 读取当前轮次: `current_round`
- 更新: `current_round = current_round + 1`
- 更新 frontmatter

### 8. Exit Condition Checking

IF current_round >= max_rounds (默认 10):
    显示 "已达到最大对话轮次"
    加载 step-03-graceful-exit.md
    HALT

[CONTINUE WITH EXISTING EXIT CHECKS]
```

### 5.2 完整实现建议

创建独立的状态管理模块：

```
_bmad/core/lib/
└── conversation_manager.py  # 对话状态管理
    - check_termination_conditions()
    - update_conversation_state()
    - detect_consensus()
    - detect_silence()
```

---

## 六、总结

### 6.1 方案对比

| 方案 | 可靠性 | 实现复杂度 | 用户体验 | 推荐度 |
|------|--------|------------|----------|--------|
| 轮次上限 | ⭐⭐⭐⭐⭐ | 低 | 好 | ⭐⭐⭐⭐⭐ |
| 时间限制 | ⭐⭐⭐⭐ | 中 | 好 | ⭐⭐⭐⭐ |
| 共识检测 | ⭐⭐⭐ | 高 | 需测试 | ⭐⭐⭐ |
| 静默检测 | ⭐⭐⭐ | 中 | 一般 | ⭐⭐ |

### 6.2 核心建议

1. **立即实施：** 轮次上限检测（简单可靠）
2. **短期增强：** 添加时间限制和警告提示
3. **长期探索：** 共识检测（需要更多测试）

### 6.3 输出产物

建议创建以下文件：
- `workflows/party-mode/config.yaml` - 退出条件配置
- `workflows/party-mode/steps/step-00-check-termination.md` - 结束检查步骤

---

*报告生成时间: 2026-02-19*
*分析基于: ~/workspace/ziwei/_bmad/core/workflows/*
