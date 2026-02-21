# E014: 悟空策略拦截完整集成

## 概述

| 属性 | 值 |
|------|-----|
| Epic ID | E014 |
| 名称 | 悟空策略拦截完整集成 |
| 描述 | 实现完整的策略拦截流程：悟空执行 → 谛听拦截 → 獬豸检查 → 审批 → 执行 |
| 状态 | 🚧 进行中 |
| 优先级 | P0 |
| 依赖 | E013 (架构修正) |

## 背景

E013 完成了架构修正，将悟空中的谛听集成移除，回归纯粹的 Agent 角色。现在需要实现通过哪吒沙箱模式启动悟空，并集成谛听策略拦截。

## 目标

1. 实现哪吒沙箱启动时集成 diter-hook
2. 配置审批消息投递（天枢/Telegram）
3. 实现审批回调机制
4. 端到端测试验证

## Stories

| Story | 名称 | 状态 | 工作量 |
|-------|------|------|--------|
| S070 | 集成 diter-hook 到沙箱 | 🚧 进行中 | 3 |
| S071 | 配置审批消息投递 | ⏳ 待处理 | 2 |
| S072 | 实现审批回调 | ⏳ 待处理 | 3 |
| S073 | 端到端流程测试 | ⏳ 待处理 | 2 |

---

## S070: 集成 diter-hook 到沙箱

### 任务

- [x] 修改 startSandbox 使用 golang:alpine 镜像
- [x] 在容器内安装 diter-hook
- [x] 配置 Claude Code hooks
- [ ] 验证 hook 拦截功能

### 实现细节

1. **镜像变更**: node:18-alpine → golang:1.21-alpine（需要 Go 环境编译）
2. **安装 diter-hook**: 克隆 nezha 仓库，编译 diter-hook
3. **配置 hooks**: 创建 .claude/settings.json 配置 PreToolUse hook

### 验收标准

- [ ] 容器内 diter-hook 安装成功
- [ ] Claude Code hooks 配置正确
- [ ] 技能执行被 diter-hook 拦截

---

## S071: 配置审批消息投递

### 任务

- [x] 配置天枢 Matrix 投递
- [x] 启用谛听 delivery.tianshu
- [ ] 解决天枢注册 502 问题

### 当前状态

**天枢**: ✅ 运行中 (localhost:8081)
**谛听**: ✅ 天枢投递已启用
**问题**: 天枢注册返回 502，需要正确的 owner_id

### 验证命令

```bash
# 测试审批触发
curl -X POST http://localhost:8080/auth/exec \
  -H "Content-Type: application/json" \
  -d '{"action": "exec:skill:weather", "resource": "test"}'
```

### 验收标准

- [ ] 审批消息成功发送到 Matrix 房间
- [ ] 用户在 Matrix 收到审批卡片

---

## S072: 实现审批回调

### 问题分析

**当前问题**：
1. 悟空调用谛听时没有传递 `owner_id`
2. 审批消息发送给悟空机器人，而非用户

**正确流程**：
```
用户(Telegram) → 悟空 → 谛听 → 策略检查 → 天枢投递 → 用户(Telegram审批)
                    ↑
                 传递 owner_id
```

**注意**：Telegram user ID ↔ DID 映射由天枢管理，审批消息由天枢发送。

### 任务

- [x] 修复悟空调用谛听时传递 owner_id
- [x] 谛听接收 owner_id 并保存到 CHEQ
- [x] 谛听投递审批请求时携带 owner_id
- [ ] 天枢根据 owner_id 映射到用户发送审批
- [ ] 用户审批后回调到谛听

### 实现细节

1. **传递用户信息**：
   - 悟空调用 `/auth/exec` 时传递 `owner_id` 和 `telegram_user_id`
   - 谛听将用户信息存入 CHEQ

2. **审批消息投递**：
   - 使用 `telegram_user_id` 作为 `receive_id`
   - 发送到用户的 Telegram 而非机器人

3. **审批回调**：
   - 用户点击批准/拒绝按钮
   - 天枢调用谛听 `/cheq/approve` API
   - 谛听更新 CHEQ 状态

### 验收标准

- [ ] 审批消息发送给用户（非机器人）
- [ ] 用户可点击批准/拒绝按钮
- [ ] 批准后 CHEQ 状态更新

---

## S073: 端到端流程测试

### 任务

- [ ] 发送测试指令（如"查询天气"）
- [ ] 验证拦截触发审批
- [ ] 审批消息发送给用户（不是机器人）
- [ ] 用户审批通过
- [ ] 悟空执行技能并返回结果

### 测试用例

1. 用户在 Telegram 发送："郑州天气怎么样"
2. 悟空调用 Skill
3. 谛听拦截，调用 `/auth/exec`（携带用户信息）
4. 策略返回 review，生成 CHEQ
5. **审批消息发送到用户 Telegram**（当前错误：发给了悟空机器人）
6. 用户点击"批准"
7. 回调更新 CHEQ 状态
8. 悟空继续执行，返回天气结果

### 验收标准

- [ ] 用户收到审批消息（不是机器人）
- [ ] 用户可以批准/拒绝
- [ ] 批准后技能执行成功
