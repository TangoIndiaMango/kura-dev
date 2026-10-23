#!/usr/bin/env bash
# Restart the Go API on :${1:-8091} for contract runs: kill whatever listens on
# the port (the compiled binary, not just `go run`), start fresh, wait healthy.
set -euo pipefail
port="${1:-8091}"
log="${2:-/tmp/kura-go-$port.log}"
pids=$(lsof -ti "tcp:$port" -sTCP:LISTEN || true)
[ -n "$pids" ] && kill $pids
while lsof -ti "tcp:$port" -sTCP:LISTEN >/dev/null; do sleep 0.2; done
nohup "$(dirname "$0")/dev.sh" "$port" >"$log" 2>&1 &
for _ in $(seq 1 300); do
  curl -s -o /dev/null "localhost:$port/health/" && exit 0
  sleep 0.2
done
echo "go api did not start; see $log" >&2
exit 1
