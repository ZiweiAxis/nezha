# 悟空 (Wukong) 🐵

> 紫微智能体治理平台的 Agent 生命周期管理器

[![Version](https://img.shields.io/badge/version-0.1.0-blue.svg)](https://github.com/ziwei/wukong)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)
[![Node](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)

## 简介

悟空是一个强大的 AI Agent 生命周期管理工具，专为紫微智能体治理平台设计。它提供了统一的接口来管理各类 AI Agent（如 Claude、Cursor 等），支持多种运行模式和零侵入式治理。

### 核心特性

- 🔌 **插件化架构** - 易于扩展新的 Agent 类型
- 🛡️ **多级隔离** - 支持本地、Docker、gVisor 三种运行模式
- 🎯 **零侵入治理** - 通过 diting-hook 自动接入，无需修改 Agent 代码
- 💻 **CLI 友好** - 简洁直观的命令行界面
- 📊 **状态监控** - 实时心跳和状态同步
- 🔐 **身份管理** - 与天枢平台集成的身份认证

## 快速开始

### 安装

```bash
# 克隆仓库
git clone <repository-url>
cd wukong

# 安装依赖
npm install

# 构建项目
npm run build

# 全局安装
npm link
```

### 基本使用

```bash
# 1. 注册身份
wukong identity --register my-agent --type claude

# 2. 启动 Agent
wukong claude --name my-agent --mode local

# 3. 查看状态
wukong list

# 4. 管理 Agent
wukong stop my-agent
wukong restart my-agent
wukong logs my-agent
```

## 命令参考

### 身份管理

```bash
# 注册新身份
wukong identity --register <name> --type <type>

# 列出所有身份
wukong identity --list
```

### Agent 管理

```bash
# 启动 Claude Agent
wukong claude --name <name> [options]
  --mode <mode>           运行模式: local|sandbox|deep-sandbox
  --work-dir <dir>        工作目录
  --auto-restart          启用自动重启

# 列出所有 Agent
wukong list

# 查看 Agent 状态
wukong status <name>

# 停止 Agent
wukong stop <name>

# 重启 Agent
wukong restart <name>

# 查看日志
wukong logs <name> [-n <lines>]
```

## 运行模式

### Local 模式
直接在本地环境运行，无隔离，适合开发测试。

```bash
wukong claude --name dev-agent --mode local
```

### Sandbox 模式
在 Docker 容器中运行，提供基础隔离，适合生产环境。

```bash
wukong claude --name prod-agent --mode sandbox
```

### Deep Sandbox 模式
使用 gVisor 提供深度隔离，安全性最高，适合高风险场景。

```bash
wukong claude --name secure-agent --mode deep-sandbox
```

## 项目结构

```
wukong/
├── src/
│   ├── adapters/      # Agent 适配器
│   ├── clients/       # 外部客户端
│   ├── core/          # 核心接口
│   ├── managers/      # 管理器实现
│   ├── types/         # 类型定义
│   ├── cli.ts         # CLI 入口
│   └── index.ts       # 主入口
├── tests/             # 测试文件
├── docs/              # 文档
├── examples/          # 示例配置
└── scripts/           # 工具脚本
```

## 文档

- 📖 [快速开始](./QUICKSTART.md) - 5 分钟上手指南
- 📚 [使用文档](./docs/USAGE.md) - 详细使用说明
- 🔧 [开发指南](./docs/DEVELOPMENT.md) - 开发者文档
- 🗺️ [功能路线图](./ROADMAP.md) - 未来规划
- 📝 [项目总结](./PROJECT_SUMMARY.md) - 项目概览

## 开发

### 环境要求

- Node.js 18+
- TypeScript 5.x
- npm 或 yarn

### 开发命令

```bash
# 安装依赖
npm install

# 开发模式（监听文件变化）
npm run dev

# 构建
npm run build

# 运行测试
npm test

# 测试覆盖率
npm run test:coverage

# 代码检查
npm run lint
```

### 添加新的 Agent 适配器

1. 在 `src/adapters/` 创建新适配器
2. 实现 `IAgentAdapter` 接口
3. 在 `src/index.ts` 注册适配器
4. 在 `src/cli.ts` 添加 CLI 命令
5. 编写测试

详见 [开发指南](./docs/DEVELOPMENT.md)

## 测试

```bash
# 运行所有测试
npm test

# 运行 CLI 测试
./scripts/test-cli.sh

# 查看测试覆盖率
npm run test:coverage
```

当前测试状态：
- ✅ 8 个测试通过
- ⏭️ 1 个测试跳过
- 📊 测试通过率: 88.9%

## 配置

### 环境变量

创建 `.env` 文件：

```bash
# 天枢 API 配置
TIANSHU_API_URL=http://localhost:3000
TIANSHU_API_KEY=your-api-key

# 数据目录
WUKONG_DATA_DIR=~/.wukong

# 日志级别
LOG_LEVEL=info
```

### 配置文件

参考 `examples/agent-config.json`：

```json
{
  "name": "my-agent",
  "type": "claude",
  "mode": "local",
  "workDir": "/path/to/project",
  "autoRestart": true
}
```

## 故障排查

### Agent 无法启动

1. 检查身份状态：`wukong identity --list`
2. 查看错误日志：`wukong logs <name>`
3. 验证环境变量：检查 `.env` 文件

### 找不到 wukong 命令

```bash
# 重新链接
cd /path/to/wukong
npm link

# 或直接运行
node dist/cli.js --help
```

更多问题请查看 [使用文档](./docs/USAGE.md#故障排查)

## 贡献

欢迎贡献代码！请遵循以下步骤：

1. Fork 本仓库
2. 创建特性分支：`git checkout -b feature/my-feature`
3. 提交更改：`git commit -am 'Add some feature'`
4. 推送分支：`git push origin feature/my-feature`
5. 创建 Pull Request

详见 [开发指南](./docs/DEVELOPMENT.md#贡献指南)

## 许可证

MIT License - 详见 [LICENSE](LICENSE) 文件

## 联系方式

- 项目主页：[GitHub Repository]
- 问题反馈：[Issue Tracker]
- 文档站点：[Documentation]

## 致谢

感谢紫微平台团队的支持和指导。

---

**当前版本**: 0.1.0 (Alpha)  
**最后更新**: 2024-02-16  
**状态**: 🟢 开发中
