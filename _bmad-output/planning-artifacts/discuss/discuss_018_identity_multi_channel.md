# 讨论：E018 - 身份管理：多渠道账户映射

## 背景

企业用户有企业内部身份（邮箱、工号），需要映射到外部消息渠道（Telegram）进行消息投递。

## 核心概念

| 概念 | 说明 | 示例 |
|------|------|------|
| **Identity** | 企业内部身份 | email, employee_id |
| **Channel** | 外部消息渠道 | Telegram |
| **Owner** | 身份+渠道的组合 | 映射关系 |

## 方案 A：分离身份与渠道（推荐）

### 身份标识（Identity - 企业内部身份）

```python
{
    "owner_id": "owner-xxx",
    "identities": {
        "email": {"address": "user@company.com"},
        "employee": {"id": "EMP001", "department": "技术部"}
    },
    "created_at": "2026-02-21T10:00:00Z",
    "updated_at": "2026-02-21T10:00:00Z"
}
```

### 投递渠道（Channel - 外部消息渠道）

```python
{
    "owner_id": "owner-xxx",
    "channels": [
        {"type": "telegram", "receive_id": "5632751765", "enabled": true}
    ]
}
```

**说明**：
- `identities` 存储企业内部身份（email, employee_id）
- `channels` 存储外部消息渠道（Telegram）
- 两者是独立维度，通过 `owner_id` 关联

### 接口设计

```python
# 身份管理（企业内部身份）
def register_identity(owner_id: str, identity_type: str, identity_data: dict) -> bool:
    """注册企业内部身份"""

def lookup_by_identity(identity_type: str, identity_value: str) -> Optional[Owner]:
    """通过企业内部身份查找 Owner"""

# 渠道管理（外部消息渠道）
def add_channel(owner_id: str, channel_type: str, receive_id: str) -> bool:
    """添加外部消息渠道"""

def get_channels(owner_id: str) -> List[Channel]:
    """获取用户的所有渠道"""

def get_enabled_channel(owner_id: str) -> Optional[Channel]:
    """获取启用的渠道"""
```

### 渠道类型定义（当前仅支持 Telegram）

| 渠道 | type | 必填字段 |
|------|------|----------|
| Telegram | `telegram` | `user_id` |

**其他渠道暂不考虑。**

## 待确认

- [x] 采用方案 A
- [x] 身份标识不包含渠道（telegram 属于 channels）
- [x] 当前只支持 Telegram
- [x] 渠道优先级问题不存在
- [x] 存储后端：SQLite（开发）

## 迁移计划

1. 修改 `identity/owners.py` 数据结构
2. 添加身份管理方法（email, employee）
3. 添加渠道管理方法
4. 迁移现有数据
5. 更新投递逻辑

## 相关模块

- `identity/owners.py` - Owner 身份管理
- `core/delivery.py` - 消息投递
- `channel/` - 渠道实现

---

**讨论时间**: 2026-02-21
**状态**: ✅ 已确认，Sub-Agent 并行推进
