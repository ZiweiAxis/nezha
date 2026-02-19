# E-P7 链与 DID 贯通联调验证

**目的**：验证天枢（tianshu）在智能体注册时调用獬豸（xiezhi）链上 DID 接口，且 DID 可查。

**前置**：獬豸 I-017（链子模块 + DID/存证 API）、天枢 I-018（对接獬豸 DID）已实现。

---

## 1. 启动獬豸并开启链子模块

在 **xiezhi** 仓库目录下，使用开启链的配置启动：

```bash
cd ziwei/xiezhi/cmd/xiezhi
# 方式一：使用联调专用配置（链已开启）
go run ./cmd/xiezhi_allinone -config config.chain-run.yaml
# 方式二：复制 config.example.yaml 为 config.yaml，将 chain.enabled 改为 true 后 make run
```

确认输出含：`链子模块已启用，/chain/did/*、/chain/audit/*、/chain/health 可用`。

**健康检查**：

```bash
curl -s http://127.0.0.1:8080/chain/health
# 应返回 200 且 body 含 "ok" 或健康状态
```

---

## 2. 天枢侧设置并执行联调测试

在 **tianshu** 仓库目录下，设置 `DITING_CHAIN_URL` 指向獬豸链 API 基址（默认獬豸监听 8080 时为本机 `http://127.0.0.1:8080/chain`）：

```bash
cd ziwei/tianshu
export DITING_CHAIN_URL=http://127.0.0.1:8080/chain
python3 -m pytest tests/test_e2e_chain_did.py -v
```

- 若獬豸未启动或未开链：测试会 **skip**（提示设置 `DITING_CHAIN_URL` 或獬豸不可达）。
- 若獬豸已启动且链已开启：测试会执行注册 → 请求獬豸 GET `/chain/did/{did}` → 断言 DID 文档含 `id`、`publicKey`、`status: active`。

---

## 3. 手动验证（可选）

1. **天枢注册一条 Agent**（任选其一）：
   - 在 tianshu 环境执行 Python：
     ```python
     from src.registration import register_agent_by_human
     r = register_agent_by_human("email", "you@example.com", notify_xiezhi=True)
     agent_id = r["agent_id"]  # 如 tianshu-agent-abc123def456
     ```
   - 或通过已有 API/流程完成注册，并保证该流程中会调用獬豸（`notify_xiezhi=True` 或等效）。

2. **向獬豸查询 DID**：
   ```bash
   DID="did:ziwei:local:上面得到的agent_id"
   curl -s "http://127.0.0.1:8080/chain/did/$(python3 -c "import urllib.parse; print(urllib.parse.quote('$DID'))")"
   ```
   应返回 200 及 DID 文档 JSON（含 `id`、`publicKey`、`owner`、`status` 等）。

---

## 4. 环境变量与端口约定

| 变量 / 端 | 说明 |
|-----------|------|
| 獬豸 `proxy.listen_addr` | 默认 `:8080`，与天枢联调时需一致 |
| `DITING_CHAIN_URL` | 天枢侧：獬豸链 API 基址，如 `http://<xiezhi-host>:8080/chain` |
| 同机联调 | `DITING_CHAIN_URL=http://127.0.0.1:8080/chain` |
| Docker / 跨机 | 将 `127.0.0.1` 换为獬豸实际 host 或服务名（如 `http://xiezhi:8080/chain`） |

---

## 5. 验收标准

- 獬豸以 `chain.enabled: true` 启动后，`GET /chain/health` 返回 200。
- 天枢在设置 `DITING_CHAIN_URL` 后执行 `tests/test_e2e_chain_did.py`，在獬豸已启动且开链的前提下**通过**（无 skip）。
- 手动注册一条 Agent 后，使用该 Agent 的 DID 调用獬豸 `GET /chain/did/{did}` 可返回对应 DID 文档。

满足以上即视为 **E-P7 DID 联调通过**。
