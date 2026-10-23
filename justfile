set dotenv-load := false

# List available recipes
default:
    @just --list

# Install backend (Go) and frontend dependencies
install:
    cd backend && go mod download
    cd frontend && npm install

# Create the schema in an EMPTY database (DATABASE_URL from infra/.env)
db-init:
    #!/usr/bin/env bash
    set -euo pipefail
    source backend/scripts/env.sh
    psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f backend/db/schema.sql

# Seed sample data + RBAC roles. The seed commands live on the `django` branch:
#   git worktree add ../kura-django django   (once)
seed:
    cd ../kura-django/backend && uv run python manage.py seed_kura && uv run python manage.py seed_roles

# Wipe operational history and reseed (from the django branch checkout)
seed-fresh:
    cd ../kura-django/backend && uv run python manage.py seed_kura --fresh && uv run python manage.py seed_roles

# Go API on :8001 (the port the frontends use). `just docker-deps` first.
backend:
    backend/scripts/dev.sh 8001

# Background worker (sweeps every 15s)
worker:
    backend/scripts/worker.sh

# Run Client Vite frontend on port 5175
client:
    cd frontend && npm run dev:client

# Wipe Vite dep cache + force re-optimize (fixes Outdated Optimize Dep / failed dynamic imports)
client-fresh:
    rm -rf frontend/apps/client/node_modules/.vite frontend/node_modules/.vite
    cd frontend && npm --workspace client run dev:force

# Run Admin Vite frontend on port 5176
admin:
    cd frontend && npm run dev:admin

# Run both frontends concurrently
frontend:
    cd frontend && npm run dev

# Run full development stack (API + worker + client + admin)
dev:
    npx concurrently -k -n "api,worker,client,admin" -c "blue,yellow,green,magenta" \
        "backend/scripts/dev.sh 8001" \
        "backend/scripts/worker.sh" \
        "cd frontend && npm run dev:client" \
        "cd frontend && npm run dev:admin"

# --- Docker (infra/) ---

# Ensure infra/.env exists
docker-env:
    #!/usr/bin/env bash
    set -euo pipefail
    if [ ! -f infra/.env ]; then
      cp infra/.env.example infra/.env
      echo "Created infra/.env from example"
    fi

# Postgres + Redis only (API via `just backend` against DATABASE_URL)
docker-deps: docker-env
    docker compose -f infra/docker-compose.yml up -d db redis

# Full stack in containers (api + worker + caddy + db + redis)
docker-up: docker-env
    docker compose -f infra/docker-compose.yml --profile full up -d --build

docker-down:
    docker compose -f infra/docker-compose.yml --profile full down

docker-logs:
    docker compose -f infra/docker-compose.yml --profile full logs -f api

# Run tests
test:
    cd backend && go vet ./... && go test ./...
    cd frontend && npm run build

# One-shot: flag packs past 48h return window
flag-unreturned:
    backend/scripts/worker.sh --once --only=unreturned

# One mock IoT tick (SoC drain + GPS for issued packs)
iot-mocks:
    MOCK_IOT_ENABLED=true backend/scripts/worker.sh --once --only=mock_iot

# Build production bundles for both frontends
build:
    cd frontend && npm run build
