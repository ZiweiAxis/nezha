# Agent 回复与谛听拦截验证

用于验证完整链路：**用户下发指令 → Agent 回复可见 → Agent 执行经谛听拦截 → 审批发到 Matrix → 用户批准**。

---

## 1. 链路说明

| 步骤 | 说明 |
|------|------|
| 1 | 用户在控制房间（DELIVERY_ROOM）发指令 |
| 2 | 天枢将指令转发到该用户名下 Agent 的 Matrix 房间 |
| 3 | **验证 Agent** 在 Agent 房间内收到消息，回复「收到：…」并调用谛听 `POST /auth/exec`（如 `action=exec:sudo`） |
| 4 | 谛听策略命中 review，创建 CHEQ，投递到天枢 → 控制房间出现「审批」消息 |
| 5 | 天枢将 Agent 房间内**非网关**发出的消息（即 Agent 回复）转回控制房间，用户看到「Agent xxx 回复：…」 |
| 6 | 用户在控制房间点击批准/拒绝，谛听 `/cheq/approve` 回调，审批结束 |

---

## 2. 前置条件

- 已用 `deploy/run-hulk-e2e.sh` 或等价方式启动 Synapse + 天枢 + 谛听；**若要做「Agent 回复 + 谛听拦截」**，建议**不要**用脚本里的「注册 Agent」步骤，改为只运行下面的验证 Agent（由它完成注册并带上 `agent_matrix_id`），这样该 owner 下只有一个能收消息的 Agent。
- **验证用 Agent 的 Matrix 账号**（如 `@e2e-agent:xyin.oicp.net`）已在 Synapse 上存在：
  - 若 Synapse 开启 `registration_shared_secret`，可用 Synapse 注册 API 或脚本创建；
  - 或在 Element 用该 homeserver 注册一个账号，用户名填 `e2e-agent`，密码自设。

---

## 3. 运行验证 Agent

```bash
# 安装依赖（若未装）
pip install -r deploy/e2e_agent_requirements.txt

# 设置环境变量（与你的环境一致）
export TIANSHU_API_BASE=http://localhost:8082
export DITING_AUTH_EXEC_URL=http://localhost:8080/auth/exec
export MATRIX_HOMESERVER=http://xyin.oicp.net:8008
export MATRIX_AGENT_USER=@e2e-agent:xyin.oicp.net
export MATRIX_AGENT_PASSWORD=你的密码
export OWNER_ID=@hulk:xyin.oicp.net

# 启动（会先向天枢注册，再连 Matrix 收消息）
python deploy/e2e_agent.py
```

该 Agent 会：

1. 向天枢注册（`agent_display_id=e2e-agent`，`agent_matrix_id=@e2e-agent:xyin.oicp.net`）。
2. 登录 Matrix，等待被邀请进 Agent 房间（用户第一次在控制房间发指令时，天枢会建房间并邀请该 Matrix ID）。
3. 在 Agent 房间内收到任意文本后：
   - 回复「收到：<原文>」；
   - 调用谛听 `POST /auth/exec`（`action=exec:sudo`），触发 review 与审批投递。

---

## 4. 验证步骤（用户侧）

1. 在 Element 用 **hulk** 身份进入控制房间（DELIVERY_ROOM）。
2. 发送一条指令，例如：`执行 ls`。
3. 应看到：
   - 天枢代发的「已转发至 Agent xxx：…」；
   - 随后出现「**Agent xxx 回复：收到：执行 ls**」（天枢把 Agent 房间内的回复转回控制房间）；
   - 同房间内出现「**审批**」消息（谛听 CHEQ 经天枢投递）。
4. 点击审批消息中的「批准」或「拒绝」。
5. （可选）在 Agent 房间内应看到该 Agent 发出的「已提交审批…」或「谛听结果：…」。

---

## 5. 相关代码与配置

- **天枢**  
  - 注册支持 `agent_matrix_id`，建房后邀请该 Matrix 用户：`tianshu/src/main.py`、`tianshu/src/core/agent_rooms.py`。  
  - Agent 房间内非网关消息转回控制房间：`tianshu/src/bridge/feishu.py`（`get_agent_id_for_room` + 转发逻辑）。  
- **验证 Agent**  
  - `deploy/e2e_agent.py`：注册、Matrix 收消息、回复、调谛听 `/auth/exec`。  
- **谛听**  
  - 策略中 `exec:sudo` 为 review，CHEQ 投递到天枢：见 `diting/` 与 `deploy/diting-config-chain.yaml`。
