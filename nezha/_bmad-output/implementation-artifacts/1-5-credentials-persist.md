# Story 1.5: 身份与密钥安全持久化

Status: ready-for-dev

## Story
As a 系统, I want 将身份与密钥以安全方式持久化（如本地文件、权限约束）, So that 重启后可用且不泄露。

## Acceptance Criteria
1. **Given** 已获得身份与密钥 **When** 持久化到本地 **Then** 文件权限为 600（或等价），敏感信息不写入日志 **And** 满足 NFR4

## Tasks
- [x] identities 文件写入后 chmod 600
- [x] 确保不将 id/token 等写入 log

## File List
- src/managers/IdentityManager.ts
