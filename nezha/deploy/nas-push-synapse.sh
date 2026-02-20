#!/bin/bash
# 在 NAS 上以 root 执行：将 Synapse 推送到 NAS 私有 Registry（192.168.3.16:5050）
#
# 用法（需能 SSH 登录 NAS 且可 sudo 或直接用 root）：
#   scp deploy/nas-push-synapse.sh nas:/tmp/
#   ssh nas
#   sudo bash /tmp/nas-push-synapse.sh
# 若 Registry 启用了 htpasswd，先：docker login 192.168.3.16:5050

set -e
export PATH=/usr/local/bin:$PATH

DAEMON_JSON=/etc/docker/daemon.json
REGISTRY="192.168.3.16:5050"

# dockerd 实际使用 --config-file 指向的配置（synosystemctl start 时读此文件）
PKG_ETC_DOCKERD="/var/packages/ContainerManager/etc/dockerd.json"
# 套件 target 内配置（updater 可能据此生成 etc/dockerd.json，一并写入）
PKG_TARGET_DOCKERD="/var/packages/ContainerManager/target/config/dockerd.json"

merge_insecure() {
  local p="$1"
  DAEMON_JSON_PATH="$p" python3 -c "
import json, os
p = os.environ.get('DAEMON_JSON_PATH')
try:
    with open(p) as f:
        d = json.load(f)
except: d = {}
d.setdefault('insecure-registries', [])
if '$REGISTRY' not in d['insecure-registries']:
    d['insecure-registries'].append('$REGISTRY')
with open(p,'w') as f:
    json.dump(d, f, indent=2)
"
}

echo "==> 1. 将 $REGISTRY 加入 Docker insecure-registries（写入实际使用的 etc/dockerd.json）..."
merge_insecure "$PKG_ETC_DOCKERD"
merge_insecure "$PKG_TARGET_DOCKERD"
merge_insecure "$DAEMON_JSON"

echo "==> 2. 重启 Container Manager ..."
synopkg stop ContainerManager 2>/dev/null || true
sleep 3
synopkg start ContainerManager 2>/dev/null || true
sleep 10
until docker info &>/dev/null; do echo "等待 Docker..."; sleep 2; done
# 启动时 updater 可能覆盖 etc/dockerd.json，再写一次并仅重启 dockerd 使配置生效
echo "==> 2b. 再次写入 etc/dockerd.json 并重启 dockerd 服务 ..."
merge_insecure "$PKG_ETC_DOCKERD"
/usr/syno/bin/synosystemctl restart pkg-ContainerManager-dockerd 2>/dev/null || true
sleep 5
until docker info &>/dev/null; do echo "等待 Docker..."; sleep 2; done
docker info | grep -A5 Insecure || true

echo "==> 3. 拉取并推送到 $REGISTRY ..."
docker pull matrixdotorg/synapse:v1.100.0
docker tag matrixdotorg/synapse:v1.100.0 "$REGISTRY/synapse:v1.100.0"
docker push "$REGISTRY/synapse:v1.100.0"
echo "完成: $REGISTRY/synapse:v1.100.0"
