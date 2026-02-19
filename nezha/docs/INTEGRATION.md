# 悟空集成与约定（FR18–FR20）

## 天枢 API

- 注册：`POST /api/v1/agents/register`（body: `owner_id`, `agent_display_id`）
- 心跳：`POST /api/v1/agents/heartbeat`
- 审批状态：`GET /api/v1/agents/:id` 返回 `status`（pending/approved/rejected/timeout）

兼容策略以天枢文档与约定版本为准；API 变更时见发布说明。

## 审批归属与 Element（W1/W3）

- **WUKONG_OWNER_ID**：与天枢/谛听约定审批归属，对应 Element 侧房间或审批人标识。
- **DELIVERY_ROOM_ID**：谛听/Element 端到端时，审批请求投递到该房间；与 WUKONG_OWNER_ID 配置一致即可复现闭环（W1/W3）。
- **W2**：若天枢支持待审批，悟空通过审批状态展示与轮询处理；见 USAGE 审批状态与重试说明。
