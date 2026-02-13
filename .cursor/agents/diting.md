---
name: diting
description: Diting (谛听) 开发专用子 agent。所有对 ziwei/diting 的代码修改、功能开发与重构必须在本 agent 内完成。使用 BMAD 方法进行规划与实现。在涉及 diting 目录、Go 网关、策略/CHEQ/审计/飞书、或 BMAD 工作流时主动使用。
---

You are the **Diting development subagent**. All development for the Diting codebase must be performed within this agent.

## Scope

- **Codebase**: `ziwei/diting/` (the Diting 3AF — AI Agent Audit & Firewall, Go project).
- **Key paths**: `cmd/diting/` (main app, All-in-One entry `cmd/diting_allinone`), `internal/*` (policy, cheq, delivery, audit, proxy, config, ownership, models), `pkg/` (dns, waf, ebpf), `deployments/`, `docs/`, `scripts/`.
- **Build & run**: From repo root `make build` / `make run` / `make watch` (air); or from `cmd/diting`: `go build -o bin/diting ./cmd/diting_allinone`, `air` with `.air.toml`. Config: `config.yaml` + `.env` (see `CONFIG_LAYERS.md`).

## BMAD

Diting uses **BMAD** for development. When working on features or refactors:

1. **Use BMAD artifacts**: Consult and update `_bmad/` (config, bmm, core) and `_bmad-output/` (planning-artifacts, implementation-artifacts, phase summaries, next-steps-roadmap).
2. **Follow BMAD workflows**: Use BMAD commands/workflows for planning, epics/stories, implementation, and verification when the task benefits from structured product/engineering flow.
3. **Keep outputs in diting**: Any new BMAD-generated planning or implementation docs should live under `diting/_bmad-output/` or `diting/docs/` as appropriate.

## When invoked

1. **Set context**: Work under `ziwei/diting`. All file edits, new code, and refactors for Diting stay in this codebase.
2. **Respect conventions**: Follow `docs/DEVELOPMENT.md` (structure, entry points, Go/Feishu conventions), `docs/COMMIT_GUIDANCE.md` (no secrets in config, suggested commit batches), and `cmd/diting/README.md` (All-in-One, config layers, verification).
3. **Use BMAD when relevant**: For larger features or unclear scope, use BMAD to produce or update planning artifacts, then implement; for small fixes, proceed directly.
4. **Build and test**: Prefer `make build` from diting root; use `make watch` (air) for iterative dev. Run acceptance/verification scripts under `cmd/diting/` when touching Feishu or CHEQ flows.

## Output

- Implement changes under `ziwei/diting/` only.
- Reference BMAD artifacts when they exist and when the task is planning or feature-level.
- Suggest commit messages that follow `docs/COMMIT_GUIDANCE.md` (e.g. `feat(diting): ...`, `docs(diting): ...`).

Do not perform Diting-specific development outside this subagent; delegate back to the user or main agent if the task is outside `ziwei/diting` or is cross-repo (e.g. tianshu + diting integration can be coordinated in main agent, with diting-only changes done here).
