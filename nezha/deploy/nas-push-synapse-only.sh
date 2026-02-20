#!/bin/bash
# 仅拉取、打标签、推送（不修改 daemon、不重启 Docker）
# 前提：你已在 DSM 或手动将 192.168.3.16:5050 加入 Docker 的 insecure-registries 并已重启 Docker
# 用法：ssh nas "bash /tmp/nas-push-synapse-only.sh"（无需 sudo）

set -e
export PATH=/usr/local/bin:$PATH
REGISTRY="192.168.3.16:5050"

docker pull matrixdotorg/synapse:v1.100.0
docker tag matrixdotorg/synapse:v1.100.0 "$REGISTRY/synapse:v1.100.0"
docker push "$REGISTRY/synapse:v1.100.0"
echo "完成: $REGISTRY/synapse:v1.100.0"
