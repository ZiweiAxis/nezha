# E020: Owner 注册 API

## 概述

| 属性 | 值 |
|------|-----|
| Epic ID | E020 |
| 名称 | Owner 注册 API |
| 描述 | 提供 REST API 供管理员手动注册 Owner |
| 状态 | 🔵 待执行 |
| 依赖 | 无 |

## 背景

根据 E020 讨论，天枢初始化时只预注册管理员 `admin`，其他 Owner（如谛听的 `diting`）需由管理员手动注册。

## 需求

### 功能需求

| 需求 | 说明 |
|------|------|
| FR-OWNER-001 | 管理员可注册新 Owner |
| FR-OWNER-002 | 管理员可查询 Owner 列表 |
| FR-OWNER-003 | 管理员可查询单个 Owner 详情 |
| FR-OWNER-004 | 管理员可更新 Owner 信息 |
| FR-OWNER-005 | 管理员可删除 Owner |
| FR-OWNER-006 | 系统可校验 Owner 唯一性 |

### 非功能需求

| 需求 | 说明 |
|------|------|
| NFR-OWNER-001 | 需管理员认证 |
| NFR-OWNER-002 | 防止重复注册 |

## 接口设计

### 1. 注册 Owner

```
POST /api/v1/owners/register
Authorization: Bearer <admin_token>

Request:
{
    "owner_id": "diting",
    "identities": {
        "system": {"type": "diting", "name": "Diting Policy Engine"}
    },
    "channels": []
}

Response (成功):
{
    "ok": true,
    "owner_id": "diting"
}

Response (已存在):
{
    "ok": false,
    "error": "Owner 已存在"
}
```

### 2. 查询 Owner 列表

```
GET /api/v1/owners
Authorization: Bearer <admin_token>

Response:
{
    "ok": true,
    "owners": [
        {"owner_id": "admin", "identities": {...}},
        {"owner_id": "diting", "identities": {...}}
    ]
}
```

### 3. 查询单个 Owner

```
GET /api/v1/owners/{owner_id}
Authorization: Bearer <admin_token>

Response:
{
    "ok": true,
    "owner": {
        "owner_id": "diting",
        "identities": {...},
        "channels": [...],
        "created_at": "..."
    }
}
```

### 4. 更新 Owner

```
PUT /api/v1/owners/{owner_id}
Authorization: Bearer <admin_token>

Request:
{
    "identities": {...},
    "channels": [...]
}

Response:
{
    "ok": true,
    "owner": {...}
}
```

### 5. 删除 Owner

```
DELETE /api/v1/owners/{owner_id}
Authorization: Bearer <admin_token>

Response:
{
    "ok": true
}
```

## 权限控制

- 仅 `admin` Owner 可调用 API
- 需验证请求者的 Owner ID 为 `admin`

## 存储设计

```
Bucket: owners
  admin: {...}
  diting: {...}

Bucket: owners_index
  system:diting: {"owner_id": "diting"}
```

## 验收标准

- [ ] 可注册新 Owner
- [ ] 重复注册返回错误
- [ ] 非 admin 无法注册
- [ ] 可查询 Owner 列表
- [ ] 可查询/更新/删除单个 Owner

## 拆分 Story

| Story | 任务 |
|-------|------|
| S081 | 实现 Owner 注册 API |
| S082 | 实现 Owner 查询/更新/删除 API |
| S083 | 添加权限控制 |
| S084 | 编写测试用例 |
