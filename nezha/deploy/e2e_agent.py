#!/usr/bin/env python3
# 最小验证 Agent：向天枢注册（含 agent_matrix_id）、加入 Matrix 房间、收指令后回复并调谛听 /auth/exec 触发审批
# 依赖：pip install nio requests
# 环境变量：TIANSHU_API_BASE、DITING_AUTH_EXEC_URL、MATRIX_HOMESERVER、MATRIX_AGENT_USER、MATRIX_AGENT_PASSWORD、OWNER_ID
# 前置：Agent 的 Matrix 账号（如 @e2e-agent:xyin.oicp.net）需先在 Synapse 上注册或由管理员创建。
# 运行：python deploy/e2e_agent.py

import asyncio
import json
import logging
import os
import sys

try:
    import requests
except ImportError:
    print("请安装: pip install requests nio", file=sys.stderr)
    sys.exit(1)
try:
    from nio import AsyncClient, RoomMessageText, InviteMemberEvent, SyncResponse
except ImportError:
    print("请安装: pip install nio", file=sys.stderr)
    sys.exit(1)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

TIANSHU_API_BASE = (os.environ.get("TIANSHU_API_BASE") or "http://localhost:8082").rstrip("/")
DITING_AUTH_EXEC_URL = (os.environ.get("DITING_AUTH_EXEC_URL") or "http://localhost:8080/auth/exec").rstrip("/")
MATRIX_HOMESERVER = os.environ.get("MATRIX_HOMESERVER", "http://xyin.oicp.net:8008")
MATRIX_AGENT_USER = (os.environ.get("MATRIX_AGENT_USER") or "").strip()
MATRIX_AGENT_PASSWORD = os.environ.get("MATRIX_AGENT_PASSWORD", "")
OWNER_ID = (os.environ.get("OWNER_ID") or os.environ.get("WUKONG_OWNER_ID") or "@hulk:xyin.oicp.net").strip()
AGENT_DISPLAY_ID = (os.environ.get("AGENT_DISPLAY_ID") or "e2e-agent-matrix").strip()


def register_agent():
    """向天枢注册，返回 agent_id。"""
    url = f"{TIANSHU_API_BASE}/api/v1/agents/register"
    body = {
        "owner_id": OWNER_ID,
        "agent_display_id": AGENT_DISPLAY_ID,
        "agent_matrix_id": MATRIX_AGENT_USER or None,
    }
    body = {k: v for k, v in body.items() if v is not None}
    r = requests.post(url, json=body, timeout=10)
    r.raise_for_status()
    data = r.json()
    if not data.get("ok"):
        raise RuntimeError(data.get("error", "注册失败"))
    return data["agent_id"]


def call_diting_auth_exec(agent_id: str, command: str, trace_id: str) -> dict:
    """调谛听 /auth/exec，触发 review 时审批会发到 Matrix 房间。"""
    url = DITING_AUTH_EXEC_URL
    payload = {
        "subject": agent_id,
        "action": "exec:sudo",
        "resource": command[:200],
        "command_line": command[:500],
        "trace_id": trace_id,
    }
    r = requests.post(url, json=payload, timeout=15)
    try:
        return r.json()
    except Exception:
        return {"decision": "error", "reason": r.text}


async def run_client(agent_id: str):
    client = AsyncClient(MATRIX_HOMESERVER, MATRIX_AGENT_USER)
    try:
        await client.login(MATRIX_AGENT_PASSWORD)
    except Exception as e:
        logger.error("Matrix 登录失败（请确保 %s 已存在且密码正确）: %s", MATRIX_AGENT_USER, e)
        return

    logger.info("已登录 Matrix，等待房间邀请与指令…")

    async def on_sync(response: SyncResponse):
        if not response.rooms:
            return
        for room_id, room in (response.rooms.invite or {}).items():
            await client.join(room_id)
            logger.info("已加入房间 %s", room_id)
        for room_id, room in (response.rooms.join or {}).items():
            for event in room.timeline.events:
                if not isinstance(event, RoomMessageText):
                    continue
                if event.sender == MATRIX_AGENT_USER:
                    continue
                body = (event.body or "").strip()
                if not body:
                    continue
                logger.info("收到指令 room=%s from=%s body=%s", room_id, event.sender, body[:80])
                reply = f"收到：{body[:100]}{'…' if len(body) > 100 else ''}"
                await client.room_send(room_id, "m.room.message", {"msgtype": "m.text", "body": reply})
                # 调谛听触发审批（exec:sudo → review → 审批进 Matrix 房间）
                trace_id = f"e2e-{agent_id[:12]}-{id(event)}"
                resp = call_diting_auth_exec(agent_id, body, trace_id)
                if resp.get("decision") == "review":
                    await client.room_send(
                        room_id, "m.room.message",
                        {"msgtype": "m.text", "body": f"已提交审批（cheq_id={resp.get('cheq_id', '')}），请在控制房间批准或拒绝。"},
                    )
                elif resp.get("decision") == "allow":
                    await client.room_send(
                        room_id, "m.room.message",
                        {"msgtype": "m.text", "body": "谛听放行，未需审批。"},
                    )
                else:
                    await client.room_send(
                        room_id, "m.room.message",
                        {"msgtype": "m.text", "body": f"谛听结果: {resp.get('decision', '')} - {resp.get('reason', '')}"},
                    )

    await client.sync_forever(timeout=30_000, full_state=False, sync_callback=on_sync)


def main():
    if not MATRIX_AGENT_USER or not MATRIX_AGENT_PASSWORD:
        print("请设置 MATRIX_AGENT_USER 与 MATRIX_AGENT_PASSWORD（Agent 的 Matrix 账号需已存在）", file=sys.stderr)
        sys.exit(1)
    agent_id = register_agent()
    logger.info("注册成功 agent_id=%s，启动 Matrix 同步…", agent_id)
    asyncio.run(run_client(agent_id))


if __name__ == "__main__":
    main()
