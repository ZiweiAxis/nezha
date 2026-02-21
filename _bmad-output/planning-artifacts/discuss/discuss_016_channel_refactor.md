# 讨论：E016 - 天枢 Channel 模块重构

## 背景

当前天枢消息渠道代码分散在多个位置：
- `telegram/` - Telegram 客户端
- `bridge/` - 消息桥接
- `delivery/` - 消息投递
- `channel_adapter/` - 渠道适配
- 多个顶层 py 文件 (telegram_client.py, telegram_bot.py 等)

## 问题

1. 代码分散，难以维护
2. 职责不清，接口不统一
3. 新增渠道成本高

## 方案：统一 Channel 模块

### 目标架构

```
src/channel/
├── __init__.py          # 统一出口
├── base.py              # Channel 抽象基类
├── registry.py          # Channel 注册表
│
└── telegram/            # 仅实现 Telegram
    ├── __init__.py
    ├── client.py        # Telegram API 客户端
    ├── bot.py           # Bot 处理器
    ├── webhook.py       # Webhook 处理器
    ├── message.py       # 消息构建
    └── render.py        # 卡片渲染
```

**注意**：飞书/Matrix 暂不实现，后续按需扩展。

### 核心接口

```python
class Channel(ABC):
    @abstractmethod
    def send_message(self, receive_id: str, message: Message) -> Result:
        """发送消息"""
    
    @abstractmethod
    def send_card(self, receive_id: str, card: Card) -> Result:
        """发送卡片（支持按钮交互）"""
    
    @abstractmethod
    def on_message(self, handler: Callable[[Message], Response]):
        """注册消息处理器"""
    
    @abstractmethod
    def on_callback(self, handler: Callable[[Callback], Response]):
        """注册回调处理器（按钮点击）"""
```

### 迁移计划（仅 Telegram）

1. 创建 `channel/` 目录和基础抽象
2. 将 `telegram/` 代码迁移到 `channel/telegram/`
3. 将 `bridge/telegram.py` 迁移到 `channel/telegram/`
4. 将 `delivery/telegram.py` 迁移到 `channel/telegram/`
5. 清理顶层 telegram 相关文件

**飞书/Matrix 暂不实现。**

## 待确认

- [x] 只实现 Telegram
- [ ] 确认 Channel 基类接口设计
- [ ] 确认消息格式 (Message/Card 结构)
- [ ] 确认回调机制 (Callback 结构)
- [ ] 确认错误处理方式

## 相关 Issue

- 关闭 `telegram/` 模块
- 关闭 `bridge/` 模块
- 关闭 `delivery/` 模块

---

**讨论时间**: 2026-02-21
**状态**: ✅ 已确认，Sub-Agent 并行推进
