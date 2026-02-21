# 讨论：E019 - 存储后端选型与配置

## 背景

天枢原使用 Memory 存储，重启后数据丢失，不适合企业级产品。

## 选型评估

| 存储方案 | 适用场景 | 优点 | 缺点 |
|----------|----------|------|------|
| **Memory** | 开发/测试 | 简单快速 | 重启丢失 |
| **SQLite** | 中小规模 | 单文件、零运维 | 并发受限 |
| **MySQL** | 企业级/高并发 | 成熟稳定 | 需要 DBA |
| **PostgreSQL** | 企业级/复杂查询 | 功能丰富 | 需要 DBA |

## 决策

### 开发环境：SQLite
- 单文件，易于开发和测试
- 数据持久化到 `/data/tianshu.db`

### 生产环境建议：MySQL/PostgreSQL

## 配置方式

### SQLite（当前开发配置）

```bash
# 环境变量
TIANSHU_STORAGE=sqlite
TIANSHU_SQLITE_PATH=/data/tianshu.db
```

### MySQL（生产建议）

```bash
TIANSHU_STORAGE=mysql
TIANSHU_MYSQL_HOST=192.168.3.16
TIANSHU_MYSQL_USER=tianshu
TIANSHU_MYSQL_PASSWORD=xxx
TIANSHU_MYSQL_DATABASE=tianshu
```

### PostgreSQL（生产建议）

```bash
TIANSHU_STORAGE=postgres
TIANSHU_PG_URL=postgresql://user:pass@host:5432/tianshu
```

## 数据结构

### Owner 存储

```python
Bucket: owners
  owner-xxx:
    {
      "owner_id": "owner-xxx",
      "identities": {...},
      "channels": [...]
    }

Bucket: owners_index
  telegram:5632751765:
    {"owner_id": "owner-xxx"}
```

---

**讨论时间**: 2026-02-21
**状态**: ✅ 已确认 SQLite 开发配置
