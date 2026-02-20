# Story 1.4: 审批归属配置（WUKONG_OWNER_ID）

Status: ready-for-dev

## Story
As a 运维/管理员, I want 通过配置（如 WUKONG_OWNER_ID）与天枢/谛听约定审批归属（如 Element 房间）, So that 审批请求推送到正确的审批人。

## Acceptance Criteria
1. **Given** 已配置 WUKONG_OWNER_ID **When** 注册或治理触发审批 **Then** 天枢/谛听使用该约定投递审批（如 DELIVERY_ROOM_ID） **And** 文档说明 Element+hulk 端到端时的配置（FR4、FR20）

## Tasks
- [x] WUKONG_OWNER_ID 从 env 与 config 文件读取并用于注册
- [x] 文档或注释说明 Element/DELIVERY_ROOM_ID 约定

## File List
- src/utils/config.ts, src/clients/TianshuClient.ts, src/index.ts, docs 或 README
