# 紫微平台 - Matrix 通信架构

## 概述

本文档定义紫微平台各组件与用户之间的 Matrix 通信模式。

## Matrix 环境

- **唯一 Matrix 服务器**: `xyin.oicp.net:8008`
- **所有用户（人类、Agent、獬豸）都注册在此服务器上**

## 用户身份 (DID)

| 身份 | 注册方式 | DID 示例 |
|------|----------|----------|
| Owner (真实人类) | 自己注册 | `did:human:xxx` |
| 审批人 | 固定配置 (hulk) | - |
| 獬豸 | 系统初始化自动注册 | `did:agent:xiezhi` |
| Agent | 悟空触发自动注册 | `did:agent:xxx` |

## 通信模式

### 核心原则
- **谁发送消息，谁监听回复**
- gateway 使用对应智能体的 DID 发送消息
- **发送方自己监听自己消息的回复**
- 天枢是对接不同 channel 的管理平台，不是消息发送方

### 1. 审批通知：DM 私聊

```
悟空 → 獬豸（决策需要审批）
          ↓
    天枢（路由管理，返回审批人）
          ↓
    @xiezhi → 发送 DM 给审批人 (@hulk)
              ↓
    @xiezhi → 监听审批回复（关键！）
              ↓
    @xiezhi → 调用 /cheq/approve
```

- 发送方身份：獬豸 (`did:agent:xiezhi`)
- 接收方：审批人 (@hulk)
- **回复处理**：@xiezhi 自己监听，不需要 gateway 介入

### 2. Agent ↔ Owner：DM 私聊

```
Owner → 发送指令
          ↓
    gateway → 使用 Agent DID 发送 DM 给 Agent
              ↓
    Agent → 监听指令回复
              ↓
    Agent → 执行并返回结果
```

- 发送方身份：Owner DID 或 Agent DID
- **回复处理**：Agent 自己监听自己的 DM

### 3. Room (未来扩展)

保留给多 agent 协作场景，当前不实现。

### 消息监听架构

每个 Agent（包括獬豸）都需要：
1. **独立的 Matrix token**
2. **自己的 Matrix 客户端监听**
3. **处理自己消息的回复**

```
┌─────────────┐     Matrix      ┌─────────────┐
│   獬豸      │ ◄──────────────►│   Matrix    │
│  (Agent)    │   发送+监听     │   服务器    │
└─────────────┘                 └─────────────┘

┌─────────────┐     Matrix      ┌─────────────┐
│   悟空      │ ◄──────────────►│   Matrix    │
│  (Agent)    │   发送+监听     │   服务器    │
└─────────────┘                 └─────────────┘
```

## 配置项

| 配置项 | 值 |
|--------|-----|
| MATRIX_HOMESERVER | http://xyin.oicp.net:8008 |
| MATRIX_GATEWAY_USER | @gateway:xyin.oicp.net |
| 审批人 | @hulk:xyin.oicp.net |

## 实现要点

1. **獬豸 DID 自动注册** - 系统初始化时自动注册 `did:agent:xiezhi`
2. **DID 发送逻辑** - gateway 以对应智能体 DID 身份发送消息
3. **Agent ↔ Owner DM** - 创建 agent 与 owner 的 DM
