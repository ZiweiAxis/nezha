# 悟空 (Wukong)

紫微智能体治理平台的 Agent 生命周期管理器。

## 功能特性

- **身份管理** - 向天枢注册 Agent 身份，支持分级审批
- **生命周期管理** - 启动/停止/重启 Agent，支持本地/Docker/gVisor 沙箱
- **状态管理** - 实时同步 Agent 状态到天枢
- **适配器系统** - 支持不同类型的 Agent（Claude、Cursor 等）
- **零侵入治理** - 通过 diting-hook 自动接入紫微治理体系

## 快速开始

### 安装

```bash
npm install -g @ziwei/wukong
```

### 启动 Claude Agent

```bash
# 本地模式启动
wukong claude --name my-claude --mode local

# Docker 沙箱模式
wukong claude --name my-claude --mode sandbox

# gVisor 深度沙箱模式
wukong claude --name my-claude --mode deep-sandbox
```

### 管理 Agent

```bash
# 列出所有 Agent
wukong list

# 查看 Agent 状态
wukong status my-claude

# 停止 Agent
wukong stop my-claude

# 重启 Agent
wukong restart my-claude

# 查看日志
wukong logs my-claude -n 100
```

### 身份管理

```bash
# 注册新身份
wukong identity --register my-agent --type claude

# 列出所有身份
wukong identity --list
```

## 架构设计

```
┌─────────────────────────────────────────────────────────┐
│                        悟空 CLI                          │
└─────────────────────────────────────────────────────────┘
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
        ▼                  ▼                  ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│ 身份管理器    │  │ 状态管理器    │  │ Agent管理器   │
└──────────────┘  └──────────────┘  └──────────────┘
        │                  │                  │
        └──────────────────┼──────────────────┘
                           │
                           ▼
                  ┌──────────────┐
                  │  天枢客户端   │
                  └──────────────┘
                           │
                           ▼
                  ┌──────────────┐
                  │   天枢 API    │
                  └──────────────┘
```

## 运行模式

### 本地模式 (local)
- 直接在本地环境运行
- 无隔离，性能最佳
- 适合开发和测试

### Docker 沙箱 (sandbox)
- 运行在 Docker 容器中
- 基础隔离，平衡性能和安全
- 适合生产环境

### gVisor 深度沙箱 (deep-sandbox)
- 运行在 gVisor 容器中
- 深度隔离，安全性最高
- 适合高风险场景

## 开发

### 安装依赖

```bash
npm install
```

### 开发模式

```bash
npm run dev -- claude --name test
```

### 构建

```bash
npm run build
```

### 测试

```bash
# 运行测试
npm test

# 监听模式
npm run test:watch

# 覆盖率
npm run test:coverage
```

## 配置

创建 `.env` 文件：

```bash
cp .env.example .env
```

配置项：

- `TIANSHU_API_URL` - 天枢 API 地址
- `TIANSHU_API_KEY` - 天枢 API 密钥
- `WUKONG_DATA_DIR` - 数据目录（默认 ~/.wukong）
- `LOG_LEVEL` - 日志级别

## 扩展适配器

实现 `IAgentAdapter` 接口来支持新的 Agent 类型：

```typescript
import { IAgentAdapter, AgentConfig, AgentInstance } from '@ziwei/wukong';

export class MyAdapter implements IAgentAdapter {
  readonly name = 'my-agent';

  async start(config: AgentConfig): Promise<AgentInstance> {
    // 实现启动逻辑
  }

  async stop(instance: AgentInstance): Promise<void> {
    // 实现停止逻辑
  }

  async restart(instance: AgentInstance): Promise<AgentInstance> {
    // 实现重启逻辑
  }

  async checkStatus(instance: AgentInstance): Promise<boolean> {
    // 实现状态检查
  }

  async configureDitingHook(instance: AgentInstance): Promise<void> {
    // 配置 diting-hook
  }
}
```

## 许可证

MIT
