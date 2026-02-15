# 紫微平台一键启动（飞书端到端）

**目标**：一键启动 Synapse + 天枢 + 谛听，完成「Agent 自动注册 → 飞书确认 → 审核通过接入 → 飞书下指令 → Agent 执行 → 谛听拦截危险推审批」的端到端流程。当前**仅飞书**；钉钉/企微后续。

**流程说明**：见根文档 `docs/open/technical/核心目标-飞书端到端流程.md`。

---

## 1. 前置

- Docker 或 Podman（含 Compose）
- 飞书应用：创建企业自建应用，取得 **App ID**、**App Secret**；配置权限与事件（消息、卡片回调）；若用长连接需在后台开启「长连接」并配置验证 URL。
- Matrix 网关用户：首次启动 Synapse 后需在 Synapse 中注册用户（如 `@gateway:matrix.local`）并取得 **access_token**，填为 `MATRIX_GATEWAY_TOKEN`。

---

## 2. 一键启动

在 **ziwei 仓库根目录** 执行：

```bash
# 1. 环境变量（必填飞书 + Matrix 网关）
cp deploy/env.example .env
# 编辑 .env 填入 FEISHU_APP_ID、FEISHU_APP_SECRET、MATRIX_GATEWAY_USER、MATRIX_GATEWAY_TOKEN

# 2. 启动
docker compose -f deploy/docker-compose.integration.yml up -d

# 3. 健康检查
curl -s http://localhost:8080/healthz   # 谛听
curl -s http://localhost:8082/health   # 天枢
curl -s http://localhost:8008/health   # Synapse
```

**端口**：

| 服务   | 主机端口 | 说明           |
|--------|----------|----------------|
| 谛听   | 8080     | /healthz、/auth/exec、/cheq/approve、/chain/*、/init_permission |
| 天枢   | 8082     | /health、注册/发现等（容器内 8080） |
| Synapse| 8008     | Matrix          |

---

## 3. 飞书与谛听审批配置

- **谛听**：当前使用镜像内默认 `config.example.yaml`；如需飞书审批卡片、审批人列表，需挂载自定义配置或通过环境变量覆盖（参见 `diting/cmd/diting/config.example.yaml` 与 `.env` 中 `DITING_FEISHU_*`）。
- **审批链接**：飞书卡片内「批准/拒绝」链接指向谛听 `/cheq/approve`。若谛听在容器内，需保证该链接对用户可达（如公网域名或内网地址），可在谛听配置中设置 `gateway_base_url`。

---

## 4. Agent 自动注册与飞书确认

1. **启动一个 Agent**（如太白验证智能体或自研）：配置 `TIANSHU_API_BASE=http://<主机>:8082`，向天枢发起注册。
2. **天枢**：落库身份、调用谛听 `DITING_INIT_PERMISSION_URL`（/init_permission）、DID 上链（DITING_CHAIN_URL）。
3. **飞书确认**：若天枢配置了飞书推送「注册确认」卡片，用户可在飞书点击通过，完成接入。

---

## 5. 飞书下指令与谛听拦截审批

- **下指令**：用户通过飞书发消息 → 天枢桥接 → 转至 Agent（Matrix 或 HTTP）。
- **执行与拦截**：Agent 执行任务时经谛听（如调用 `POST /auth/exec` 或经谛听代理）；谛听策略为 **review** 时创建 CHEQ，向飞书推送审批卡片；用户批准/拒绝后谛听更新 CHEQ，Agent 侧根据结果继续或中止。

---

## 6. 停止与清理

```bash
docker compose -f deploy/docker-compose.integration.yml down
# 保留数据卷：down 后 volumes 仍存在；需彻底删除可加 -v
```
