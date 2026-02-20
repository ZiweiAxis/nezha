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
| S062 | 验证哪吒沙箱模式可用 | ⏳ 待处理 | 3 |
| S063 | 验证策略拦截正常工作 | ⏳ 待处理 | 2 |

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

- [ ] 检查哪吒沙箱启动模式实现
- [ ] 实现 Podman 沙箱启动
- [ ] 实现 configureDitingHook
- [ ] 测试沙箱启动

### 当前状态

**LOCAL 模式**: ✅ 可用
- 直接启动 Claude CLI
- 无沙箱隔离

**SANDBOX 模式**: ❌ 未实现
- `startSandbox()` 抛出异常
- 需要实现 Podman/Docker 容器启动

**DEEP_SANDBOX 模式**: ❌ 未实现
- `startDeepSandbox()` 抛出异常
- 需要 gVisor 支持

**configureDitingHook**: ❌ 空实现
- TODO 状态
- 需要实现谛听 Hook 配置

### 实现方案

```typescript
// startSandbox 实现方案
private async startSandbox(config: AgentConfig, workDir: string): Promise<AgentInstance> {
  // 1. 构建 Docker 镜像或使用已有镜像
  // 2. 启动容器，挂载工作目录
  // 3. 在容器内启动 Claude CLI
  // 4. 返回容器实例信息
}
```

### 验收标准

- [ ] Podman 沙箱可正常启动
- [ ] 悟空在沙箱内运行
- [ ] configureDitingHook 配置正确

---

## S063: 验证策略拦截正常工作

### 任务

- [ ] 通过哪吒启动悟空
- [ ] 测试策略拦截功能

### 验收标准

- [ ] 策略拦截正常工作

---

## 修正记录

| 日期 | 修改人 | 修改内容 |
|------|--------|----------|
| 2026-02-21 | 小柒 | 创建 Epic，记录架构偏差 |
