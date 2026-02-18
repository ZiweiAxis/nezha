# 跨平台 IM 机器人"纯按钮交互"统一实施方案

## 1. 核心范围界定

- **交互类型**：仅支持按钮点击
- **响应动作**：仅支持更新当前卡片 或 引导跳转 H5
- **传输通道**：完全屏蔽 HTTP 回调与 WebSocket 的差异，业务层无感知

---

## 2. 统一数据模型

### 2.1 统一点击事件

当用户点击按钮时，中间件传递以下结构：

```json
{
  "action_key": "approve",
  "action_value": {},
  "message_id": "xxx",
  "user_id": "xxx",
  "timestamp": 1700000000
}
```

---

## 3. 架构分层

### 3.1 接入层
- **职责**：监听消息通道，解决"连得上"的问题
- HTTP 模式：监听 Webhook URL，处理验签，接收 POST 请求体
- Socket 模式：管理 WebSocket 连接，处理心跳，接收消息帧
- **输出**：将"原始报文"透传给适配层

### 3.2 适配层
- **职责**：协议转换与响应执行，屏蔽差异的核心
- 转换逻辑：将各平台原始报文解析为统一点击事件
- 响应执行器：封装底层响应差异

### 3.3 业务层
- **职责**：处理具体业务逻辑
- 接收统一事件模型
- 根据 action_key 路由到具体的业务处理器

---

## 4. 关键难点：屏蔽 Socket 与 HTTP 的响应差异

### 4.1 响应差异现状

| 类型 | 平台 | 响应方式 |
|------|------|----------|
| 即时响应型 | Discord, Teams | 在当前连接中立即返回新卡片 JSON |
| API 调用型 | Slack, 企业微信, 钉钉 | 先确认收到，再调用 API 更新卡片 |

### 4.2 统一抽象方案

适配层在调用业务层前，会根据当前连接类型注入一个 **ResponseExecutor**（响应执行器）。

**业务层视角**：
```python
context.updateCard(cardData)  # 更新卡片
context.redirectUrl(url)      # 跳转链接
```

**底层逻辑（适配层自动完成）**：
- 场景 A（即时响应型）：直接写入 HTTP Response 或 WebSocket Buffer
- 场景 B（API 调用型）：先返回 200/ACK，再调用平台 UpdateMessage API

---

## 5. 统一响应接口

### 5.1 更新卡片
- **语义**：修改当前卡片的内容或状态
- **参数**：统一的卡片结构定义

### 5.2 跳转链接
- **语义**：引导用户跳转到 H5 页面
- **适配逻辑**：
  - 支持跳转的平台：下发跳转指令
  - 不支持的平台：降级为更新卡片，插入 Link 按钮

---

## 6. 业务开发实施流程

### 步骤 1：定义按钮标识
为每个按钮定义唯一的 action_key（如 approve、reject、view_detail）

### 步骤 2：编写业务处理器
```python
def onButtonClick(event, context):
    if event.action_key == "approve":
        # 执行业务逻辑
        orderService.approve(event.action_value.orderId)
        
        # 构造响应卡片
        newCard = {"text": "审批已通过", "buttons": []}
        
        # 统一调用更新
        context.updateCard(newCard)
    elif event.action_key == "view_detail":
        context.redirectUrl("https://app.com/order/123")
```

---

## 7. 总结

- **模型极简**：只有按钮，没有输入框，数据流清晰
- **通道透明**：业务代码不需要区分 Socket 和 HTTP
- **响应统一**：更新卡片或跳转 H5 只需调用统一接口
