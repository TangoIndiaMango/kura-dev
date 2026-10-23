#!/usr/bin/env bash
# Run the Go API with exactly the environment Django reads locally
# (infra/.env then backend/.env, later wins — same as config/settings/base.py).
# Usage: backend/scripts/dev.sh [port]   (default 8091; Django keeps 8001)
set -euo pipefail
root="$(cd "$(dirname "$0")/../.." && pwd)"
source "$(dirname "$0")/env.sh"
export PORT="${1:-8091}"
export DJANGO_DEBUG="${DJANGO_DEBUG:-true}"
# Every route is ported; set DJANGO_UPSTREAM_URL only to forward unknown routes to a Django instance.
# Django falls back to its built-in dev key when DJANGO_SECRET_KEY is unset.
export DJANGO_SECRET_KEY="${DJANGO_SECRET_KEY:-django-insecure-kura-dev-only-change-me}"
cd "$root/backend"
exec go run ./cmd/api
