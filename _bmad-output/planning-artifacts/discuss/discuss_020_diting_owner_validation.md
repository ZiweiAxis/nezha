# 讨论：E020 - 谛听注册 OwnerID 验证

## 背景

谛听到天枢注册时，需要提供 `owner_id`。当前问题：
1. 配置的 `DITING_OWNER_ID=@hulk:xyin.oicp.net` 是 Matrix ID，不是天枢 Owner ID
2. 天枢需要预注册系统 Owner

## 问题

### 问题 1：OwnerID 类型

当前配置：
```
DITING_OWNER_ID=@hulk:xyin.oicp.net  ← Matrix ID
```

应该是：
```
DITING_OWNER_ID=owner-diting  ← 天枢 Owner ID
```

### 问题 2：预注册机制

谛听注册时，天枢需要验证：
1. OwnerID 是否存在？
2. 还是自动创建？

**当前行为**：自动创建（`get_or_create`）

**企业级需求**：应该预注册，验证存在性

## 方案

### 方案 A：预注册系统 Owner（推荐）

```python
# 预注册谛听 Owner
store.set("owners", "owner-diting", {
    "owner_id": "owner-diting",
    "identities": {"system": {"type": "diting"}},
    "channels": []
})
```

### 方案 B：自动创建（当前行为）

保持 `get_or_create` 逻辑，首次注册时自动创建。

## 待确认

- [ ] 采用预注册还是自动创建？
- [ ] 是否需要添加 Owner 存在性验证 API？

---

**讨论时间**: 2026-02-21
**状态**: 🔵 待确认
