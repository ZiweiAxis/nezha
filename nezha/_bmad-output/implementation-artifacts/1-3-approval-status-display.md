# Story 1.3: 审批状态展示与轮询 (Approval Status Display and Polling)

Status: done

## Story

As a 开发者 (developer),  
I want 注册需审批时能看见审批状态或轮询直至通过/超时/拒绝 (to see approval status or poll until approved/timeout/rejected when registration requires approval),  
So that 我知道当前处于待审批并知晓结果 (I know current approval state and outcome).

## Acceptance Criteria

1. **Given** 天枢返回需审批（如 pending）(Tianshu returns pending approval)  
   **When** 用户等待或主动查询 (user waits or actively queries)  
   **Then** 系统展示明确状态（待审批/通过/拒绝/超时）(system shows clear status: pending/approved/rejected/timeout)  
   **And** 支持可配置轮询或文档说明手动重试（FR3、FR23 交叉）(configurable polling or documented manual retry)

## Tasks / Subtasks

- [x] Task 1: Approval status from Tianshu (AC: 1)
  - [x] Add getApprovalStatus(agentId) returning pending|approved|rejected|timeout
  - [x] Use GET /api/v1/agents/:id or equivalent; map response to display status
- [x] Task 2: Show status to user (AC: 1)
  - [x] When start fails due to pending, show current status (待审批/通过/拒绝/超时)
  - [x] When polling or verifyIdentity, log or return status for display
- [x] Task 3: Configurable polling (AC: 1)
  - [x] Support WUKONG_APPROVAL_POLL_INTERVAL_MS and WUKONG_APPROVAL_POLL_MAX_ATTEMPTS (env or config)
  - [x] Optional: poll until approved/rejected/timeout or max attempts; document manual retry in README or docs

## Dev Notes

- **FR traceability:** FR3, FR23. checkApprovalStatus currently returns boolean; need rich status for display.
- **Tianshu:** Assume GET agent by id returns status; if not, map from existing check endpoint or document as manual retry.

### References

- [Source: _bmad-output/planning-artifacts/epics.md] Epic 1, Story 1.3
- [Source: _bmad-output/planning-artifacts/prd.md] FR3, FR23

## Dev Agent Record

### Completion Notes List

- types: ApprovalDisplayStatus, ApprovalStatusResult; ITianshuClient.getApprovalStatus(agentId); TianshuClient: getApprovalStatus (GET /api/v1/agents/:id), checkApprovalStatus uses it; getIdentity implemented for same endpoint.
- config: approval_poll_interval_ms, approval_poll_max_attempts (env WUKONG_APPROVAL_POLL_*).
- IdentityManager.verifyIdentity: when pending, getApprovalStatus and log 待审批/通过/拒绝/超时; optional poll via env; manual retry hint when not polling.

### File List

- src/types/index.ts
- src/core/ITianshuClient.ts
- src/clients/TianshuClient.ts
- src/utils/config.ts
- src/managers/IdentityManager.ts

### Code Review (2026-02-16)

- **AC:** 展示待审批/通过/拒绝/超时（approvalStatusLabel）；可配置轮询（env WUKONG_APPROVAL_POLL_*）；手动重试提示已输出。符合 FR3/FR23。
- **Findings:** 无阻塞问题，批准完成。
