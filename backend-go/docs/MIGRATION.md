# Django → Go backend migration

Branch: `go-backend`. Django stays on `main` (and frozen on `django-be`) and keeps
serving production until Go reaches parity. **Resume point: see "Progress log" at
the bottom — always update it before stopping.**

## Ground rules

1. **Same contract.** Same URLs (`/api/v1/...`), same JSON shapes, same status
   codes, same error envelope. The rider and admin apps must not change.
2. **Same database.** Go runs against the Django-migrated Postgres schema.
   Django migrations stay the source of truth until cutover; Go reads the schema
   from `db/schema.sql` (a `pg_dump --schema-only`). After cutover, goose takes
   over with that dump as the baseline.
3. **Same auth.** Go verifies Django's Argon2/PBKDF2 hashes and issues/accepts
   simplejwt-compatible HS256 tokens (`user_id`, `jti`, `token_type`,
   `session_version`, refresh blacklist tables), so users stay signed in across
   the switch.
4. **Parity is proven, not assumed.** An endpoint is done only when a contract
   test hits it and matches Django's behaviour (see `docs/ENDPOINTS.md`).
5. **Files stay under 300 lines.** Split by responsibility, not by line count.
   Generated code (`internal/db/*`, `*_gen.go`) is exempt and never hand-edited.

## Stack (and why)

| Concern | Choice | Why |
|---|---|---|
| Router | stdlib `net/http` ServeMux (method + `{param}` patterns) | No framework lock-in; Go 1.22+ routing is enough |
| Middleware | `func(http.Handler) http.Handler` chain | Composable, stdlib-shaped |
| DB driver | `pgx/v5` + `pgxpool` | Fastest Postgres driver, native types |
| Queries | `sqlc` (pgx/v5, emit interfaces) | Type-safe SQL, no ORM magic |
| Migrations | `goose` (after cutover) | SQL files, simple up/down |
| Logging | `log/slog` JSON | Stdlib structured logs |
| Config | env vars → typed struct (`caarlos0/env`) | 12-factor, fails fast on bad types |
| Validation | `go-playground/validator/v10` | Struct tags, field-level messages |
| JWT | `golang-jwt/jwt/v5` | HS256, simplejwt-compatible claims |
| Hashing | `golang.org/x/crypto` (argon2, pbkdf2) | Verify existing Django hashes |
| IDs | UUIDv7 (`google/uuid`) | Same as Django `core.ids.uuid7` |
| Tests | `testing` + `httptest` + real Postgres | Contract tests against the real schema |

## Layout

```
backend-go/
  cmd/api/            main: config → db → router → graceful shutdown
  cmd/worker/         background sweeps (replaces run_task_worker)
  db/schema.sql       schema dump (sqlc input)
  db/queries/<mod>/   *.sql for sqlc
  internal/
    platform/         cross-cutting, no business logic
      config/ logging/ database/ (pool, tx helper) ids/ clock/
    httpx/            transport kit, reused by every module
      respond/        JSON success + error envelope
      apperr/         DomainError equivalent (code, message, details, status)
      middleware/     request id, recover, access log, CORS, auth, capability
      decode/         strict JSON decode + validation → VALIDATION_ERROR
      paginate/       cursor (feeds) + page number (admin tables)
      router/         route registration helpers
    auth/             tokens, hashers, current-user context, capabilities
    <module>/         one folder per Django app (accounts, mobility, finance…)
      handler_*.go    HTTP only: decode → call service → respond
      service_*.go    business rules, transactions
      store.go        sqlc-backed persistence behind an interface
      dto.go          request/response shapes (the JSON contract)
      routes.go       mounts the module's endpoints
```

Dependencies point one way: `handler → service → store`. Handlers never touch
SQL; services never touch `http`. Domain errors are typed (`apperr.Error`) and
translated to the envelope in exactly one place (`respond.Error`).

## Contract details (copied from Django)

- Success: bare JSON body (no wrapper). 201 for creates, 204 for deletes.
- Error: `{"error": {"code", "message", "details", "request_id"}}`;
  `THROTTLED` adds `Retry-After`. Unique-constraint violation → 409
  `VALIDATION_ERROR` `{field: ["already exists"]}`.
- Cursor pages (feeds): `{"results", "next", "previous"}`; `page_size` ≤ 100,
  default 10; `next`/`previous` are full URLs carrying `cursor=`.
- Number pages (admin tables): `{"count", "page_size", "current_page",
  "total_pages", "next", "previous", "results"}`.
- Time zone: store UTC, business day = Africa/Lagos.

## Phases

0. **Foundation** — module skeleton, config, logging, db pool + tx, httpx kit,
   auth tokens + hashers, health endpoint, contract-test harness.
1. **Auth + accounts + users/roles** — login, OTP, PIN, refresh, me, RBAC.
2. **Mobility core** — hubs, batteries, vehicles, reservations, swaps (largest).
3. **Money** — wallets, payments, ledger, holds, receipts, statements, cash ops.
4. **Operations + risk + alerts + support + notifications + audit.**
5. **Credit, offers, segments, analytics, reports, config, media, webhooks.**
6. **Worker** — every sweep from `run_task_worker`.
7. **Cutover** — run both side by side, compare responses, switch traffic.

## Progress log

- 2026-10-22 — Branch `go-backend` created. Endpoint checklist generated
  (317 operations). Stack chosen.
- 2026-10-22 — **Phase 0 done.** config, slog logging, pgx pool + `InTx`,
  UUIDv7, httpx kit (apperr, respond envelope, decode+validate, query params,
  cursor/page pagination, Django-style exact-match router), middleware
  (request id + X-Kura-Server-Time, recover, access log, CORS), auth (Django
  argon2/pbkdf2 verify + hash, simplejwt-compatible tokens verified both ways
  against live Django, pin grants, session_version check, capability matrix
  generated from Django by `scripts/gen_capabilities.py`), sqlc wired to
  `db/schema.sql`, `/healthz` + `/readyz`. Smoke-tested against the dev DB.
  **Next: Phase 1** — test harness (test DB from schema.sql), then auth
  endpoints (`/api/v1/auth/*`: login, otp request/verify, pin login, refresh,
  logout, me, pin set/change) with contract tests vs Django.

### How to run
```
cd backend-go
DATABASE_URL=postgres://kura:kura_dev_password@127.0.0.1:5432/kura \
DJANGO_SECRET_KEY=<same as Django> PORT=8091 go run ./cmd/api
go test ./...
sqlc generate            # after editing db/queries/*.sql
cd ../backend && uv run python ../backend-go/scripts/gen_capabilities.py  # after role changes
```
