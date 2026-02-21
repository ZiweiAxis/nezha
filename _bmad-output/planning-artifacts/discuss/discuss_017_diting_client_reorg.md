# 讨论：E017 - 调整 diting_client 模块归属

## 背景

当前 `diting_client/` 模块位于 `identity/` 层，但实际功能是注册流程的一部分。

## 问题

### 模块职责不清

当前 `diting_client/` 功能：
- `init_permission.py` - 通知谛听 Agent 已注册，初始化权限
- `chain_did.py` - 链上 DID 注册

这两个功能都是**注册流程**的副作用，而非核心身份管理。

### 归属不当

```
registration/           ← 注册流程
    ├── agent_self_register.py
    ├── human_initiated.py
    └── pairing_code.py

identity/               ← 身份管理
    ├── owners.py
    ├── agents.py
    └── relationships.py

diting_client/          ← ❌ 放错位置
```

## 方案 A：合并到 registration 模块（采用）

### 目标结构

```
registration/
├── __init__.py
├── agent_self_register.py
├── human_initiated.py
├── pairing_code.py
└── diting/                   # 新增目录
    ├── __init__.py
    ├── notify.py             # 从 diting_client/init_permission.py 移入
    └── chain_did.py          # 从 diting_client/chain_did.py 移入
```

## Sub-Agent 任务分配

将 016、017、018 三个讨论项作为独立 Sub-Agent 任务并行推进：

| Sub-Agent | 任务 | Discuss |
|-----------|------|---------|
| **Agent 1** | Channel 模块重构（仅 Telegram） | discuss_016 |
| **Agent 2** | diting_client 归属调整 | discuss_017 |
| **Agent 3** | 身份管理多渠道映射 | discuss_018 |

## 待确认

- [x] 采用方案 A
- [x] 拆分为 3 个 Sub-Agent 任务

## 迁移计划（由 Sub-Agent 并行推进）

- **Agent 1**: Channel 模块重构
- **Agent 2**: diting_client 归属调整
- **Agent 3**: 身份管理多渠道映射

---

**讨论时间**: 2026-02-21
**状态**: ✅ 已确认，由 3 个 Sub-Agent 并行推进
