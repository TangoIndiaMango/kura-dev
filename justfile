set dotenv-load := false

# List available recipes
default:
    @just --list

# Install backend (Go) and frontend dependencies
install:
    cd backend && go mod download
    cd frontend && npm install

# Apply database migrations (DATABASE_URL from infra/.env; adopts Django-built DBs)
migrate:
    #!/usr/bin/env bash
    set -euo pipefail
    source backend/scripts/env.sh
    cd backend && go run ./cmd/migrate up

# Show applied / pending migrations
migrate-status:
    #!/usr/bin/env bash
    set -euo pipefail
    source backend/scripts/env.sh
    cd backend && go run ./cmd/migrate status

# New SQL migration: just migration add_widget_table  (then edit it, run `just migrate`, `just sqlc`)
migration name:
    cd backend && go run ./cmd/migrate create {{name}}

# Regenerate typed queries after changing db/queries or db/migrations
sqlc:
    cd backend && $(go env GOPATH)/bin/sqlc generate

# Load demo data (hubs, batteries, plans, roles, test users) into an EMPTY database
seed:
    #!/usr/bin/env bash
    set -euo pipefail
    source backend/scripts/env.sh
    cd backend && go run ./cmd/migrate seed

# Go API on :8001 (the port the frontends use). `just docker-deps` + `just migrate` first.
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
