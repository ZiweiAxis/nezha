# E008: Telegram 用户与 DID 映射

## 概述

| 属性 | 值 |
|------|-----|
| Epic ID | E008 |
| 名称 | Telegram 用户与 DID 映射 |
| 描述 | 实现 Telegram 用户与天枢 owner_id 的映射机制 |
| 状态 | 🚧 进行中 |
| 优先级 | P0 |
| 依赖 | E007 |

## 背景

当前悟空对话直接使用 Telegram user_id，但天枢使用 owner_id（DID 体系）。

## 目标

实现 Telegram 用户与天枢 owner_id 的映射：
1. 首次对话自动注册 owner
2. 复用已有 owner 身份

## Stories

| Story | 名称 | 描述 |
|-------|------|------|
| S034 | 添加 telegram_user_id 支持 | 在 owners.py 添加 telegram 标识类型 |
| S035 | 消息路由改造 | 消息处理时查询/创建 owner_id |
| S036 | 会话上下文 | 保持用户会话上下文 |

---

## S034: 添加 telegram_user_id 支持

### 任务

- [ ] owners.py 支持 telegram_user_id 标识类型
- [ ] 添加 lookup_telegram_owner 函数
- [ ] 添加 register_telegram_owner 函数

### 实现

```python
def register_telegram_owner(telegram_user_id: str) -> str:
    """注册或获取 Telegram 用户对应的 Owner"""
    return register_owner("telegram_user_id", telegram_user_id)

def lookup_telegram_owner(telegram_user_id: str) -> Optional[str]:
    """查询 Telegram 用户对应的 Owner"""
    results = lookup_owners("telegram_user_id", telegram_user_id)
    return results[0]["owner_id"] if results else None
```

### 验收

- [ ] telegram_user_id 可以注册
- [ ] 可以查询已存在的映射

---

## S035: 消息路由改造

### 任务

- [ ] 修改 wukong_handler.py
- [ ] 消息处理时获取/创建 owner_id
- [ ] 传递给 Agent

### 实现

```python
async def handle_message(self, update: TelegramUpdate):
    # 获取用户
    telegram_user_id = str(update.message.user_id)
    
    # 查询或创建 owner_id
    owner_id = get_or_create_telegram_owner(telegram_user_id)
    
    # 调用 Agent
    response = await self._call_agent(text, chat_id, owner_id)
```

### 验收

- [ ] 自动创建 owner
- [ ] owner_id 正确传递

---

## S036: 会话上下文

### 任务

- [ ] 用户会话管理
- [ ] 上下文保持

### 设计方案

#### 会话结构
```python
{
    "session_id": "xxx",
    "owner_id": "owner-xxx",
    "telegram_chat_id": "123456789",
    "messages": [...],
    "created_at": "2026-02-21T10:00:00Z",
    "updated_at": "2026-02-21T10:05:00Z",
    "expires_at": "2026-02-21T11:00:00Z"  # 1小时无活动过期
}
```

#### 存储设计
- Bucket: `sessions`
- 过期策略：1小时无活动自动清理

#### 接口设计
```python
def create_session(owner_id: str, chat_id: str) -> str:
    """创建会话"""

def get_session(session_id: str) -> Optional[Session]:
    """获取会话"""

def append_message(session_id: str, role: str, content: str):
    """追加消息"""

def cleanup_expired_sessions():
    """清理过期会话"""
```

### 验收

- [ ] 多轮对话保持上下文
- [ ] 会话超时自动清理
- [ ] 并发会话隔离
