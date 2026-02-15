# 紫微平台一键启动（飞书端到端）

**目标**：一键启动 Synapse + 天枢 + 谛听，完成「Agent 自动注册 → 飞书确认 → 审核通过接入 → 飞书下指令 → Agent 执行 → 谛听拦截危险推审批」的端到端流程。当前**仅飞书**；钉钉/企微后续。

**流程说明**：见根文档 `docs/open/technical/核心目标-飞书端到端流程.md`。

---

## 1. 前置

- Docker 或 Podman（含 Compose）
- 飞书应用：创建企业自建应用，取得 **App ID**、**App Secret**；配置权限与事件（消息、卡片回调）；若用长连接需在后台开启「长连接」并配置验证 URL。
- Matrix 网关用户：**使用根目录一键启动（§2）时无需填写 `MATRIX_GATEWAY_TOKEN`**——天枢会通过 `REGISTRATION_SHARED_SECRET` 自动向 Synapse 注册 `@gateway:matrix.local` 并持久化 token。仅当自举失败或你单独部署天枢接已有 Synapse 时，才需在 Synapse 中手动注册该用户并填写 `MATRIX_GATEWAY_TOKEN`。

---

## 2. 一键启动

在 **ziwei 仓库根目录** 执行。

### 2.1 使用 Docker

```bash
# 1. 环境变量（飞书必填；Matrix 网关 token 可不填，见 §1 前置）
cp deploy/env.example .env
# 编辑 .env 填入 FEISHU_APP_ID、FEISHU_APP_SECRET；MATRIX_GATEWAY_TOKEN 留空则天枢自动注册网关用户

# 2. 启动
docker compose -f deploy/docker-compose.integration.yml up -d

# 3. 健康检查
curl -s http://localhost:8080/healthz   # 谛听
curl -s http://localhost:8082/health   # 天枢
curl -s http://localhost:8008/health   # Synapse
```

### 2.2 使用 Podman

`podman-compose` 会把 compose 文件所在目录当作项目目录，因此需要先把 compose 复制到仓库根目录再启动（这样 `./diting`、`./tianshu` 才能正确解析）：

```bash
# 1. 环境变量（同上）
cp deploy/env.example .env
# 编辑 .env 填入 FEISHU_APP_ID、FEISHU_APP_SECRET；MATRIX_GATEWAY_TOKEN 留空则天枢自动注册网关用户

# 2. 复制 compose 到根目录并启动（根目录下的副本已加入 .gitignore，不会误提交）
cp deploy/docker-compose.integration.yml docker-compose.integration.yml
podman-compose -f docker-compose.integration.yml --env-file .env up -d

# 3. 健康检查（同上）
curl -s http://localhost:8080/healthz
curl -s http://localhost:8082/health
curl -s http://localhost:8008/health
```

**说明**：构建需拉取基础镜像（如 golang、python、matrixdotorg/synapse）并访问外网（如 go proxy、PyPI）。若网络不可达，可配置镜像/代理或使用已构建好的镜像。

### 2.3 使用 NAS 镜像服务（仍在本机执行）

以下为 SSH 到 NAS 实际查到的信息，本机配置后**仍在本机**执行 2.1 或 2.2。

**NAS 信息（当前环境）**：

| 项 | 值 |
|----|-----|
| 主机 | DS220plus，内网 IP **192.168.3.16** |
| 私有 Registry | **192.168.3.16:5050**（registry:2，需 htpasswd 登录；端口 5050 避免与 DSM 5000/5001 冲突） |
| NAS 已配镜像加速 | 见下段「本机 Docker」 |

**本机 Docker**（`/etc/docker/daemon.json`，编辑后 `sudo systemctl restart docker`）：

- 若从 NAS 私有仓库拉取：添加 `insecure-registries`，并先执行 `docker login 192.168.3.16:5050`（用 NAS 上该 Registry 的账号）。
- 若仅加速拉取 docker.io：可直接使用与 NAS 相同的镜像源（NAS 上已配置）：

```json
{
  "registry-mirrors": [
    "https://docker.m.daocloud.io/",
    "https://hub-mirror.c.163.com/",
    "https://mirror.ccs.tencentyun.com/"
  ],
  "insecure-registries": ["192.168.3.16:5050"]
}
```

**本机 Podman**（`~/.config/containers/registries.conf` 或 `/etc/containers/registries.conf`）：

```ini
[registries.insecure]
registries = ["192.168.3.16:5050"]
```

使用 NAS 私有仓库时需先 `podman login 192.168.3.16:5050`。若仅加速，可配置 Podman 使用国内镜像源（同上列域名，按 Podman 文档格式填写）。

**将 Synapse 推送到 NAS 私有仓库（推荐）**：本机拉取 `matrixdotorg/synapse` 困难时，可在 **NAS 上**（NAS 已有镜像加速）把镜像推到 NAS 的 Registry，本机再从 NAS 拉取。

**在 NAS 上一键执行推送**：仓库内已提供脚本 `deploy/nas-push-synapse.sh`，会在 NAS 上自动加入 insecure-registry、重启 Docker、拉取并 push 镜像。需**登录 NAS 后**以 root 执行（sudo 需密码时无法通过 ssh 远程自动执行）：
```bash
# 在本机执行：把脚本拷到 NAS
scp deploy/nas-push-synapse.sh nas:/tmp/

# 然后 SSH 登录 NAS，在 NAS 上执行
ssh nas
sudo bash /tmp/nas-push-synapse.sh
# 若 Registry 启用了 htpasswd，先：docker login 192.168.3.16:5050
```

1. **在 NAS 上**（SSH 登录后 `export PATH=/usr/local/bin:$PATH`）：
   - **若 push 报错 `http: server gave HTTP response to HTTPS client`**：脚本会写入 dockerd 实际使用的 `/var/packages/ContainerManager/etc/dockerd.json`，重启后生效。**DSM 或 Container Manager 升级后**该文件可能被还原，需重新执行一次 `nas-push-synapse.sh`。
   ```bash
   # 若 NAS 上还没有该镜像，先拉取（NAS 一般已配国内镜像加速）
   docker pull matrixdotorg/synapse:v1.100.0

   # 打标签指向 NAS 私有仓库
   docker tag matrixdotorg/synapse:v1.100.0 192.168.3.16:5050/synapse:v1.100.0

   # 登录 NAS Registry（使用 NAS 上该 Registry 的 htpasswd 账号）
   docker login 192.168.3.16:5050

   # 推送到 NAS（需 NAS Docker 已配 192.168.3.16:5050 为 insecure-registry）
   docker push 192.168.3.16:5050/synapse:v1.100.0
   ```
2. **在本机**：在 `.env` 中增加一行 `SYNAPSE_IMAGE=192.168.3.16:5050/synapse:v1.100.0`，配置好 `insecure-registries`（见上）并执行 `podman login 192.168.3.16:5050`（或 `docker login`），然后执行 2.1 或 2.2 的启动命令。Compose 会使用该镜像，无需本机直连 docker.io。

保存后在本机执行 2.1 或 2.2 的启动命令即可。

**在 NAS 上执行一键启动**：SSH 到 NAS 后先 `export PATH=/usr/local/bin:$PATH`；若 ziwei 工作目录是克隆自 NAS 上的 bare 仓，拉取用 `git pull origin master`（不是 `nas master`），再 `docker compose -f deploy/docker-compose.integration.yml up -d`。构建谛听时若 Alpine 源（dl-cdn.alpinelinux.org）不可达，可重试或为 Dockerfile 中 `apk add` 配置国内 Alpine 镜像。

**端口**：

| 服务   | 主机端口 | 说明           |
|--------|----------|----------------|
| 谛听   | 8080     | /healthz、/auth/exec、/cheq/approve、/chain/*、/init_permission |
| 天枢   | 8082     | /health、注册/发现等（容器内 8080） |
| Synapse| 8008     | Matrix          |

**无飞书内部验证（可选）**：不配飞书时也可做本地验证。① 谛听 chain：`curl http://localhost:8080/chain/health` 应为 200。② 天枢→谛听 DID：`cd tianshu && DITING_CHAIN_URL=http://localhost:8080/chain python3 -m pytest tests/test_e2e_chain_did.py -v`。③ 太白 verification_agent：在 `taibai/examples/verification_agent` 下执行 `TIANSHU_API_BASE=http://localhost:8082 DITING_AUDIT_URL= python3 main.py`；天枢已暴露发现与 `POST /api/v1/agents/register`、`POST /api/v1/agents/heartbeat`，Step 1～3 可完整通过；Step 4 上报需谛听提供单条 action 审计接口（当前仅有 `/chain/audit/batch`），未配置 `DITING_AUDIT_URL` 时跳过。

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
