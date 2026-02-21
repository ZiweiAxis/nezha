# E006: 天枢集成 Telegram

## 概述

| 属性 | 值 |
|------|-----|
| Epic ID | E006 |
| 名称 | 天枢 Telegram 消息渠道 |
| 描述 | 让天枢能够接收和发送 Telegram 消息 |
| 状态 | 🆕 新建 |
| 优先级 | P0 |
| 依赖方 | - |

## 背景

紫微系统需要支持多渠道消息：
- **Telegram** 是重要的消息渠道之一
- 天枢需要能够接收和发送 Telegram 消息
- 需要实现消息格式转换和渠道适配

## 目标

1. 实现 Telegram Bot API 对接
2. 支持消息接收和发送
3. 实现消息格式转换
4. 支持频道和群组消息

## Stories

| Story | 名称 | 描述 |
|-------|------|------|
| S016 | Telegram Bot API 调研 | 调研 Telegram Bot API 功能 |
| S017 | Telegram 客户端实现 | 实现 Telegram 消息客户端 |
| S018 | 消息格式转换 | 实现天枢消息与 Telegram 消息格式转换 |
| S019 | 频道和群组支持 | 支持 Telegram 频道和群组消息 |
| S020 | Long Polling 支持 | 实现 Long Polling 轮询机制 |
| S021 | 持续运行服务 | 创建持续运行的 Bot 服务处理回调 |
| S022 | 链上 DID 注册 | 实现链上 DID 注册模块 (I-018) |
| S023 | 谛听权限通知 | 实现谛听权限通知模块 (E4-S4) |

---

## 验收标准 (Acceptance Criteria)

- [x] 天枢能够接收 Telegram 消息
- [x] 天枢能够发送 Telegram 消息
- [x] 支持私聊和群组消息
- [ ] 文档完整

## Definition of Done

- [x] Telegram Bot 能够接收消息
- [x] Telegram Bot 能够发送消息
- [x] 消息格式转换正确
- [ ] 单元测试覆盖率 > 80%
- [ ] 集成测试通过
- [ ] 文档完整（README + API 文档）

---

## S016: Telegram Bot API 调研

### 任务

- [x] 调研 Telegram Bot API 功能
- [x] 分析消息接收/发送机制
- [x] 了解 Webhook 和 Long Polling 两种方式
- [x] 编写技术调研报告

### 调研要点

1. Telegram Bot API 核心端点
2. Webhook 配置和使用
3. 消息类型支持（文本、图片、文件等）
4. 频道和群组权限

### 输出

- 技术调研报告
- 集成方案设计文档

---

## S017: Telegram 客户端实现

### 任务

- [x] 实现 Telegram 客户端库
- [ ] 支持 Webhook 接收消息
- [ ] 支持发送各种类型消息

### 实现要点

```go
type TelegramClient struct {
    botToken string
    apiURL   string
    client   *http.Client
}

type MessageHandler func(*TelegramMessage)
```

### 客户端功能

| 方法 | 功能 |
|------|------|
| NewTelegramClient | 创建 Telegram 客户端 |
| SendMessage | 发送文本消息 |
| SendPhoto | 发送图片 |
| SendDocument | 发送文件 |
| SetWebhook | 配置 Webhook |
| HandleUpdate | 处理 Webhook 更新 |

---

## S018: 消息格式转换

### 任务

- [x] 实现 Telegram 消息到天枢消息的转换
- [x] 实现天枢消息到 Telegram 消息的转换
- [ ] 支持消息类型映射

### 消息转换规则

| Telegram | 天枢 |
|-----------|------|
| text | text |
| photo | image |
| document | file |
| voice | audio |
| sticker | custom |

### 实现要点

1. 解析 Telegram Update 结构
2. 转换为天枢 Message 格式
3. 处理附件下载和上传

---

## S019: 频道和群组支持

### 任务

- [ ] 支持频道消息接收
- [ ] 支持群组消息接收
- [x] 实现机器人命令处理

### 功能清单

1. 频道消息的接收和发送
2. 群组消息的接收和发送
3. @机器人命令处理
4. 回调按钮（Callback Query）处理

### 配置项

```yaml
telegram:
  bot_token: "${TELEGRAM_BOT_TOKEN}"
  webhook_url: "https://your-domain.com/webhook/telegram"
  allowed_chats: []
  admin_users: []
```

---

## S020: Long Polling 支持

### 任务

- [x] 实现 Long Polling 轮询机制
- [x] start_polling() 启动轮询
- [x] stop_polling() 停止轮询
- [x] 回调处理支持

### 状态

✅ 已完成

---

## S021: 持续运行服务

### 任务

- [ ] 创建 Telegram Bot 服务主程序
- [x] 实现审批回调处理
- [ ] 集成獬豸审批 API
- [ ] Docker 容器化部署

### 实现要点

1. **主程序** - `src/telegram_bot.py`
   - 启动时初始化 Long Polling
   - 监听回调事件
   - 错误处理和重连机制

2. **审批回调处理**
   ```python
   async def handle_approval(query_id: str, request_id: str, approved: bool):
       # 调用獬豸审批 API
       await xiezhi.approve(request_id, approved)
       # 回复用户
       await bot.answer_callback(query_id, "✅ 已批准")
   ```

3. **Docker 部署**
   ```dockerfile
   CMD ["python", "-m", "src.telegram_bot"]
   ```

### 验收标准

- [ ] Long Polling 持续运行
- [ ] 能接收审批回调
- [ ] 能调用獬豸 API
- [ ] Docker 容器可部署

---

## S022: 链上 DID 注册

### 任务

- [ ] 创建 diting_client 模块
- [x] 实现 chain_did.py 注册函数
- [ ] 对接谛听链上 DID 接口

### 实现要点

```python
# src/diting_client/chain_did.py
async def register_did_on_chain(agent_id: str, owner_id: str) -> Dict[str, Any]:
    """
    在链上注册 DID
    
    Args:
        agent_id: Agent ID
        owner_id: Owner ID
    
    Returns:
        {"ok": True, "did": "did:agent:xxx"}
    """
```

### 配置

```python
DITING_CHAIN_URL = os.getenv("DITING_CHAIN_URL", "http://diting:8080/chain")
```

### 验收标准

- [ ] 能调用链上 DID 注册接口
- [ ] 返回标准 DID 格式
- [ ] 错误处理完善

---

## S023: 谛听权限通知

### 任务

- [x] 实现 init_permission.py 通知函数
- [ ] 对接谛听权限初始化接口
- [ ] 处理注册后权限同步

### 实现要点

```python
# src/diting_client/init_permission.py
async def notify_agent_registered(agent_id: str, owner_id: str) -> Dict[str, Any]:
    """
    通知谛听 Agent 已注册，初始化权限
    
    Args:
        agent_id: Agent ID
        owner_id: Owner ID
    
    Returns:
        {"ok": True}
    """
```

### 配置

```python
DITING_INIT_PERMISSION_URL = os.getenv("DITING_INIT_PERMISSION_URL")
```

### 验收标准

- [ ] 能通知谛听权限初始化
- [ ] 与注册流程集成
- [ ] 错误处理完善

---

## S024: 回调响应优化

### 任务

- [ ] 优化回调处理速度 (< 1秒)
- [ ] 添加异步处理机制
- [ ] 添加回调确认消息

### 实现要点

```python
async def handle_callback(query_id, request_id, approved):
    # 立即回复用户
    await bot.answer_callback_query(query_id, "处理中...")
    
    # 异步处理审批
    asyncio.create_task(process_approval(request_id, approved))
```

### 验收标准

- [ ] 回调响应时间 < 1秒
- [ ] 不阻塞轮询循环

---

## S025: 代理稳定性优化

### 任务

- [ ] 添加代理自动重连
- [ ] 添加连接健康检查
- [ ] 添加代理切换机制

### 实现要点

```python
# 代理健康检查
async def check_proxy_health():
    try:
        await client.get_me()
        return True
    except:
        return False
```

### 验收标准

- [ ] 代理断线自动重连
- [ ] 保持长连接稳定

---

## S026: Webhook 部署支持

### 任务

- [ ] 实现 Webhook 接收器
- [ ] 支持 HTTPS
- [ ] 部署文档

### 验收标准

- [ ] Webhook 可接收消息
- [ ] 支持公网部署

---

## 相关文档
