# Story 1.2: 身份缓存与再次启动复用 (Identity Cache and Reuse on Next Start)

Status: done

## Story

As a 开发者 (developer),  
I want 身份已缓存时再次启动复用本地身份而无需重新注册 (to reuse local identity on next start when cached, without re-registering),  
So that 启动更快且不重复触发审批 (startup is faster and approval is not triggered again).

## Acceptance Criteria

1. **Given** 本地已有有效身份缓存 (valid identity cache exists locally)  
   **When** 用户再次执行启动命令 (user runs start command again, e.g. `wukong claude`)  
   **Then** 悟空验证缓存有效性后直接使用，不调用注册 API (Wukong validates cache and uses it directly; does not call register API)  
   **And** 仅在缓存无效或过期时重新注册 (re-register only when cache is missing or invalid)

## Tasks / Subtasks

- [x] Task 1: Use cached identity when present (AC: 1)
  - [x] In start flow, when identity exists for name, use it and do not call Tianshu register
  - [x] Log or document "using cached identity" so behavior is explicit
- [x] Task 2: Cache validity (AC: 1)
  - [x] Treat cache valid when identity record exists and has required fields (id, name, status)
  - [x] When cache missing or invalid, call register (existing behavior)
- [x] Task 3: No double registration (AC: 1)
  - [x] Ensure second run with same name never calls register when cache is present and valid

## Dev Notes

- **FR traceability:** FR2. Depends on 1.1 (registration and persistence).
- **Current behavior:** AgentManager.start() already does getIdentity(); if identity, uses it and does not call register. Need to make "cache reuse" explicit (log) and ensure validity check is clear.
- **Validation:** "有效身份缓存" = identity file has record for this name with id/name/status. Optional later: server-side check (Tianshu getIdentity) to invalidate revoked identities.

### References

- [Source: _bmad-output/planning-artifacts/epics.md] Epic 1, Story 1.2
- [Source: _bmad-output/planning-artifacts/prd.md] FR2

## Dev Agent Record

### Agent Model Used

### Completion Notes List

### Completion Notes List

- AgentManager.start(): explicit cache check (cacheValid = identity && id && name && status); when valid, log "Using cached identity" and skip register; when invalid or missing, remove stale identity if present then register.

### File List

- src/managers/AgentManager.ts

### Code Review (2026-02-16)

- **AC:** 有缓存且有效时直接使用并打 log，不调用 register；仅无缓存或无效时注册；无效时先 removeIdentity 再 register。符合 FR2。
- **Findings:** 无阻塞问题，批准完成。
