#!/usr/bin/env bash
# 全链路验证脚本：启动 Synapse + 天枢 + 谛听（天枢投递启用）→ native-demo 取 room_id → 配置 DELIVERY_ROOM_ID → 触发审批进房间 → 可选 /auth/exec 触发谛听 CHEQ
# 在 ziwei 仓库根目录执行：bash deploy/run-full-chain-verify.sh
set -e

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

COMPOSE_FILE="deploy/docker-compose.integration.yml"
if [ -f "docker-compose.integration.yml" ]; then
  COMPOSE_FILE="docker-compose.integration.yml"
fi

# 检测 compose 命令
COMPOSE_CMD=""
if command -v docker &>/dev/null && docker compose version &>/dev/null 2>&1; then
  COMPOSE_CMD="docker compose -f $COMPOSE_FILE"
elif command -v podman-compose &>/dev/null; then
  [ ! -f docker-compose.integration.yml ] && cp deploy/docker-compose.integration.yml docker-compose.integration.yml 2>/dev/null || true
  COMPOSE_FILE="docker-compose.integration.yml"
  COMPOSE_CMD="podman-compose -f $COMPOSE_FILE --env-file .env"
else
  echo "需要 docker compose 或 podman-compose。"
  exit 1
fi

echo "========== 1. 环境检查 =========="
if [ ! -f .env ]; then
  cp deploy/env.example .env
  echo "已从 deploy/env.example 复制 .env，请按需编辑（至少可留空飞书）。"
fi
# 确保天枢投递启用（compose 内 diting 通过 env 覆盖）
grep -q "DITING_TIANSHU_ENABLED" .env 2>/dev/null || echo -e "\n# 全链路验证：天枢投递\nDITING_TIANSHU_ENABLED=true\nDITING_TIANSHU_BASE_URL=http://tianshu:8080" >> .env
export $(grep -v '^#' .env | xargs)

echo "========== 2. 启动服务 =========="
$COMPOSE_CMD up -d
echo "等待服务就绪（约 30s）..."
sleep 30

echo "========== 3. 健康检查 =========="
for i in 1 2 3 4 5 6 7 8 9 10; do
  if curl -sf http://localhost:8080/healthz >/dev/null && curl -sf http://localhost:8082/health >/dev/null 2>/dev/null; then
    echo "谛听(8080)、天枢(8082) 已就绪。"
    break
  fi
  [ $i -eq 10 ] && { echo "健康检查超时"; exit 1; }
  sleep 5
done

echo "========== 4. 获取 Matrix 房间（native-demo） =========="
DEMO=$(curl -s http://localhost:8082/api/v1/delivery/native-demo 2>/dev/null || true)
if echo "$DEMO" | grep -q '"ok":\s*true'; then
  ROOM_ID=$(echo "$DEMO" | sed -n 's/.*"room_id":\s*"\([^"]*\)".*/\1/p')
  if [ -n "$ROOM_ID" ]; then
    echo "房间 ID: $ROOM_ID"
    echo "请将 DELIVERY_ROOM_ID=$ROOM_ID 写入 .env 并重启天枢，使后续审批发往该房间。"
    echo "执行: echo 'DELIVERY_ROOM_ID=$ROOM_ID' >> .env && $COMPOSE_CMD up -d tianshu --force-recreate"
    if ! grep -q "DELIVERY_ROOM_ID=$ROOM_ID" .env 2>/dev/null; then
      echo "DELIVERY_ROOM_ID=$ROOM_ID" >> .env
      $COMPOSE_CMD up -d tianshu --force-recreate 2>/dev/null || true
      echo "已尝试将 DELIVERY_ROOM_ID 加入 .env 并重建天枢容器。"
      sleep 15
    fi
  fi
else
  echo "native-demo 未返回成功（可能 Matrix 未连），继续用已有 DELIVERY_ROOM_ID 做后续步骤。"
  echo "响应: $DEMO"
fi

echo "========== 5. 验证：天枢直接接收审批请求（审批进房间） =========="
# 天枢重建后可能尚未就绪，短暂等待后重试一次
sleep 5
APPROVAL_CODE=$(curl -s -o /tmp/approval_resp.txt -w "%{http_code}" -X POST http://localhost:8082/api/v1/delivery/approval-request \
  -H "Content-Type: application/json" \
  -d '{
    "request_id": "e2e-test-'$(date +%s)'",
    "title": "【全链路】测试审批",
    "description": "全链路验证：天枢投递到 Matrix 房间。",
    "trace_id": "trace-e2e",
    "gateway_base_url": "http://localhost:8080"
  }')
echo "HTTP $APPROVAL_CODE"
cat /tmp/approval_resp.txt 2>/dev/null | head -c 300
echo ""
if [ "$APPROVAL_CODE" = "200" ] || [ "$APPROVAL_CODE" = "201" ]; then
  echo "审批已投递到 Matrix 房间。请在 Element 中打开 DELIVERY_ROOM_ID 对应房间查看。"
elif [ "$APPROVAL_CODE" = "404" ]; then
  echo "404：若天枢镜像为旧版本，请先重建再试：docker compose -f $COMPOSE_FILE build tianshu && $COMPOSE_CMD up -d tianshu"
else
  echo "若 DELIVERY_ROOM_ID 已配置且天枢已就绪，请检查 .env 与天枢日志。"
fi

echo "========== 6. 验证：谛听 /auth/exec 触发 CHEQ → 天枢投递 =========="
# 触发 review：action exec:sudo 在 policy_rules.example 中为 review
# review 时谛听会阻塞等待审批，故设短超时；超时后可在 Element 中批准以验证
EXEC_CODE=$(curl -s --max-time 8 -o /tmp/exec_resp.txt -w "%{http_code}" -X POST http://localhost:8080/auth/exec \
  -H "Content-Type: application/json" \
  -d '{
    "subject": "agent-e2e",
    "action": "exec:sudo",
    "resource": "/bin/echo",
    "command_line": "echo test",
    "trace_id": "trace-exec-'$(date +%s)'"
  }' 2>/dev/null)
echo "POST /auth/exec HTTP $EXEC_CODE"
AUTH_RESP=$(cat /tmp/exec_resp.txt 2>/dev/null || echo '{}')
echo "响应: $AUTH_RESP"
if echo "$AUTH_RESP" | grep -q '"decision":\s*"review"'; then
  CHEQ_ID=$(echo "$AUTH_RESP" | sed -n 's/.*"cheq_id":\s*"\([^"]*\)".*/\1/p')
  echo "已触发 review，cheq_id=$CHEQ_ID。若已启用天枢投递且配置 DELIVERY_ROOM_ID，Element 房间内应出现审批；批准后请求放行。"
else
  echo "未返回 review（可能策略规则未加载或未匹配）。请确认 diting 配置中 policy.rules_path 指向含 exec:sudo→review 的规则文件。"
fi

echo ""
echo "========== 全链路验证步骤已执行 =========="
echo "请完成："
echo "  1. 在 Element 中打开 DELIVERY_ROOM_ID 对应房间，确认收到审批消息。"
echo "  2. 点击批准/拒绝链接（指向谛听 /cheq/approve），验证回调可达。"
echo "  3. 若需注册+治理全流程，使用悟空向天枢注册，再在 Element 下发指令触发谛听审批。"
echo "参考: deploy/危险操作与Matrix审批验证.md、deploy/再次验证条件检查.md"
