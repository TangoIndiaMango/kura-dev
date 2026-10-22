#!/usr/bin/env bash
# Run the Go API with exactly the environment Django reads locally
# (infra/.env then backend/.env, later wins — same as config/settings/base.py).
# Usage: backend-go/scripts/dev.sh [port]   (default 8091; Django keeps 8001)
set -euo pipefail
root="$(cd "$(dirname "$0")/../.." && pwd)"
# Parse KEY=VALUE literally (like python-dotenv): values may contain spaces,
# so never `source` these files.
load_env() {
  [ -f "$1" ] || return 0
  while IFS= read -r line || [ -n "$line" ]; do
    case "$line" in ''|'#'*) continue ;; esac
    key="${line%%=*}"; val="${line#*=}"
    key="$(printf '%s' "$key" | tr -d '[:space:]')"
    [ -z "$key" ] && continue
    # Like python-dotenv: never override a variable already set in the shell.
    [ -n "${!key+x}" ] && continue
    case "$val" in \"*\") val="${val:1:${#val}-2}" ;; \'*\') val="${val:1:${#val}-2}" ;; esac
    export "$key=$val"
  done < "$1"
}
load_env "$root/infra/.env"
load_env "$root/backend/.env"
export PORT="${1:-8091}"
export DJANGO_DEBUG="${DJANGO_DEBUG:-true}"
# Not-yet-ported routes go to Django so the apps work fully against Go.
export DJANGO_UPSTREAM_URL="${DJANGO_UPSTREAM_URL:-http://localhost:8001}"
# Django falls back to its built-in dev key when DJANGO_SECRET_KEY is unset.
export DJANGO_SECRET_KEY="${DJANGO_SECRET_KEY:-django-insecure-kura-dev-only-change-me}"
cd "$root/backend-go"
exec go run ./cmd/api
