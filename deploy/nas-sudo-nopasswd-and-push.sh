#!/bin/bash
# 一次性执行：为当前用户配置 sudo 免密，然后执行 Synapse 推送到 NAS Registry
# 用法：在 NAS 上执行一次（需输入一次 sudo 密码）：sudo bash /tmp/nas-sudo-nopasswd-and-push.sh

set -e
# 为「执行 sudo 的用户」配置免密，不是 root
USER_NAME="${SUDO_USER:-$(whoami)}"
SUDOERS_D="/etc/sudoers.d"
DROPIN="$SUDOERS_D/${USER_NAME}-nopasswd"

echo "==> 1. 配置 $USER_NAME sudo 免密 ..."
echo "$USER_NAME ALL=(ALL) NOPASSWD: ALL" > /tmp/sudoers-dropin
install -o root -g root -m 0440 /tmp/sudoers-dropin "$DROPIN"
rm -f /tmp/sudoers-dropin
echo "    已写入 $DROPIN"

echo "==> 2. 执行 Synapse 推送到 192.168.3.16:5050 ..."
export PATH=/usr/local/bin:$PATH
bash /tmp/nas-push-synapse.sh
