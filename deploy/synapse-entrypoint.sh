#!/bin/sh
set -e
CONFIG=/data/homeserver.yaml
if [ ! -f "$CONFIG" ]; then
  python -m synapse.app.homeserver --generate-config -H matrix.local -c "$CONFIG" --report-stats=no
fi
exec python -m synapse.app.homeserver -c "$CONFIG"
