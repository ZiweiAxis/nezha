# E007: 悟空对话集成

## 概述

| 属性 | 值 |
|------|-----|
| Epic ID | E007 |
| 名称 | 悟空对话集成 |
| 描述 | 集成 wukong_bot 到系统，实现用户与悟空的对话功能 |
| 状态 | 🆕 新建 |
| 优先级 | P0 |
| 依赖方 | E005, E006 |

## 背景

悟空 Agent 代码已完成，需要：
1. 将 wukong_bot 接入天枢
2. 实现消息接收和发送
3. 对接 Claude Agent SDK

## 目标

1. wukong_bot 接收用户消息
2. 调用悟空 Agent 处理
3. 返回结果给用户

## Stories

| Story | 名称 | 描述 |
|-------|------|------|
| S030 | wukong_bot 接入 | 将 wukong_bot 接入天枢消息系统 |
| S031 | 消息处理 | 实现用户消息接收和处理 |
| S032 | Agent 调用 | 调用悟空 Agent 处理对话 |
| S033 | 结果返回 | 将 Agent 结果返回给用户 |

## 验收标准

- [ ] wukong_bot 能接收消息
- [ ] 能调用 Agent 处理
- [ ] 能返回结果给用户

## Definition of Done

- [ ] 用户可以通过 @ziwei_wukong_bot 对话
- [ ] 消息能正确传递到 Agent
- [ ] Agent 结果能返回给用户

---

## S030: wukong_bot 接入

### 任务

- [ ] 配置 wukong_bot Token
- [ ] 创建消息接收处理
- [ ] 接入天枢消息系统

### 实现

```python
# wukong_bot 处理
@client.on_message
async def handle_message(message):
    # 转发给悟空 Agent
    response = await agent.process(message)
    # 返回结果
    await client.send_message(message.chat_id, response)
```

### 验收

- [ ] wukong_bot 可接收消息

---

## S031: 消息处理

### 任务

- [ ] 解析用户消息
- [ ] 提取意图
- [ ] 传递给 Agent

### 验收

- [ ] 消息能正确解析

---

## S032: Agent 调用

### 任务

- [ ] 初始化悟空 Agent
- [ ] 调用 Claude SDK
- [ ] 处理响应

### 验收

- [ ] Agent 能处理对话

---

## S033: 结果返回

### 任务

- [ ] 格式化响应
- [ ] 发送回用户
- [ ] 错误处理

### 验收

- [ ] 用户能收到回复
