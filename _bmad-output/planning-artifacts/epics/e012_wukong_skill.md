# E012: 悟空 Skill 支持

## 概述

| 属性 | 值 |
|------|-----|
| Epic ID | E012 |
| 名称 | 悟空 Skill 支持 |
| 描述 | 实现悟空 Agent 的 Skill 能力，支持自定义工具和技能 |
| 状态 | 🚧 进行中 |
| 优先级 | P1 |
| 依赖 | E007, E008 |

## 背景

Claude Agent SDK (OpenClaw) 的 Skill 机制是**文档式**的。Agent 根据用户意图自主读取 SKILL.md，按照文档指引执行操作。

## 技术方案 (文档式)

### 1. Skill 定义格式

沿用 OpenClaw 风格 (SKILL.md)：

```
skill-name/
├── SKILL.md              # 元数据 + 指引文档 (YAML frontmatter)
├── scripts/              # 可执行脚本
│   └── execute.py
└── references/           # 参考文档
    └── guide.md
```

### 2. SKILL.md 格式

```yaml
---
name: skill-name
description: Skill 描述，包含触发场景和用途
---

# Skill 名称

## 触发条件
- 关键词: xxx, xxx
- 使用场景: xxx

## 使用方法
按照以下步骤执行...

## 示例
```

### 3. 架构设计 (文档式)

```
用户消息 → LLM 意图识别
    ↓
匹配 Skill → 读取 SKILL.md
    ↓
LLM 按照文档指引执行
    ↓
返回结果
```

### 4. 与函数式方案的对比

| 维度 | 文档式 (OpenClaw) | 函数式 (GPTs) |
|------|-------------------|----------------|
| 定义方式 | SKILL.md + 自然语言 | SKILL.yaml + JSON Schema |
| 触发机制 | Agent 自主读取 | Tool Call 强制调用 |
| 灵活性 | 高 | 低 |
| 可控性 | 较低 | 高 |
| 策略集成 | 执行中拦截 | 调用前拦截 |

## Stories

| Story | 名称 | 状态 | 工作量 |
|-------|------|------|--------|
| S051 | Skill 注册表实现 | ✅ | 3 |
| S052 | Skill 加载器 | 🔄 改造中 | 2 |
| S053 | Skill 执行器 | 🔄 改造中 | 5 |
| S054 | LLM 集成 | 🔄 改造中 | 3 |
| S055 | 策略集成 | 🆕 | 3 |

## 验收标准

- [ ] Skill 可通过目录自动发现
- [ ] Agent 自主读取 SKILL.md 执行
- [ ] 支持 scripts/ 脚本执行
- [ ] 内置至少 1 个示例 Skill
