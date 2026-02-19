# 危险操作与 Matrix 房间审批验证

**目的**：在同一间已加入的 Matrix 房间内，完成「用户 / Agent 对话 → Agent 执行危险操作 → 谛听拦截 → 审批请求发到该房间 → 用户在房间内批准/拒绝」的验证。

---

## 1. 房间复用

- **可以**。native-demo 创建并邀请你加入的那间房间（如 `!qSmjiJIqbGzatDHrAn:xyin.oicp.net`）后续测试**都可以继续用**。
- 建议把该 **room_id** 配成天枢的 **DELIVERY_ROOM_ID**，这样所有「审批请求」都会发到这间房，你在 Element 里统一处理即可。

**配置**：在 `.env` 中增加（把下面的 `!xxx:xyin.oicp.net` 换成你实际收到的 room_id）：

```bash
DELIVERY_ROOM_ID=!qSmjiJIqbGzatDHrAn:xyin.oicp.net
```

修改后重启天枢容器使配置生效。

---

## 2. 验证流程概览

| 步骤 | 说明 |
|------|------|
| 1 | Agent（如悟空）向谛听发起需审批的请求（如 `POST /auth/exec` 执行危险操作） |
| 2 | 谛听策略判定为 review → 创建 CHEQ → **将审批请求投递到天枢** |
| 3 | 天枢把审批请求发到 **DELIVERY_ROOM_ID** 对应的 Matrix 房间 |
| 4 | 你在 Element 该房间内看到审批消息，点击「批准」链接或回复「通过」/「拒绝」 |
| 5 | 谛听收到审批结果 → 放行或拒绝 Agent 的请求 |

---

## 3. 当前已具备

- **天枢**  
  - 已提供 **POST /api/v1/delivery/approval-request**，供谛听（或脚本）把审批请求投递到指定 Matrix 房间。  
  - 请求体示例：`{"request_id":"<cheq_id>","title":"...","description":"...","trace_id":"...","gateway_base_url":"http://diting:8080"}`。  
  - 天枢会向 **DELIVERY_ROOM_ID** 发一条 `approval_request` 投递消息，payload 中带 `approve_url`、`reject_url`（指向谛听 `/cheq/approve`）。
- **DELIVERY_ROOM_ID**  
  - 在 `.env` 和 compose 中已支持，设为上述房间 ID 即可复用该房间做所有审批测试。

---

## 4. 谛听天枢投递（已实现）

- 谛听已实现**天枢投递渠道**（`diting/internal/delivery/tianshu`）：CHEQ 创建后调用天枢 `POST /api/v1/delivery/approval-request`，请求体含 `request_id`、`title`、`description`、`trace_id`、`gateway_base_url`。
- **启用方式**：在配置中设置 `delivery.tianshu.enabled: true` 并配置 `delivery.tianshu.base_url`（如 `http://tianshu:8080`），或使用环境变量 `DITING_TIANSHU_ENABLED=true`、`DITING_TIANSHU_BASE_URL=http://tianshu:8080`。compose 下可参考 `deploy/env.example` 与 `deploy/docker-compose.integration.yml`。

---

## 5. 先做一次「审批进房间」的联调

在谛听未接天枢前，可以**手动**调天枢接口，确认审批消息会出现在你已加入的 Matrix 房间：

1. 在 `.env` 中配置 **DELIVERY_ROOM_ID** 为你的房间 ID，重启天枢。
2. 调用天枢审批接口（`gateway_base_url` 换成你本机可访问的谛听地址，例如宿主机访问用 `http://localhost:8080`）：

```bash
curl -s -X POST http://localhost:8082/api/v1/delivery/approval-request \
  -H "Content-Type: application/json" \
  -d '{
    "request_id": "test-cheq-001",
    "title": "【联调】危险操作审批",
    "description": "这是一条测试审批，用于确认 Matrix 房间能收到。",
    "trace_id": "trace-1",
    "gateway_base_url": "http://localhost:8080"
  }'
```

3. 在 Element 中打开该房间，应看到一条审批消息；消息中的「批准」「拒绝」链接会指向 `http://localhost:8080/cheq/approve?id=test-cheq-001&approved=true|false`。若谛听在本机 8080 运行，点击后谛听会收到请求（实际 CHEQ 可能不存在，但可验证链接可达）。

完成以上即说明：**同一房间可复用**，且**审批请求能进该 Matrix 房间**。下一步是谛听在创建 CHEQ 时调用天枢该接口，即可完成「与 Agent 对话 → 危险操作 → 审批在该房间」的端到端验证。
