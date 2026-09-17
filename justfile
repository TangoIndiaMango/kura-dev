set dotenv-load := false

# List available recipes
default:
    @just --list

# Install all backend and frontend dependencies
install:
    cd backend && uv venv .venv && source .venv/bin/activate && uv pip install -r requirements.txt
    cd frontend && npm install

# Run migrations for all apps
makemigrations:
    cd backend && source .venv/bin/activate && python manage.py makemigrations

# Run database migrations (DATABASE_URL from infra/.env → Docker Postgres)
migrate:
    cd backend && source .venv/bin/activate && python manage.py migrate

# Seed sample mobility, fleet, and dynamic RBAC roles
seed:
    cd backend && source .venv/bin/activate && python manage.py seed_kura && python manage.py seed_roles

# Wipe operational history and reseed fresh clean mobility state
seed-fresh:
    cd backend && source .venv/bin/activate && python manage.py seed_kura --fresh && python manage.py seed_roles

# Host Django on :8001 (Postgres via infra/.env). Use `just docker-deps` first;
# don't run alongside `just docker-up` (same port).
backend:
    cd backend && source .venv/bin/activate && python manage.py runserver 0.0.0.0:8001

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

# Run full development stack (backend + client + admin)
dev:
    npx concurrently -k -n "backend,client,admin" -c "blue,green,magenta" \
        "cd backend && source .venv/bin/activate && python manage.py runserver 0.0.0.0:8001" \
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

# Postgres + Redis only (API still via `just backend` against DATABASE_URL)
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
    cd backend && source .venv/bin/activate && python manage.py test
    cd frontend && npm run build

# One-shot: flag packs past 48h return window (also POST /api/v1/internal/jobs/flag-unreturned/)
flag-unreturned:
    cd backend && source .venv/bin/activate && python manage.py flag_unreturned_batteries

# Durable task worker (TASKS_BACKEND=database). Drains QueuedTask + unreturned + cash settlement.
worker:
    cd backend && source .venv/bin/activate && TASKS_BACKEND=database python manage.py run_task_worker

# Test IOT mocks
iot-mocks:
    cd backend && source .venv/bin/activate && python manage.py feed_mock_iot

# Build production bundles for both frontends
build:
    cd frontend && npm run build
