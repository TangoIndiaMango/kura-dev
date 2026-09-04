
set dotenv-load := false

# List available recipes
default:
    @just --list

# Install all backend and frontend dependencies
install:
    cd backend && uv venv .venv && source .venv/bin/activate && uv pip install -r requirements.txt
    cd frontend && npm install

# Run database migrations
migrate:
    cd backend && source .venv/bin/activate && python manage.py migrate

# Seed sample mobility and fleet data
seed:
    cd backend && source .venv/bin/activate && python manage.py seed_data

# Run Django backend server on port 8001
backend:
    cd backend && source .venv/bin/activate && python manage.py runserver 0.0.0.0:8001

# Run Client Vite frontend on port 5175
client:
    cd frontend && npm run dev:client

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

# Run tests
test:
    cd backend && source .venv/bin/activate && python manage.py test
    cd frontend && npm run build

# Build production bundles for both frontends
build:
    cd frontend && npm run build
