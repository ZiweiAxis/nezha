# 快速开始指南

## 5 分钟上手悟空

### 第一步：安装

```bash
cd /home/dministrator/workspace/ziwei/wukong
npm install
npm run build
npm link
```

### 第二步：验证安装

```bash
wukong --version
# 输出: 0.1.0

wukong --help
# 显示所有可用命令
```

### 第三步：注册身份

```bash
wukong identity --register my-first-agent --type claude
```

输出：
```
✅ Identity 'my-first-agent' registered successfully.
   ID: my-first-agent-1708070400000
   Status: pending
   Risk Level: medium
```

### 第四步：启动 Agent

```bash
wukong claude --name my-first-agent --mode local
```

输出：
```
✅ Claude Agent started successfully!
   Name: my-first-agent
   PID: 12345
   Mode: local
   Status: running
```

### 第五步：查看状态

```bash
wukong list
```

输出：
```
Running Agents:
────────────────────────────────────────────────────────────────────────────────
NAME                 TYPE       STATUS       PID      MODE
────────────────────────────────────────────────────────────────────────────────
my-first-agent       claude     running      12345    local
```

### 第六步：管理 Agent

```bash
# 查看详细状态
wukong status my-first-agent

# 查看日志
wukong logs my-first-agent

# 停止 Agent
wukong stop my-first-agent

# 重启 Agent
wukong restart my-first-agent
```

## 常用场景

### 场景 1：开发环境

```bash
# 启动本地 Agent 用于开发
wukong claude --name dev-agent --mode local --work-dir ~/projects/my-app

# 实时查看日志
wukong logs dev-agent -n 100
```

### 场景 2：测试环境

```bash
# 使用 Docker 沙箱
wukong claude --name test-agent --mode sandbox --auto-restart

# 检查状态
wukong status test-agent
```

### 场景 3：生产环境

```bash
# 使用 gVisor 深度沙箱
wukong claude --name prod-agent --mode deep-sandbox --auto-restart

# 监控运行状态
watch -n 5 wukong list
```

### 场景 4：批量管理

```bash
# 启动多个 Agent
wukong claude --name agent-1 --mode local
wukong claude --name agent-2 --mode local
wukong claude --name agent-3 --mode local

# 查看所有 Agent
wukong list

# 停止所有 Agent
wukong list | tail -n +4 | awk '{print $1}' | xargs -I {} wukong stop {}
```

## 配置环境变量

创建 `.env` 文件：

```bash
cat > .env << EOF
TIANSHU_API_URL=http://localhost:3000
TIANSHU_API_KEY=your-api-key-here
WUKONG_DATA_DIR=~/.wukong
LOG_LEVEL=info
EOF
```

## 故障排查

### 问题：Agent 无法启动

**解决方案**：
```bash
# 1. 检查身份状态
wukong identity --list

# 2. 查看错误日志
wukong logs my-agent

# 3. 检查进程
ps aux | grep claude
```

### 问题：找不到 wukong 命令

**解决方案**：
```bash
# 重新链接
cd /home/dministrator/workspace/ziwei/wukong
npm link

# 或者直接运行
node dist/cli.js --help
```

### 问题：权限错误

**解决方案**：
```bash
# 检查数据目录权限
ls -la ~/.wukong

# 修复权限
chmod -R 755 ~/.wukong
```

## 下一步

- 📖 阅读 [完整使用指南](./docs/USAGE.md)
- 🔧 查看 [开发者文档](./docs/DEVELOPMENT.md)
- 🗺️ 了解 [功能路线图](./ROADMAP.md)
- 📝 查看 [项目总结](./PROJECT_SUMMARY.md)

## 获取帮助

```bash
# 查看命令帮助
wukong --help
wukong claude --help
wukong identity --help

# 查看版本信息
wukong --version
```

## 卸载

```bash
# 取消链接
npm unlink -g @ziwei/wukong

# 删除数据
rm -rf ~/.wukong
```

---

🎉 恭喜！你已经成功上手悟空！
