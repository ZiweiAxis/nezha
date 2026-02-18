# 审批请求与批准回复的 Channel 约定

## 1. 当前逻辑回顾

### 1.1 审批请求的投递（谁发、发到哪）

| 环节 | 说明 |
|------|------|
| 发起方 | 谛听：在 CHEQ 创建或 init_permission 时调用投递 Provider。 |
| 投递渠道 | 可配置：天枢（Matrix 房间）、飞书等。由谛听配置 `delivery.tianshu` / `delivery.feishu` 决定。 |
| 天枢侧 | 收到 `POST /api/v1/delivery/approval-request` 后，向 **DELIVERY_ROOM_ID** 发一条 Matrix 消息，payload 含 title、description、**approve_url**、**reject_url**（以及可选 request_id、trace_id）。 |
| 审核人 | 在 Element（或飞书等）看到审批消息；消息中的链接指向 **批准/拒绝** 的 HTTP 地址。 |

### 1.2 审核人「批准」时回复走哪个 Channel

当前只有一种方式：

| Channel | 说明 | 谁接收批准结果 |
|---------|------|----------------|
| **HTTP 链接** | 消息中带 `approve_url` / `reject_url`，指向谛听 `{gateway_base_url}/cheq/approve?id={cheq_id}&approved=true|false`。审核人**点击链接**后，浏览器/客户端对谛听发起 GET 请求。 | **谛听** 直接接收（`/cheq/approve`）。 |

即：**批准回复的 channel = HTTP，接收方 = 谛听**；无需经过天枢或其它 bot。

### 1.3 可选：同一 Channel 内「回复即批准」（Matrix Channel Bot）

可在不点链接的前提下，在 **同一 Matrix 房间内** 用文字回复完成批准/拒绝：

| Channel | 说明 | 谁接收批准结果 |
|---------|------|----------------|
| **Matrix 回复** | 审核人在审批消息下**回复「批准」或「拒绝」**。天枢网关（作为 Matrix 房间内 bot）收到该回复，解析出对应的 cheq_id，再代调谛听 `GET /cheq/approve?id=...&approved=...`。 | 先到 **天枢（channel bot）**，再由天枢请求 **谛听**。 |

这样，审批请求与批准回复都走 **Matrix 这一条 channel**，由天枢担任「审批回复的 channel bot」。

---

## 2. 配置：一个或多个 Channel Bot

- **当前**：仅「HTTP 链接」一种批准回复 channel；链接直连谛听，不经过 bot。
- **可扩展**：
  - **Matrix channel bot**：天枢网关在 DELIVERY_ROOM 内监听对审批消息的「批准/拒绝」回复，代调谛听 `/cheq/approve`。通过配置开关（如 `APPROVAL_REPLY_VIA_MATRIX=true`）启用。
  - **飞书 channel bot**：已有卡片按钮/回调等，由谛听直接接收（或经天枢转发），逻辑可保持现有方式。
  - 未来可增加更多 channel（如企业微信、Slack），每个 channel 一个 bot：负责把「审核人在该 channel 的操作」转成对谛听的 `/cheq/approve` 调用。

配置（天枢侧）：

- **APPROVAL_REPLY_VIA_MATRIX**（环境变量，默认 false）：为 `true` 时启用「Matrix 回复即批准」；审批消息中会增加提示「回复「批准」或「拒绝」到本消息也可完成审批」。
- 代调谛听时使用的基址：由审批请求体中的 **gateway_base_url** 提供（谛听在调用天枢投递时传入），天枢在发审批消息时按 (room_id, event_id) 存储，收到回复时用该 base 调用 `GET {gateway_base_url}/cheq/approve?id=...&approved=...`。

---

## 3. 小结

- **审核人批准时回复使用哪个 channel**：当前为 **HTTP 链接**（直连谛听）；可选增加 **Matrix 回复**，由天枢作为 channel bot 代调谛听。
- **配置一个或多个 channel bot**：通过开关与回调基址配置即可；Matrix 场景下天枢网关即该 channel 的 bot，无需额外进程。
