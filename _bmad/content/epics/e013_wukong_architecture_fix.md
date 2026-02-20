# E013: 悟空架构偏差修正

## 概述

| 属性 | 值 |
|------|-----|
| Epic ID | E013 |
| 名称 | 悟空架构偏差修正 |
| 描述 | 修正悟空项目中错误的谛听集成方案，回归正确的零侵入架构 |
| 状态 | 🚧 进行中 |
| 优先级 | P0 |
| 依赖 | E004 (哪吒集成) |

## 背景

### 架构设计目标

根据紫微系统架构设计，正确的架构应该是：
- **哪吒** = Agent 生命周期管理器
- **悟空** = 被管理的 AI Agent (纯粹的 Agent，无需集成策略)
- **太白** = 消息通道组件
- **谛听** = 策略拦截器，通过 diter-hook 零侵入接入

**核心理念**：零侵入治理 - 不修改 Agent 代码，通过沙箱 + hook 方式拦截

### 当前错误实现

悟空项目中错误地直接集成了谛听客户端：
- `tianshu/src/agents/wukong/diting.py` - 独立模块
- `agent.py` 中直接实例化 `DitingClient`
- 在 `_execute_tool_call` 中直接调用谛听检查

这违反了"零侵入治理"原则。

## 目标

1. 移除悟空中的谛听集成代码
2. 确保悟空回归纯粹的 AI Agent 角色
3. 验证策略拦截由哪吒沙箱模式实现

## Stories

| Story | 名称 | 状态 | 工作量 |
|-------|------|------|--------|
| S060 | 移除悟空谛听客户端代码 | ✅ 已完成 | 2 |
| S061 | 移除 agent.py 中的 DitingClient 调用 | ✅ 已完成 | 1 |
| S062 | 验证哪吒沙箱模式可用 | ✅ 已完成 | 3 |
| S063 | 验证策略拦截正常工作 | 🚧 进行中 | 2 |

---

## S060: 移除悟空谛听客户端代码

### 任务

- [x] 删除 `tianshu/src/agents/wukong/diting.py`

### 验收标准

- [x] 文件已删除
- [x] 悟空仍能正常启动

---

## S061: 移除 agent.py 中的 DitingClient 调用

### 任务

- [x] 移除 `from .diting import DitingClient` 导入
- [x] 移除 `self._diting_client` 属性
- [x] 移除 `_execute_tool_call` 中的谛听检查逻辑
- [x] 移除相关配置项

### 验收标准

- [x] 代码编译通过
- [x] 悟空功能正常

---

## S062: 验证哪吒沙箱模式可用

### 任务

- [x] 检查哪吒沙箱启动模式实现
- [x] 实现 Podman 沙箱启动
- [x] 实现 configureDitingHook
- [ ] 测试沙箱启动

### 当前状态

**LOCAL 模式**: ✅ 可用
- 直接启动 Claude CLI
- 无沙箱隔离

**SANDBOX 模式**: ✅ 已实现
- `startSandbox()` 使用 Podman 启动容器
- 基于 node:18-alpine 镜像
- 挂载工作目录到容器内

**DEEP_SANDBOX 模式**: ❌ 未实现
- `startDeepSandbox()` 抛出异常
- 需要 gVisor 支持

**configureDitingHook**: ✅ 已实现
- 检查谛听服务可用性
- 配置 DITING_ENABLED、DITING_URL、DITING_SUBJECT
- 配置 HTTP_PROXY/HTTPS_PROXY 使请求通过谛听

### 实现细节

**修改的文件**:
- `/home/dministrator/workspace/ziwei/nezha/src/adapters/ClaudeAdapter.ts` - 实现 startSandbox() 和 configureDitingHook()
- `/home/dministrator/workspace/ziwei/nezha/src/types/index.ts` - 添加 SandboxConfig 和 DitingConfig 类型

**关键设计决策**:
1. 使用 Podman（不是 Docker）- 符合系统要求
2. 使用 node:18-alpine 镜像作为沙箱基础
3. 容器内运行 sleep infinity 保持容器活跃
4. 谛听 Hook 通过 HTTP_PROXY 方式拦截请求（零侵入）

### 验收标准

- [x] Podman 沙箱可正常启动
- [x] 悟空在沙箱内运行
- [x] configureDitingHook 配置正确

---

## S063: 验证策略拦截正常工作

### 任务

- [x] 实现 configureDitingHook 方法
- [x] 测试策略 API (/auth/exec)
- [ ] 端到端测试

### 当前状态

**configureDitingHook**: ✅ 已实现
- 检查谛听服务可用性
- 配置环境变量: DITING_ENABLED, DITING_URL, DITING_SUBJECT
- 配置 HTTP_PROXY 使请求经过谛听

**策略 API 测试**: ✅ 通过
- `/auth/exec` 返回正确决策
- 规则匹配正常工作

### 验收标准

- [x] configureDitingHook 配置正确
- [x] 策略 API 工作正常
- [ ] 端到端拦截测试

---

## 修正记录

| 日期 | 修改人 | 修改内容 |
|------|--------|----------|
| 2026-02-21 | 小柒 | 创建 Epic，记录架构偏差 |
| 2026-02-21 | 小柒 | 实现 S062: 哪吒沙箱模式和 configureDitingHook |
| 2026-02-21 | 小柒 | 测试 S062: Podman 沙箱启动成功 |
