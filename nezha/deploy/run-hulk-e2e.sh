#!/usr/bin/env bash
# 一键执行：让 hulk:xyin.oicp.net 在手机 Element 收到 (1) Agent 注册审批 (2) Agent 已就绪 (3) 在房间内下发指令转发给 Agent
# 在 ziwei 仓库根目录执行：bash deploy/run-hulk-e2e.sh
set -e

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

COMPOSE_FILE="deploy/docker-compose.integration.yml"
[ -f "docker-compose.integration.yml" ] && COMPOSE_FILE="docker-compose.integration.yml"

COMPOSE_CMD=""
if command -v docker &>/dev/null && docker compose version &>/dev/null 2>&1; then
  COMPOSE_CMD="docker compose -f $COMPOSE_FILE"
elif command -v podman-compose &>/dev/null; then
  [ ! -f docker-compose.integration.yml ] && cp deploy/docker-compose.integration.yml docker-compose.integration.yml 2>/dev/null || true
  COMPOSE_FILE="docker-compose.integration.yml"
  COMPOSE_CMD="podman-compose -f $COMPOSE_FILE --env-file .env"
else
  echo "需要 docker compose 或 podman-compose"
  exit 1
fi

echo "========== 1. 环境 =========="
if [ ! -f .env ]; then
  cp deploy/env.example .env
fi
# 确保 hulk 与天枢投递
for line in \
  "NATIVE_DEMO_INVITE_USER=@hulk:xyin.oicp.net" \
  "DITING_TIANSHU_ENABLED=true" \
  "DITING_TIANSHU_BASE_URL=http://tianshu:8080"; do
  key="${line%%=*}"
  grep -q "^${key}=" .env 2>/dev/null || echo "$line" >> .env
done
export $(grep -v '^#' .env | xargs)

echo "========== 2. 重建镜像（含 approval-request 与 init_permission 投递） =========="
$COMPOSE_CMD build diting tianshu 2>/dev/null || true
echo "========== 3. 启动（强制重建以使用新镜像） =========="
$COMPOSE_CMD up -d --force-recreate
echo "等待服务就绪..."
for i in 1 2 3 4 5 6 7 8 9 10 11 12; do
  if curl -sf http://localhost:8080/healthz >/dev/null && curl -sf http://localhost:8082/health >/dev/null 2>/dev/null; then
    echo "谛听、天枢已就绪"
    break
  fi
  [ $i -eq 12 ] && { echo "健康检查超时"; exit 1; }
  sleep 5
done

echo "========== 4. 获取 Matrix 房间并邀请 hulk =========="
DEMO=$(curl -s "http://localhost:8082/api/v1/delivery/native-demo" 2>/dev/null || true)
ROOM_ID=""
if echo "$DEMO" | grep -q '"ok":\s*true'; then
  ROOM_ID=$(echo "$DEMO" | sed -n 's/.*"room_id":\s*"\([^"]*\)".*/\1/p')
fi
if [ -z "$ROOM_ID" ]; then
  echo "native-demo 未返回房间（检查 Matrix 与 NATIVE_DEMO_INVITE_USER）。继续用已有 DELIVERY_ROOM_ID。"
  ROOM_ID=$(grep "^DELIVERY_ROOM_ID=" .env 2>/dev/null | cut -d= -f2-)
fi
if [ -n "$ROOM_ID" ]; then
  if grep -q "^DELIVERY_ROOM_ID=" .env 2>/dev/null; then
    awk -v r="$ROOM_ID" 'BEGIN{FS=OFS="="} /^DELIVERY_ROOM_ID=/{$2=r; print; next}1' .env > .env.tmp && mv .env.tmp .env
  else
    echo "DELIVERY_ROOM_ID=$ROOM_ID" >> .env
  fi
  $COMPOSE_CMD up -d tianshu --force-recreate 2>/dev/null || true
  echo "已设置 DELIVERY_ROOM_ID=$ROOM_ID 并重建天枢"
  sleep 15
fi

echo "========== 5. 注册 Agent（owner_id=@hulk:xyin.oicp.net，触发谛听注册审批 → Matrix） =========="
REG_RESP=$(curl -s -X POST http://localhost:8082/api/v1/agents/register \
  -H "Content-Type: application/json" \
  -d '{"owner_id":"@hulk:xyin.oicp.net","agent_display_id":"e2e-agent"}')
echo "注册响应: $REG_RESP"
if echo "$REG_RESP" | grep -q '"ok":\s*true'; then
  echo "注册成功。谛听会向天枢投递「Agent 注册审批」，天枢会发到 DELIVERY_ROOM；批准后房间内会收到「Agent 已就绪」并可在本房间下发指令。"
else
  echo "注册失败，请检查天枢/谛听日志。"
fi

echo ""
echo "========== 请在手机 Element（hulk:xyin.oicp.net）完成 =========="
echo "1. 接受「天枢原生渠道验证」房间邀请（若尚未加入）。"
echo "2. 在房间内找到「Agent 注册审批」消息，点击批准。"
echo "3. 批准后会收到「Agent xxx 已就绪，请在本房间下发指令。」"
echo "4. 在本房间直接输入任意文字（如：执行 ls），即会作为指令转发给该 Agent。"
echo ""
echo "完整链路（Agent 回复 + 谛听拦截）："
echo "  - 先创建 Matrix 账号（如 @e2e-agent:xyin.oicp.net），再运行验证 Agent："
echo "    pip install -r deploy/e2e_agent_requirements.txt"
echo "    TIANSHU_API_BASE=http://localhost:8082 DITING_AUTH_EXEC_URL=http://localhost:8080/auth/exec \\"
echo "    MATRIX_HOMESERVER=... MATRIX_AGENT_USER=@e2e-agent:... MATRIX_AGENT_PASSWORD=... python deploy/e2e_agent.py"
echo "  - 详见 deploy/Agent回复与谛听拦截验证.md"
echo ""
echo "参考: deploy/再次验证条件检查.md、deploy/危险操作与Matrix审批验证.md"
