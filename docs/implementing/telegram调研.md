# Telegram Bot API 调研

## 1. 概述

### 1.1 是什么

Telegram Bot API 是 Telegram 提供的用于程序化控制机器人的 HTTP API。通过 Bot API，开发者可以：

- 接收和回复消息
- 发送多媒体文件（图片、视频、音频、文档）
- 创建和管理群组
- 使用内联键盘和回调按钮
- 处理支付（需要额外配置）

### 1.2 官方文档

- **官方文档**: https://core.telegram.org/bots/api
- **BotFather**: https://t.me/BotFather（在 Telegram 中搜索添加）
- **API 详细说明**: https://core.telegram.org/bots/api#available-methods

---

## 2. 快速开始

### 2.1 创建机器人

1. 在 Telegram 中搜索 **BotFather** 并添加为好友
2. 发送命令 `/newbot` 创建新机器人
3. 按提示输入机器人名称（display name）
4. 按提示输入用户名（username，必须以 bot 结尾，如 `MyAssistantBot`）
5. 创建成功后，BotFather 会返回 **Bot Token**，格式类似：
   ```
   1234567890:ABCdefGHIjklMNOpqrsTUVwxyz
   ```
6. **重要**：妥善保存 Token，不要泄露到公开代码库

### 2.2 配置机器人

可以通过 BotFather 配置机器人：

- `/mybots` - 查看你的机器人列表
- `/setdescription` - 设置机器人描述
- `/setaboutinfo` - 设置关于信息
- `/setcommands` - 设置命令菜单
- `/setinline` - 设置内联模式

---

## 3. 消息接收

### 3.1 Webhook 方式（推荐）

Telegram 将更新推送到你的服务器。

**配置 Webhook**:
```
https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://your-server.com/webhook
```

**取消 Webhook**:
```
https://api.telegram.org/bot<TOKEN>/deleteWebhook
```

**优势**:
- 实时推送，无需轮询
- 无 API 调用频率限制
- 适合生产环境

**劣势**:
- 需要公网可访问的 HTTPS 端点
- 需要处理 SSL 证书

### 3.2 Long Polling 方式

客户端轮询 Telegram 服务器获取更新。

**获取更新**:
```
GET https://api.telegram.org/bot<TOKEN>/getUpdates
```

**优势**:
- 简单易实现
- 适合开发和测试
- 不需要公网访问

**劣势**:
- 有频率限制（建议 30 秒以上间隔）
- 实时性稍差

### 3.3 支持的消息类型

| 类型 | 说明 |
|------|------|
| Text | 文本消息 |
| Photo | 图片 |
| Video | 视频 |
| Voice | 语音 |
| Document | 文档 |
| Sticker | 表情包 |
| Location | 位置 |
| Contact | 联系人 |
| Audio | 音频 |
| Animation | 动画 (GIF) |
| VideoNote | 视频消息 |
| Poll | 投票 |
| Dice | 骰子 |

---

## 4. 消息发送

### 4.1 基础发送

```bash
# 发送文本消息
curl -X POST "https://api.telegram.org/bot<TOKEN>/sendMessage" \
  -d "chat_id=<CHAT_ID>" \
  -d "text=Hello, World!"
```

### 4.2 支持的消息格式

#### Markdown 模式
```json
{
  "chat_id": "<CHAT_ID>",
  "text": "*粗体* _斜体_ `代码` [链接](https://example.com)",
  "parse_mode": "MarkdownV2"
}
```

#### HTML 模式
```json
{
  "chat_id": "<CHAT_ID>",
  "text": "<b>粗体</b> <i>斜体</i> <code>代码</code> <a href=\"https://example.com\">链接</a>",
  "parse_mode": "HTML"
}
```

> **注意**: MarkdownV2 转义规则复杂，建议使用 HTML 模式。

### 4.3 Inline Keyboard（内联按钮）

```json
{
  "chat_id": "<CHAT_ID>",
  "text": "请选择:",
  "reply_markup": {
    "inline_keyboard": [
      [
        {"text": "按钮1", "callback_data": "btn1"},
        {"text": "按钮2", "callback_data": "btn2"}
      ],
      [
        {"text": "链接按钮", "url": "https://example.com"}
      ]
    ]
  }
}
```

**按钮类型**:
- `callback_data`: 点击后发送回调数据给机器人
- `url`: 打开外部链接
- `switch_inline_query`: 切换到内联查询
- `login_url`: 登录 URL（用于 OAuth）

### 4.4 回复和引用

```json
{
  "chat_id": "<CHAT_ID>",
  "text": "这是回复",
  "reply_to_message_id": 123
}
```

---

## 5. 典型使用场景

### 5.1 私聊消息

机器人与用户一对一通信。

- 用户主动发起私聊
- 机器人可以发送消息、按钮、文件
- 可获取用户信息（username、头像等）

### 5.2 群组消息

机器人加入群组后，可以：

- 监听群组消息（需要配置群管理员）
- 发送消息到群组
- 使用群组内的内联模式（@bot query）

**群组权限配置**:
```json
{
  "chat_id": "<GROUP_ID>",
  "permissions": {
    "can_send_messages": true,
    "can_send_media_messages": true,
    "can_send_polls": true,
    "can_invite_users": true
  }
}
```

### 5.3 频道消息

- 机器人作为频道管理员
- 发送广播消息到频道
- 频道消息通常是单向的

### 5.4 内联模式

用户可在任意聊天中输入 `@机器人 查询内容`，机器人返回搜索结果。

配置方式：通过 BotFather 的 `/setinline` 命令设置。

---

## 6. 常用 API 列表

| API | 说明 |
|-----|------|
| `getMe` | 获取机器人信息 |
| `getUpdates` | 获取更新（Long Polling） |
| `sendMessage` | 发送文本消息 |
| `sendPhoto` | 发送图片 |
| `sendDocument` | 发送文档 |
| `sendVideo` | 发送视频 |
| `sendAudio` | 发送音频 |
| `sendVoice` | 发送语音 |
| `sendLocation` | 发送位置 |
| `editMessageText` | 编辑消息 |
| `deleteMessage` | 删除消息 |
| `answerCallbackQuery` | 响应回调按钮 |
| `setWebhook` | 设置 Webhook |
| `getChat` | 获取聊天信息 |
| `getChatMember` | 获取群成员信息 |

---

## 7. 代码示例

### 7.1 Python (使用 python-telegram-bot)

```python
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import Application, CommandHandler, MessageHandler, CallbackQueryHandler, filters, ContextTypes

# 初始化应用
app = Application.builder().token("YOUR_BOT_TOKEN").build()

# 处理 /start 命令
async def start_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text(
        "你好！我是 Telegram 机器人",
        reply_markup=InlineKeyboardMarkup([
            [InlineKeyboardButton("点击我", callback_data="btn_click")]
        ])
    )

# 处理按钮回调
async def button_click(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()
    await query.edit_message_text(text="你点击了按钮!")

# 处理文本消息
async def echo(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text(f"你发送了: {update.message.text}")

# 注册处理器
app.add_handler(CommandHandler("start", start_command))
app.add_handler(CallbackQueryHandler(button_click))
app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, echo))

# 启动机器人（Webhook 模式）
app.run_webhook(
    listen="0.0.0.0",
    port=8443,
    webhook_url="https://your-domain.com/webhook"
)

# 或者使用 Long Polling（仅开发测试）
# app.run_polling()
```

### 7.2 Node.js (使用 node-telegram-bot-api)

```javascript
const TelegramBot = require('node-telegram-bot-api');

// Webhook 模式
const bot = new TelegramBot('YOUR_BOT_TOKEN', { webHook: { port: 8443 } });
bot.setWebHook('https://your-domain.com/webhook');

// Long Polling 模式（仅开发测试）
// const bot = new TelegramBot('YOUR_BOT_TOKEN', { polling: true });

// 处理 /start 命令
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, '你好！我是 Telegram 机器人', {
        reply_markup: {
            inline_keyboard: [
                [{ text: '点击我', callback_data: 'btn_click' }]
            ]
        }
    });
});

// 处理按钮回调
bot.on('callback_query', (query) => {
    const chatId = query.message.chat.id;
    bot.answerCallbackQuery(query.id);
    bot.editMessageText('你点击了按钮!', {
        chat_id: chatId,
        message_id: query.message.message_id
    });
});

// 处理文本消息
bot.on('message', (msg) => {
    if (msg.text && !msg.text.startsWith('/')) {
        bot.sendMessage(msg.chat.id, `你发送了: ${msg.text}`);
    }
});
```

---

## 8. 如何集成到天枢

### 8.1 整体架构

```
用户 (Telegram)
    ↓
Telegram Platform Adapter (天枢模块)
    ↓
消息路由器
    ↓
业务逻辑处理
```

### 8.2 集成步骤

1. **创建 Telegram Bot**
   - 通过 BotFather 创建机器人
   - 获取 Bot Token
   - 配置必要的命令和描述

2. **实现 Webhook 接收器**
   - 在天枢中创建 `/telegram/webhook` 端点
   - 处理 POST 请求中的 JSON 数据
   - 解析 `Update` 对象，提取消息内容

3. **实现消息处理器**
   - 文本消息处理
   - 多媒体消息处理
   - 回调按钮处理
   - 命令处理

4. **实现消息发送器**
   - 将业务响应转换为 Telegram 消息格式
   - 调用 Telegram Bot API 发送消息
   - 支持内联按钮、HTML 格式等

5. **配置 HTTPS**
   - 使用 Nginx 反向代理
   - 配置 SSL 证书（Let's Encrypt）
   - 确保公网可访问 webhook URL

### 8.3 关键代码结构

```python
# 天枢 Telegram Adapter 示例

class TelegramAdapter:
    def __init__(self, token: str):
        self.token = token
        self.api_url = f"https://api.telegram.org/bot{token}"
    
    async def handle_webhook(self, request: Request):
        data = await request.json()
        update = Update.from_dict(data)
        
        if update.message:
            await self.handle_message(update.message)
        elif update.callback_query:
            await self.handle_callback(update.callback_query)
    
    async def send_message(self, chat_id: int, text: str, 
                          parse_mode: str = "HTML",
                          reply_markup: dict = None):
        payload = {
            "chat_id": chat_id,
            "text": text,
            "parse_mode": parse_mode
        }
        if reply_markup:
            payload["reply_markup"] = json.dumps(reply_markup)
        
        async with aiohttp.post(
            f"{self.api_url}/sendMessage",
            json=payload
        ) as resp:
            return await resp.json()
```

### 8.4 配置建议

- **Webhook URL**: `https://tianzi.example.com/api/telegram/webhook`
- **Bot Token**: 存储在天枢配置中，使用环境变量
- **群组支持**: 需要配置群组管理员权限
- **错误处理**: 实现重试机制和日志记录

---

## 9. 注意事项

1. **Bot Token 安全**: 不要将 Token 硬编码到代码中，使用环境变量或密钥管理服务
2. **频率限制**: 普通机器人每条消息发送限制为约 30 条/秒
3. **文件大小**: 最大 50MB（通过 Bot API 上传）
4. **隐私模式**: 用户首次私聊时，需要机器人先发送消息才能接收用户消息
5. **群组权限**: 机器人需要管理员权限才能查看群组消息内容

---

## 10. 参考资源

- [Telegram Bot API 官方文档](https://core.telegram.org/bots/api)
- [python-telegram-bot 库](https://python-telegram-bot.org/)
- [node-telegram-bot-api 库](https://github.com/yagop/node-telegram-bot-api)
- [BotFather 机器人](https://t.me/BotFather)
