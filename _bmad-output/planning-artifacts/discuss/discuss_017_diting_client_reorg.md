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

## 方案

### 方案 A：合并到 registration 模块

```
registration/
├── __init__.py
├── agent_self_register.py
├── human_initiated.py
├── pairing_code.py
├── diting_notify.py      # 从 diting_client/init_permission.py 移入
└── chain_did.py         # 从 diting_client/chain_did.py 移入
```

**优点**：注册流程闭环，相关代码集中
**缺点**：需要修改 import 路径

### 方案 B：创建独立的 service 模块

```
services/
├── registration/
│   ├── agent_self_register.py
│   ├── human_initiated.py
│   └── pairing_code.py
└── diting/
    ├── init_permission.py
    └── chain_did.py
```

**优点**：职责更清晰
**缺点**：改动更大

## 推荐

**方案 A** - 最小改动，将 `diting_client/` 合并到 `registration/`

## 待确认

- [ ] 采用哪个方案？
- [ ] 是否需要拆分 chain_did 到独立模块？

---

**讨论时间**: 2026-02-21
**状态**: 🔵 待确认
