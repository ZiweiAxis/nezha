# E010: 悟空输出优化

## 概述

| 属性 | 值 |
|------|-----|
| Epic ID | E010 |
| 名称 | 悟空输出优化 |
| 描述 | 优化悟空 Agent 输出：过滤 think 标签、实现流式输出、美化显示 |
| 状态 | 🆕 新建 |
| 优先级 | P1 |
| 依赖 | E007, E009 |

## 目标

- 过滤 `<think>` 和 `<think>` 标签内容
- 实现 Telegram 端流式输出
- 思考内容收起/隐藏

## Stories

| Story | 名称 | 描述 |
|-------|------|------|
| S040 | 过滤思考标签 | 过滤 think/</think> 标签内容 |
| S041 | 流式输出 | Telegram 消息流式输出 |
| S042 | 思考收起 | 思考内容默认收起 |

---

## S040: 过滤思考标签

### 任务

- [ ] 过滤消息中的 `<think>` 和 `<think>` 标签
- [ ] 过滤 `</think>` 和 `</think>` 标签
- [ ] 完全移除思考内容

### 实现

```python
import re

def clean_think_tags(text: str) -> str:
    """过滤思考标签内容"""
    # 移除 think 块
    text = re.sub(r'<think>.*?</think>', '', text, flags=re.DOTALL)
    text = re.sub(r'<think>.*?</think>', '', text, flags=re.DOTALL)
    return text.strip()
```

### 验收

- [ ] think 标签内容被过滤
- [ ] 原始回复内容正常显示

---

## S041: 流式输出

### 任务

- [ ] 修改 wukong_handler.py 支持流式输出
- [ ] 使用 editMessageText 增量更新
- [ ] 添加防抖处理

### 实现

```python
async def send_message_streaming(chat_id, text):
    """流式发送消息"""
    message_id = None
    buffer = ""
    
    for chunk in stream_generator():
        buffer += chunk
        if len(buffer) > 50:  # 每50字符更新一次
            if message_id:
                await edit_message(chat_id, message_id, buffer)
            else:
                result = await send_message(chat_id, buffer)
                message_id = result.get('message_id')
    
    # 最后发送完整内容
```

### 验收

- [ ] 消息逐步显示
- [ ] 体验流畅

---

## S042: 思考收起

### 任务

- [ ] 思考内容默认收起
- [ ] 用户可点击展开
- [ ] 使用 Telegram inline button 或 markdown 特性

### 实现

```python
def format_with_collapsed_think(think_content: str, answer: str) -> str:
    """格式化思考内容为收起状态"""
    if not think_content:
        return answer
    
    # 使用 details/summary 或 Telegram 可折叠内容
    return f"🔄 *思考中...*\n\n{answer}"
```

### 验收

- [ ] 思考内容默认隐藏
- [ ] 用户可查看思考过程
