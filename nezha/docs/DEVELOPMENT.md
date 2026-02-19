# 开发指南

## 项目结构

```
wukong/
├── src/
│   ├── adapters/          # Agent 适配器实现
│   │   └── ClaudeAdapter.ts
│   ├── clients/           # 外部服务客户端
│   │   └── TianshuClient.ts
│   ├── core/              # 核心接口定义
│   │   ├── IAgentAdapter.ts
│   │   ├── IAgentManager.ts
│   │   ├── IIdentityManager.ts
│   │   ├── IStateManager.ts
│   │   └── ITianshuClient.ts
│   ├── managers/          # 管理器实现
│   │   ├── AgentManager.ts
│   │   ├── IdentityManager.ts
│   │   └── StateManager.ts
│   ├── types.ts           # 类型定义
│   ├── cli.ts             # CLI 入口
│   └── index.ts           # 主入口
├── tests/
│   └── unit/              # 单元测试
├── docs/                  # 文档
├── examples/              # 示例配置
└── scripts/               # 工具脚本
```

## 开发环境设置

### 1. 克隆仓库

```bash
git clone <repository-url>
cd wukong
```

### 2. 安装依赖

```bash
npm install
```

### 3. 开发模式

```bash
# 监听文件变化并自动编译
npm run dev

# 在另一个终端运行 CLI
node dist/cli.js --help
```

### 4. 运行测试

```bash
# 运行所有测试
npm test

# 监听模式
npm run test:watch

# 生成覆盖率报告
npm run test:coverage
```

## 添加新的 Agent 适配器

### 1. 创建适配器类

在 `src/adapters/` 目录下创建新文件：

```typescript
// src/adapters/MyAdapter.ts
import { IAgentAdapter, AgentConfig, AgentInstance } from '../core/IAgentAdapter';
import { AgentStatus } from '../types';

export class MyAdapter implements IAgentAdapter {
  readonly name = 'my-agent';

  async start(config: AgentConfig): Promise<AgentInstance> {
    // 实现启动逻辑
    const instance: AgentInstance = {
      id: `${config.name}-${Date.now()}`,
      name: config.name,
      type: config.type,
      mode: config.mode,
      status: AgentStatus.RUNNING,
      startedAt: new Date(),
      restartCount: 0,
    };

    return instance;
  }

  async stop(instance: AgentInstance): Promise<void> {
    // 实现停止逻辑
  }

  async restart(instance: AgentInstance): Promise<AgentInstance> {
    await this.stop(instance);
    const config: AgentConfig = {
      name: instance.name,
      type: instance.type,
      mode: instance.mode,
    };
    return await this.start(config);
  }

  async checkStatus(instance: AgentInstance): Promise<boolean> {
    // 实现状态检查
    return true;
  }

  async configureDitingHook(instance: AgentInstance): Promise<void> {
    // 配置 diting-hook
  }
}
```

### 2. 注册适配器

在 `src/index.ts` 中注册：

```typescript
import { MyAdapter } from './adapters/MyAdapter';

constructor() {
  // ...
  this.agentManager.registerAdapter(new MyAdapter());
}
```

### 3. 添加 CLI 命令

在 `src/cli.ts` 中添加命令：

```typescript
program
  .command('my-agent')
  .description('启动 My Agent')
  .option('-n, --name <name>', 'Agent 名称')
  .action(async (options) => {
    const instance = await wukong.startAgent({
      name: options.name,
      type: 'my-agent',
      mode: RunMode.LOCAL,
    });
    console.log('My Agent started:', instance.name);
  });
```

### 4. 编写测试

在 `tests/unit/` 目录下创建测试文件：

```typescript
// tests/unit/MyAdapter.test.ts
import { describe, it, expect } from 'vitest';
import { MyAdapter } from '../../src/adapters/MyAdapter';
import { RunMode } from '../../src/types';

describe('MyAdapter', () => {
  it('should start agent', async () => {
    const adapter = new MyAdapter();
    const instance = await adapter.start({
      name: 'test',
      type: 'my-agent',
      mode: RunMode.LOCAL,
    });

    expect(instance.name).toBe('test');
  });
});
```

## 代码规范

### TypeScript 风格

- 使用 `interface` 定义公共 API
- 使用 `type` 定义联合类型和工具类型
- 优先使用 `async/await` 而不是 Promise 链
- 使用明确的类型注解，避免 `any`

### 命名规范

- 接口以 `I` 开头：`IAgentAdapter`
- 类使用 PascalCase：`AgentManager`
- 方法和变量使用 camelCase：`startAgent`
- 常量使用 UPPER_SNAKE_CASE：`MAX_RETRIES`

### 错误处理

```typescript
// 好的做法
try {
  await someOperation();
} catch (error: any) {
  throw new Error(`Failed to perform operation: ${error.message}`);
}

// 避免
try {
  await someOperation();
} catch (error) {
  console.error(error);
}
```

## 调试技巧

### 1. 启用详细日志

```bash
LOG_LEVEL=debug node dist/cli.js claude --name test
```

### 2. 使用 VS Code 调试

创建 `.vscode/launch.json`：

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug CLI",
      "program": "${workspaceFolder}/dist/cli.js",
      "args": ["claude", "--name", "test"],
      "preLaunchTask": "npm: build",
      "outFiles": ["${workspaceFolder}/dist/**/*.js"]
    }
  ]
}
```

### 3. 检查生成的文件

```bash
# 查看编译输出
ls -la dist/

# 查看数据文件
cat ~/.wukong/identities.json
cat ~/.wukong/instances.json
```

## 发布流程

### 1. 更新版本

```bash
npm version patch  # 0.1.0 -> 0.1.1
npm version minor  # 0.1.0 -> 0.2.0
npm version major  # 0.1.0 -> 1.0.0
```

### 2. 构建

```bash
npm run build
```

### 3. 测试

```bash
npm test
./scripts/test-cli.sh
```

### 4. 发布

```bash
npm publish
```

## 贡献指南

### 提交代码

1. Fork 仓库
2. 创建特性分支：`git checkout -b feature/my-feature`
3. 提交更改：`git commit -am 'Add some feature'`
4. 推送分支：`git push origin feature/my-feature`
5. 创建 Pull Request

### Commit 消息规范

使用 Conventional Commits：

```
feat: 添加新功能
fix: 修复 bug
docs: 更新文档
test: 添加测试
refactor: 重构代码
chore: 构建/工具链更新
```

示例：
```
feat: add Cursor adapter support
fix: resolve identity registration race condition
docs: update usage guide with sandbox examples
```

## 常见问题

### Q: 如何调试适配器？

A: 在适配器中添加日志：

```typescript
console.log('[MyAdapter] Starting agent:', config.name);
```

### Q: 如何模拟天枢 API？

A: 修改 `TianshuClient` 返回模拟数据，或使用 mock 服务器。

### Q: 如何测试沙箱模式？

A: 需要安装 Docker 或 gVisor，然后运行集成测试。

## 资源链接

- [TypeScript 文档](https://www.typescriptlang.org/docs/)
- [Commander.js 文档](https://github.com/tj/commander.js)
- [Vitest 文档](https://vitest.dev/)
- [Docker 文档](https://docs.docker.com/)
- [gVisor 文档](https://gvisor.dev/)
