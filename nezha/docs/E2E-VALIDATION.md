# 端到端验证准备（E2E Validation）

## 当前状态

- **单元测试：** 已通过，使用 `MockTianshuClient` 不依赖真实天枢。
- **E2E 冒烟：** `tests/e2e/smoke.e2e.ts` 仅覆盖 `createWukong()` + `listAgents()`，不发起注册/心跳。

## 完整端到端应覆盖的流程（PRD / 6.1）

1. **主流程：** 启动 → 审批（若需要）→ 状态同步  
   - `wukong claude` 首次运行 → 无缓存 → 调用天枢注册 → 若 pending 则展示/轮询 → 启动进程 → 状态持久化并上报。
2. **NFR 可测项：** 启动时间 ≤10s（NFR1）、上报延迟 ≤2s/心跳 ≤1s（NFR2）、内存（NFR3）、身份文件权限 600（NFR4）等。

## 后续端到端验证应准备的内容

### 1. 环境与依赖

| 准备项 | 说明 |
|--------|------|
| **天枢可用性** | 真实天枢实例（如本地 8082 或测试环境），或可复用的 **天枢 Mock 服务**（实现 `POST /api/v1/agents/register`、`POST /api/v1/agents/heartbeat`、`GET /api/v1/agents/:id`），以便 CI 内无真实服务也能跑 E2E。 |
| **环境变量** | `TIANSHU_API_URL`、可选 `WUKONG_OWNER_ID`；CI 中指向 Mock 或测试天枢。 |
| **数据目录** | E2E 使用独立目录（如 `os.tmpdir()/wukong-e2e-*`），避免污染用户 `~/.wukong`。 |

### 2. 场景与用例

| 场景 | 步骤 | 验收 |
|------|------|------|
| **Happy path（无审批）** | 清空身份缓存 → `wukong claude` → 注册成功 → 进程启动 → `wukong list` 可见 → `wukong status <name>` 一致。 | 无报错；list/status 与本地状态一致。 |
| **有审批** | Mock 天枢返回 `status: pending` → 展示「待审批」→ 轮询或 Mock 改为 approved → 启动成功。 | 日志中可见审批状态文案；最终可启动。 |
| **身份复用（FR2）** | 已有身份缓存 → 再次 `wukong claude` 同 name → 不调用注册 API。 | 仅一次注册调用；log 有「Using cached identity」。 |
| **状态上报** | 启动后 → 天枢 Mock 收到 heartbeat 或 state 上报。 | 请求次数/body 符合约定。 |

### 3. NFR 验证（可选、可后补）

- **NFR1 启动时间：** 在 E2E 中记录 `wukong claude` 到进程就绪的耗时，断言 &lt; 10s（可排除网络/审批等待）。
- **NFR2 延迟：** Mock 或真实天枢记录上报时间戳，与状态变更时间差 ≤2s/1s。
- **NFR4 文件权限：** E2E 结束后检查 `~/.wukong/identities.json`（或 E2E 专用路径）权限为 600。

### 4. 实施方式建议

- **短期：** 在仓库内新增 **天枢 Mock**（Node/Express 或与 wukong 同栈），实现上述 3 个 API；E2E 用例在 `tests/e2e/` 下用该 Mock + 临时数据目录跑「无审批 + 有审批 + 身份复用」。
- **CI：** `.github/workflows/ci.yml` 已包含 `build` + `test`；E2E 可单独 job 或同一 job 中 `npm run test` 时包含 `tests/e2e/**`，并注入 `TIANSHU_API_URL=http://localhost:<mock-port>`（Mock 由 test 启动）。
- **7 天验收（6.2）：** 在预发或目标环境按 USAGE/INTEGRATION 跑通一条真实链路，人工或脚本每日检查；结果记录在 `_bmad-output` 或运维文档即可。

### 5. 与现有测试的关系

- **单元测试：** 继续用 `MockTianshuClient`，不依赖天枢。
- **E2E 冒烟：** 保留；扩展为调用真实 CLI 或 Wukong 的「注册 + 启动 + list」路径，并依赖天枢 Mock 或测试天枢。

以上准备完成后，即可按「环境 → 场景用例 → NFR（可选）→ CI 集成 → 7 天验收」顺序推进端到端验证。
