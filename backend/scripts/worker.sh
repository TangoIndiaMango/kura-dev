#!/usr/bin/env bash
# Run the Go worker with the local environment (see env.sh).
# Usage: backend/scripts/worker.sh [--once] [--only=swaps,...] [--json]
set -euo pipefail
source "$(dirname "$0")/env.sh"
export DJANGO_SECRET_KEY="${DJANGO_SECRET_KEY:-django-insecure-kura-dev-only-change-me}"
cd "$root/backend"
exec go run ./cmd/worker "$@"
