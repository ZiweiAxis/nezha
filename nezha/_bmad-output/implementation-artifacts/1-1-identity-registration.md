# Story 1.1: 身份注册与天枢对接 (Identity Registration with Tianshu)

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a 开发者 (developer),  
I want 首次启动时通过悟空向天枢完成 Agent 身份注册 (to complete Agent identity registration with Tianshu via Wukong on first run),  
So that Agent 可被平台识别并进入后续审批或使用流程 (the Agent can be recognized by the platform and enter the approval or usage flow).

## Acceptance Criteria

1. **Given** 已配置天枢地址且无本地身份缓存 (Tianshu address is configured and no local identity cache exists)  
   **When** 用户执行 `wukong claude`（或等价启动）(user runs `wukong claude` or equivalent)  
   **Then** 悟空调用天枢注册 API 并取得注册结果 (Wukong calls Tianshu registration API and obtains registration result)  
   **And** 若需审批，系统展示或轮询审批状态 (if approval is required, system shows or polls approval status; FR3 refined in later stories)

## Tasks / Subtasks

- [x] Task 1: Config and Tianshu client (AC: 1)
  - [x] Resolve Tianshu base URL from env/config (e.g. `TIANSHU_BASE_URL` or config file)
  - [x] Implement HTTP client for Tianshu registration API (HTTPS, no secrets in CLI args per NFR5)
- [x] Task 2: Registration flow (AC: 1)
  - [x] On `wukong claude` (or equivalent), check for local identity cache; if none, call Tianshu register API
  - [x] Parse registration response (identity id, token/keys, optional approval status)
  - [x] Handle response: success → persist in Story 1.5; pending approval → surface status (minimal here, FR3 in 1.3)
- [x] Task 3: CLI entrypoint (AC: 1)
  - [x] Ensure `wukong claude` (or main entry) triggers registration path when no cached identity
  - [x] Document or log required config (Tianshu address) on failure

## Dev Notes

- **FR traceability:** FR1 (first-run registration). FR3 (approval status) is partially in scope; full display/poll in Story 1.3.
- **Architecture:** Align with existing `wukong/` layout: config in `utils/config.py`, core in `core/`. Add Tianshu adapter or client under `core/` or `integrations/tianshu/` as per project convention. Use existing config (env + YAML/JSON) and logger; no secrets in logs (NFR4).
- **Security:** NFR5 — use HTTPS, no API keys/tokens via CLI arguments; pass via env or config file.
- **Dependencies:** Story 1.5 will implement persistence; this story only needs to obtain registration result and hand off to persistence (or stub persistence for 1.1 so that 1.1 is testable).

### Project Structure Notes

- `wukong/core/` or `wukong/integrations/tianshu/` for Tianshu API client.
- Config: reuse `utils/config.py` and planning-artifacts architecture (env + config file).
- CLI: entrypoint that invokes registration when cache miss (e.g. `wukong claude`).

### References

- [Source: _bmad-output/planning-artifacts/epics.md] Epic 1, Story 1.1
- [Source: _bmad-output/planning-artifacts/prd.md] FR1, FR3, NFR5
- [Source: _bmad-output/planning-artifacts/architecture.md] §2 技术栈, §6 配置管理, §7 安全考虑

## Dev Agent Record

### Agent Model Used

(To be filled by Dev agent)

### Debug Log References

### Completion Notes List

- TianshuClient: parse API response `status` and `requires_approval` from register response; config via env + ~/.wukong/config.json.
- Wukong: optional `tianshuBaseUrl`; `createWukong()` async loads config and creates instance; CLI uses createWukong() per command.
- First-run registration already in AgentManager.start(): getIdentity or register, then verifyIdentity; pending approval throws with clear message.

### File List

- src/utils/config.ts (new)
- src/index.ts (WukongOptions, createWukong)
- src/cli.ts (createWukong in each action)
- src/clients/TianshuClient.ts (register response parsing)

### Code Review (2026-02-16)

- **AC:** Given/When/Then 已满足：配置来自 env + ~/.wukong/config.json；无缓存时 `wukong claude` 触发 register；Tianshu 返回 status/requires_approval 已解析。
- **Findings (non-blocking):** (1) loadConfig 每次命令执行都读文件，可后续做进程内缓存；(2) config.json 非法 JSON 时当前会抛错，可 catch 后回退为空配置。无 High 问题，批准完成。
