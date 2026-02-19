#!/bin/sh
set -e
CONFIG=/data/homeserver.yaml
if [ ! -f "$CONFIG" ]; then
  python -m synapse.app.homeserver --generate-config -H matrix.local -c "$CONFIG" --report-stats=no
fi
# 允许天枢通过 Admin 注册 API 自动创建网关用户（无 MATRIX_GATEWAY_TOKEN 时自举）
if [ -n "$SYNAPSE_REGISTRATION_SHARED_SECRET" ]; then
  if grep -q "^registration_shared_secret:" "$CONFIG" 2>/dev/null; then
    sed -i "s|^registration_shared_secret:.*|registration_shared_secret: \"$SYNAPSE_REGISTRATION_SHARED_SECRET\"|" "$CONFIG"
  else
    echo "registration_shared_secret: \"$SYNAPSE_REGISTRATION_SHARED_SECRET\"" >> "$CONFIG"
  fi
fi
# 使 Synapse 监听所有接口，便于同网络内天枢等容器连接（默认仅 127.0.0.1）
if grep -q "bind_addresses:.*127.0.0.1" "$CONFIG" 2>/dev/null && ! grep -q "bind_addresses:.*0.0.0.0" "$CONFIG" 2>/dev/null; then
  sed -i "s/bind_addresses: \['::1', '127.0.0.1'\]/bind_addresses: ['0.0.0.0']/" "$CONFIG"
fi
exec python -m synapse.app.homeserver -c "$CONFIG"
