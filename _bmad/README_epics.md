# Epic 列表

| Epic | 名称 | 描述 | 状态 | 优先级 |
|------|------|------|------|--------|
| E001 | 太白 SDK 开发 | Go/Python SDK 实现，用于调用天枢 | ✅ 完成 | P0 |
| E002 | 谛听 Seccomp | Seccomp 拦截实现，策略执行 | ✅ 完成 | P1 |
| E003 | 獬豸改造 | 使用太白 SDK 替代直接调用 | ✅ 完成 | P1 |
| E004 | 哪吒集成 | 集成谛听 + 太白 SDK | ✅ 完成 | P1 |

## 任务依赖

```
E001 (太白 SDK)
    │
    ├──────────────────┐
    ▼                  ▼
E003 (獬豸)        E004 (哪吒)
    │                  │
    └────────┬─────────┘
             ▼
    E002 (谛听)
```

## 详细文档

- [E001: 太白 SDK 开发](./content/epics/e001_taibai_sdk.md)
- [E002: 谛听 Seccomp](./content/epics/e002_diting_seccomp.md)
- [E003: 獬豸改造](./content/epics/e003_xiezhi_taibai.md)
- [E004: 哪吒集成](./content/epics/e004_nezha_integration.md)
