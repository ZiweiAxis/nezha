# 悟空使用指南

## 安装

### 从源码安装

```bash
cd wukong
npm install
npm run build
npm link
```

### 验证安装

```bash
wukong --version
```

## 基本使用

### 1. 启动 Claude Agent

```bash
# 最简单的方式 - 使用默认配置
wukong claude

# 指定名称和工作目录
wukong claude --name my-project --work-dir /path/to/project

# 使用 Docker 沙箱
wukong claude --name my-project --mode sandbox

# 启用自动重启
wukong claude --name my-project --auto-restart
```

### 2. 查看运行中的 Agent

```bash
wukong list
```

输出示例：
```
Running Agents:
────────────────────────────────────────────────────────────────────────────────
NAME                 TYPE       STATUS       PID      MODE
────────────────────────────────────────────────────────────────────────────────
my-project           claude     running      12345    local
test-agent           claude     running      12346    sandbox
```

### 3. 查看 Agent 详细状态

```bash
wukong status my-project
```

输出示例：
```
Agent Status:
──────────────────────────────────────────────────────
Name:         my-project
Type:         claude
Status:       running
Mode:         local
PID:          12345
Started At:   2024-01-15T10:30:00.000Z
Restart Count: 0
```

### 4. 管理 Agent

```bash
# 停止 Agent
wukong stop my-project

# 重启 Agent
wukong restart my-project

# 查看日志
wukong logs my-project
wukong logs my-project -n 50  # 显示最后 50 行
```

### 5. 身份管理

```bash
# 注册新身份
wukong identity --register my-agent --type claude

# 列出所有已注册的身份
wukong identity --list
```

输出示例：
```
Registered Identities:
────────────────────────────────────────────────────────────────────────────────
NAME                 TYPE       STATUS       RISK       CREATED
────────────────────────────────────────────────────────────────────────────────
my-agent             claude     approved     medium     2024-01-15
test-agent           claude     pending      medium     2024-01-15
```

## 运行模式详解

### Local 模式

最简单的模式，直接在本地环境运行：

```bash
wukong claude --name my-agent --mode local
```

**特点：**
- 无隔离
- 性能最佳
- 适合开发和测试
- 可以直接访问本地文件系统

### Sandbox 模式（Docker）

在 Docker 容器中运行，提供基础隔离：

```bash
wukong claude --name my-agent --mode sandbox
```

**特点：**
- 容器级隔离
- 平衡性能和安全
- 适合生产环境
- 需要安装 Docker

**前置条件：**
```bash
# 安装 Docker
sudo apt-get install docker.io

# 启动 Docker 服务
sudo systemctl start docker
```

### Deep Sandbox 模式（gVisor）

使用 gVisor 提供深度隔离：

```bash
wukong claude --name my-agent --mode deep-sandbox
```

**特点：**
- 深度隔离
- 安全性最高
- 适合高风险场景
- 需要安装 gVisor

**前置条件：**
```bash
# 安装 gVisor
wget https://storage.googleapis.com/gvisor/releases/release/latest/x86_64/runsc
chmod +x runsc
sudo mv runsc /usr/local/bin/

# 配置 Docker 使用 gVisor
sudo runsc install
sudo systemctl restart docker
```

## 高级配置

### 环境变量

创建 `.env` 文件：

```bash
# 天枢 API 配置
TIANSHU_API_URL=http://localhost:3000
TIANSHU_API_KEY=your-api-key

# 审批归属（FR4）：与天枢/谛听约定审批人，Element 房间等
# 端到端 Element+hulk 时需与 DELIVERY_ROOM_ID 对应（W1/W3）
WUKONG_OWNER_ID=your-owner-or-room-id

# 数据目录
WUKONG_DATA_DIR=/custom/path

# 日志级别
LOG_LEVEL=debug
```

### 自动重启策略

启用自动重启：

```bash
wukong claude --name my-agent --auto-restart
```

自动重启会在以下情况触发：
- Agent 进程意外退出
- Agent 崩溃
- 系统错误

## 故障排查

### Agent 无法启动

1. 检查身份状态：
```bash
wukong identity --list
```

如果状态是 `pending`，需要等待天枢审批。

2. 检查日志：
```bash
wukong logs my-agent
```

3. 检查进程：
```bash
ps aux | grep claude
```

### Agent 频繁重启

查看重启次数：
```bash
wukong status my-agent
```

如果 `Restart Count` 很高，检查：
- 工作目录是否存在
- 环境变量是否正确
- 是否有权限问题

### 无法连接天枢

检查天枢 API 配置：
```bash
echo $TIANSHU_API_URL
```

测试连接：
```bash
curl $TIANSHU_API_URL/health
```

## 最佳实践

### 1. 使用有意义的名称

```bash
# 好的命名
wukong claude --name project-backend-dev
wukong claude --name data-analysis-prod

# 避免
wukong claude --name agent1
wukong claude --name test
```

### 2. 根据环境选择模式

- **开发环境**: 使用 `local` 模式
- **测试环境**: 使用 `sandbox` 模式
- **生产环境**: 使用 `sandbox` 或 `deep-sandbox` 模式

### 3. 定期检查状态

```bash
# 添加到 crontab
*/5 * * * * wukong list >> /var/log/wukong-status.log
```

### 4. 备份身份数据

```bash
# 备份身份和状态
cp -r ~/.wukong ~/.wukong.backup
```

## 集成示例

### 与 CI/CD 集成

```yaml
# .github/workflows/deploy.yml
name: Deploy with Wukong

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2

      - name: Install Wukong
        run: npm install -g @ziwei/wukong

      - name: Start Agent
        run: |
          wukong claude --name ci-agent --mode sandbox

      - name: Wait for Agent
        run: sleep 10

      - name: Check Status
        run: wukong status ci-agent
```

### 与监控系统集成

```bash
#!/bin/bash
# monitor.sh

# 获取所有 Agent 状态
agents=$(wukong list --json)

# 发送到监控系统
curl -X POST https://monitoring.example.com/metrics \
  -H "Content-Type: application/json" \
  -d "$agents"
```

## 常见问题

**Q: 如何更新 Agent 配置？**

A: 停止 Agent，修改配置后重新启动：
```bash
wukong stop my-agent
wukong claude --name my-agent --mode sandbox  # 新配置
```

**Q: 可以同时运行多个 Agent 吗？**

A: 可以，只要使用不同的名称：
```bash
wukong claude --name agent-1
wukong claude --name agent-2
```

**Q: 如何清理所有 Agent？**

A: 逐个停止：
```bash
wukong list | tail -n +4 | awk '{print $1}' | xargs -I {} wukong stop {}
```

**Q: 数据存储在哪里？**

A: 默认在 `~/.wukong/` 目录：
- `identities.json` - 身份数据
- `instances.json` - 实例状态
- `logs/` - 日志文件
