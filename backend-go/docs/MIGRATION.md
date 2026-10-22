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
7. **Cutover** — strangler proxy: Go fronts all traffic and forwards
   not-yet-ported routes to Django (`DJANGO_UPSTREAM_URL`). Every response
   carries `X-Kura-Served-By: go|django`. Production can run this from the
   first ported module; when the checklist is complete, unset the upstream.

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
- 2026-10-22 — Phase 1 in progress. Done: `events.Emit` (hash-chained audit
  with Django's advisory lock + canonical JSON byte-identical to Python,
  notifications with dedupe + rider SMS preference gating), `testkit`
  (per-package test DB from schema.sql, truncate between tests, user
  fixtures). **Next:** throttles (`core/throttles.py`), then the auth
  endpoints in `internal/accounts/` (see AuthViewSet + AuthService in Django).
- 2026-10-22 — **10/317 endpoints done** (auth: login, login/begin,
  otp/request, otp/verify, pin/login, pin/set, pin/verify, token/refresh,
  logout, onboarding/complete). Throttles ported (DRF sliding log, same
  rates/scopes/429; router applies auth → permission → throttle). Contract
  check `scripts/contract/auth.py` passes 15/15 against live Django, incl. a
  shared refresh blacklist across both backends. Go integration tests in
  `internal/accounts/auth_test.go` via `internal/apitest`.
  Known intentional difference: unknown routes return the JSON 404 envelope
  (Django DEBUG returns an HTML page).
  **Next:** remaining auth endpoints — `GET /auth/me/` (needs
  AccountSerializer, IdentityService.kyc_payload, media delivery_url,
  ConsentService.state, reconcile_onboarding), me/profile, me/consent,
  password/change, password-setup(+context), devices/heartbeat.
- 2026-10-22 — **All 17 /auth endpoints done (17/317).** /auth/me is
  byte-identical to Django for 7 users (staff, fleet, verified riders with
  KYC photos). Added: `media` (Cloudinary delivery URLs, SDK-identical),
  `risk.Emit` (rule catalogue + risk events + reviewer pages), `jsontime`
  (DRF field = Lagos ISO µs; DjangoJSONEncoder raw = UTC ms Z; isoformat),
  `scripts/dev.sh` (runs Go with Django's exact .env). Contract scripts:
  `scripts/contract/{auth,me,profile}.py` — 15 + 7 + 23 checks identical.
  Note: re-running auth.py within an hour hits real throttles (429) — expected.
  **Next:** rest of accounts (users, roles, permissions, drivers,
  cooperatives, accounts CRUD/identity) then mobility.
- 2026-10-22 — Strangler proxy added (`internal/server/upstream.go`).
  **Frontend tested through Go** (apps pointed at :8091): admin sign-in +
  dashboard/hubs/payments/operators, rider phone → PIN → consent → home —
  zero failed requests; Go served auth/me/consent/heartbeat, Django the rest.
  Run: `CORS_ORIGINS=... scripts/dev.sh` and
  `VITE_API_BASE_URL=http://localhost:8091/api/v1 npx vite --port 5185|5187`.
- 2026-10-22 — **Roles + permissions (10) done → 27/317.** New shared kit:
  `listq` (q search with LIKE escaping, exact filters), `export` (CSV/PDF,
  same caps + X-Export-* headers, exposed via CORS), `actor`. Contract
  `scripts/contract/rbac.py` 34/34 incl. cross-reads (each backend reads back
  what the other wrote). Fixed in Go: path values on {id} routes, DRF's
  page=1 omission in `previous`, "Not found." for malformed ids.

- 2026-10-22 — **Staff users (9) done → 36/317.** Invite/update/activate/
  deactivate/resend + list (all StaffUserFilter params), stats, CSV/PDF export.
  New `mail` package: Django email templates as Go templates (HTML golden-
  tested identical), brand CIDs, SMTP SSL/STARTTLS or console, sent after
  commit. Contract `scripts/contract/users.py` 29/29 incl. cross-reads.

- 2026-10-22 — **Cooperatives (4) + drivers (4) done → 44/317.** New
  `scope` package (hub_ids_for / account_ids_touching_hubs) used by every
  scoped list from here on. Decoder now matches DRF: strings trimmed,
  present-but-blank → "This field may not be blank.", query UUIDs say
  "Enter a valid UUID.". All 6 contract suites identical (coops_drivers,
  rbac, users, profile, auth, me). Note: running all suites back-to-back
  hits the real 20/min anon throttle on both backends — run auth.py alone.

- 2026-10-22 — Accounts CRM reads: list (CRM vs plain serializer, scoped by
  accounts_for, q/search/status/kyc/kind/date/ordering filters), detail,
  kyc, export, stats, detail stats, me/fleet-spend. New `internal/spend`
  package (windows, fleet money, drivers today, petrol). `scripts/contract/
  accounts.py`: 179 checks identical across ops/admin/hub agent/owner,
  covering all 111 completed swaps and plan fees. Then me/impact (CPython
  set order reproduced for `_own_account_ids()[0]`). 189 checks identical.
  Lessons: Go's pool now uses `plan_cache_mode=force_custom_plan` so ties in
  unordered/equal-key results come back in Django's order (pgx generic
  plans picked other scans); check model `Meta.ordering` (Driver is
  -created_at) for querysets without explicit order_by;
  `scripts/restart_go.sh` kills by port (pkill missed the built binary) and
  `lib.fresh()` resets both throttles mid-suite. Next: accounts writes
  (identity/KYC, suspend/reinstate/notify/set-coop/register/PATCH/create),
  then mobility.

- 2026-10-22 — Identity / KYC writes: rider submit / photos / withdraw and
  staff kyc submit / verify / reject / request-photos, with complete_profile,
  consent grant, Paystack + Nomba clients (`internal/integrations/psp`) and
  VA provisioning with dev NUBAN fallback, retry schedule, staff alerts and
  the retry sweep (`internal/integrations/va`). `scripts/contract/
  identity.py` signs up a fresh rider per backend, runs 33 steps, then
  compares audit trail, notifications, VA and account rows: 40 identical.
  decode now reports every field error at once with DRF wording/coercions.
  VA provisioning stays synchronous after commit like Django: a background
  goroutine killed by a deploy would leave the NUBAN unscheduled forever.

- 2026-10-22 — Accounts module complete (66/317 ticked). Frontend checked
  against Go (VITE_API_BASE_URL=http://localhost:8091/api/v1, see the kura
  root .claude/launch.json): admin login → dashboard → operators list +
  stats → operator detail (KYC, detail stats charts, money); rider OTP
  signup → home → add name (POST /accounts/) → account (impact) → identity
  form. Zero failed requests; /auth/me and impact identical on both
  backends for the browser-made rider. Next: mobility (125).

- 2026-10-22 — Mobility + finance core → 158/317 ticked. Hubs, battery
  types (maker-checker via `internal/approval`), batteries (custody verbs,
  hash-chained BatteryEvent trail with Python-identical canonical JSON, QR
  labels), vehicles + models (scoped reads, writes, assignments, commands,
  QR / IoT keys, retire), finance (ledger, payments, wallets, holds, plan
  fees, receipts JSON/PDF with HMAC seal, statement export, dev fund),
  pricing (tariff matrices, hold policy, ensure_defaults), the plan
  catalogue, discount campaigns (CRUD, activate, redeem quote, cursor
  redemptions) and subscriptions (purchase, renew, switch preview / queue /
  immediate, auto-renew, cancel). Suites: battery_types 20, batteries 154,
  vehicles 125, finance 130, pricing_plans 71, subscriptions_discounts 116 —
  all identical, including audit rows, wallet balances, payments and
  redemption ledger rows. All Go files are now under 300 lines.

- 2026-10-22 — Risk (10 endpoints → 168/317): rules list / detail / PUT /
  PATCH, events cursor list (filters + ?q=), detail with active velocity
  grant, manual flag, stats, CSV/PDF export, review with SWAP_VELOCITY
  grants; plus the velocity engine the bay uses (inspect, grant consume,
  block-or-grant with a committed risk event, bay status, exception
  request). `scripts/contract/risk.py`: 79 identical incl. cursor walks,
  grants, audit and reviewer notifications. `follow()` moved into lib.py.
- 2026-10-22 — Support cases (8 → 176/317): scoped cursor list (cases_for:
  cases:read / hub scope / own accounts), filters incl. unassigned + SLA,
  detail with events + attachment URLs, open (own-account rules, driver /
  payment / owned-asset checks, optional assign), notes (owner pages staff,
  staff page owner), status, assign / unassign, stats, export.
  `OpenCase` is exported for the bay identity-mismatch flow.
  `scripts/contract/support.py`: identical incl. case events,
  notifications and audit. `scope.OwnAccounts` shared.
- 2026-10-22 — Operations (30 → 206/317): shifts (open / close with
  variance → risk + alert + notice / lodge into psp_clearing), cash deposits
  (float limit, SWAP + FUND ledger, receipt JSON/PDF + emailed PDF, dispute
  flag → support case), overrides (agent PIN grant, daily-limit alert),
  alerts (triage, stats, export), alert rules, inventory counts, command
  centre (30 s cache) and activity. `Service.Record` / `RecordOverride` are
  exported for swap settlement. `scripts/contract/operations.py`: 155
  identical; `run_all.sh` runs all 19 suites (all identical).
  Unique-violation 409s now name the column from the Postgres detail, like
  Django's `_UNIQUE_RE`.
- 2026-10-22 — Config (5) + credit / offers / segments (32) → 243/317.
  Platform config with maker-checker; credit eligibility (blockers,
  behavioural score, device trust), score override, apply / approve /
  decline with SWAP_CREDIT loans, repay (interest-first wallet debit +
  ledger split), offers on both mounts (/credit/offers, /offers), saved
  segments (criteria validation, preview, members). `ConsumeSwapCredit`,
  `ActiveSwapCredit`, `CheckBustout` exported for swap settlement.
  config.py 50 + credit.py 82 identical.
- 2026-10-22 — The bay: reservations + swaps + hub status (24 → 267/317).
  Holds (fleet guards, overdue-pack check, hub hours, plan / credit checks,
  RESERVED pack + hash-chained event, sealed QR via Django signing, booking
  discount, wallet hold, rider + agent notices), lookup triage, extend,
  cancel / expire (hold + discount + pack release, linked session abort);
  swap start (scope, idempotent client id, committed velocity check),
  return / issue custody, complete (fee rules, bay discount, rider PIN,
  wallet capture / walk-in / agent cash / swap credit / plan allowance,
  geo-impossible flag, override, credit bust-out after commit), legacy
  one-shot, abort, reverse (custody + money), identity mismatch, velocity
  status / exception, rider PIN, hub status (cancels holds, pages staff).
  `scripts/contract/bay.py`: 89 identical incl. pack states, battery
  events, payments, wallet, audit and notifications. All 22 suites
  identical. Battery full-save now persists `charge_observed_at`.
- Telemetry (`internal/telemetry`): fleet summary (LIVE / STATIONARY /
  OFFLINE), event feed + detail, staff ingest and device-key IoT ingest
  (`/api/v1/telemetry/ingest`, sha256 key, hardware id, single reading or
  batch of up to 100) through one apply path: event row, battery SoC
  write-through (older readings never overwrite newer), audit.
  `scripts/contract/telemetry.py`: 50 identical incl. nested batch errors
  (DRF reports failing items keyed by index), battery state and audit.
- Path B (`internal/engines`): petrol engines (owner-scoped reads with the
  HasCapabilityOrReadOwn object check, release request → ENGINE_RELEASE
  support case + owner notice, release with photos / signature), retrofit
  wizard (create → engine intake → install → checklist → activate, every
  guard) and e-boarders (filters, stats, create / patch, issue on install).
  Media refs resolve like `resolve_media_ref` (`media.ResolveRef`).
  `scripts/contract/engines.py`: identical.
- Analytics (`internal/analytics`): dashboard tiles (Lagos midnight),
  hub demand forecast (hub-scoped, peak hour in Lagos time despite the
  `peak_hour_utc` name — mirrored), revenue overview / streams (inclusive
  Lagos-day windows), government impact snapshot + series, cooperative
  rollups (chairman or cooperative / account managers) and the impact story
  CMS. `scripts/contract/analytics.py`: identical.
- Reports (`internal/reports`): ReportJob create (idempotent per requester
  + key, OTHER → 501) with synchronous render, status (READY past TTL reads
  EXPIRED) and download. CSVs (ops / fleet / revenue, Python csv quoting,
  CRLF) are byte-identical to Django; the impact PDF uses go-pdf/fpdf with
  the same text and layout. Files go under `MEDIA_ROOT` (default: working
  directory, like Django's FileSystemStorage). `scripts/contract/reports.py`:
  identical.
- Media upload (`internal/uploads`, `media.Upload`): multipart only (415
  otherwise), file / files / file[] / files[], MIME sniffing for generic
  types, size caps, signed Cloudinary upload (SHA-1, signature v2, same
  params as the Python SDK), MediaAsset rows, media_upload throttle only.
  `scripts/contract/media.py` uploads real files: identical.
- Worker (`cmd/worker`, `internal/jobs`; run with `scripts/worker.sh`):
  every `run_task_worker` sweep in the same order — unreturned packs
  (LOST + risk + chairman/owner notice + email + owner suspension), swap
  lifecycle (expire holds, free orphaned RESERVED packs, abort stale /
  dead-hold swaps), mock IoT tick (MOCK_IOT_ENABLED), shift auto-close,
  cash settlement sweep (unlodged float, drawer variance, 24h escalation),
  subscriptions (expire / queued switch / auto-renew / lapse / price-change
  warning), scheduled price matrices, virtual-account retries, and the
  daily credit jobs (score recompute, auto-debit with the miss ladder).
  Flags mirror Django's (`--once`, `--sleep`, `--no-*`), plus `--only` and
  `--json`. Mail is sent directly, so there is no QueuedTask queue to drain.
  `scripts/contract/sweeps/run.py` clones the dev DB twice (template
  `kura_sweeps_base`), builds the same fixture in both through Django's ORM,
  runs Django's job on one clone and the Go worker on the other, and
  compares results plus every touched table, audit row and notification:
  identical for all 11 jobs (dev NUBANs and timestamps normalised).
- Known gap (API-only, no frontend use): DRF cursor lists honour
  `?ordering=` via OrderingFilter (any serializer field); Go cursor lists
  (payments, ledger, battery events, risk events) ignore it. Fix in one pass
  after swaps.

### Django bugs found while porting (fixed on main too)
- Worker auto-renew never succeeded: the renew idempotency keys
  `auto-renew:{id}:{ends_at.isoformat()}` / `queued-end:...` are ~80 chars
  but `subscription.idempotency_key` is varchar(64), so a successful charge
  raised DataError (not a DomainError), rolled back and crashed the whole
  subscriptions sweep. Keys now use the Unix second (58 chars)
  (`mobility/services/plans/jobs.py`).
- Impact PDF printed the disclaimer's em dash as "?" (latin-1 replace);
  `_ascii` now maps it to "-" (`analytics/services/impact_pdf.py`).
- Re-assigning an offer to an account that already has it → 500: the
  IntegrityError was caught inside `transaction.atomic`, so the follow-up
  `.get()` hit a broken transaction. Now `get_or_create`
  (`credit/services/offers.py`).
- **Data exposure:** `CashDepositViewSet` treated `finance:read` as "see
  everything", but DRIVER / FLEET_OWNER hold `finance:read` for their own
  rows — any rider could list every operator's cash deposits and open their
  receipts. Now uses `_can_read_all_finance` (staff only), like payments.
- **Security:** `ReservationViewSet` (ModelViewSet) exposed PUT / PATCH /
  DELETE with a fully writable ReservationSerializer and no capability for
  those actions, so any signed-in rider could edit their hold (status,
  hold_amount_kobo, battery…) or delete it. `SwapViewSet` likewise exposed
  `POST /mobility/swaps/` (create) — anyone signed in could insert a
  COMPLETED swap for any account. Closed both (http_method_names /
  ReadOnlyModelViewSet; regression test `mobility/tests/
  test_viewset_methods.py`); Go never registers them. No frontend used them.
- Renewing with a discount code and no idempotency key → 500: the
  redemption key `disc-renew:{sub.id}:{payment.id}` is 84 chars into a
  varchar(64). Fixed in `mobility/services/plans/renew.py` (and Go) as
  `disc-renew:{payment.id}` — the payment id alone is unique.
- Battery stats totals were all 1: `batteries_queryset()` orders by
  -created_at and that column joined the GROUP BY. Fixed in
  `mobility/selectors.py` with `.order_by()` (go-backend branch; cherry-pick
  to main).
- Role update/activate/deactivate → 500: audit JSON got raw UUIDs
  (`accounts/services/roles.py`). Fixed with str().

- `PATCH /accounts/{id}/` with a non-string `display_name` (e.g. 42) → 500
  (`.strip()` on int; the view reads request.data without a serializer).
  Go returns the 400 "display_name is required.".

- Hub detail stats never use the demand forecast: `hub_demand_forecast(
  user=None)` gets an empty hub scope from `hub_ids_for(None)`, so
  `expected_swaps_today` is always the fallback `round(swaps_per_day)`
  (null with no swaps). Go mirrors the fallback; fix both together.
- `GET /mobility/hubs/discover/` with a non-UUID `vehicle` / `battery_type`
  or non-numeric `lat`/`lng`/`radius_km` → 500 (unchecked float()/UUID()).
  Go answers 400 for that parameter.

### Django quirks kept for parity (fix in both later)
- `GET /analytics/demand/hubs/` labels the peak hour `peak_hour_utc` but
  ExtractHour runs in Africa/Lagos. Go mirrors the Lagos hour.
- Revenue `start_date` / `end_date` that match YYYY-MM-DD but aren't real
  dates (2026-02-30) → 500 (parse_date raises); Go answers the 400.
- Retrofit state errors print the TextChoices repr: "Retrofit must be in
  [Retrofit.Status.CHECKED]; is FAILED." (should be plain values).
- Retrofit create / engine intake / install with an unknown account,
  vehicle, storage hub or e-boarder id → 500 (`.get()`); Go answers 404.
- Engine detail needs `accounts:read` (or ownership) on top of
  `engines:manage` — HasCapabilityOrReadOwn's object check.
- PSP webhook responses report `status: RECEIVED` for a new event even after
  it was processed / ignored (the view returns the pre-processing object).
- Swap completion response shows the reservation's pre-save status
  (`CONFIRMED`; stale select_related object) while the row is `USED`. Go
  returns the saved value.
- `POST /reservations/` reads `request.data` without a serializer: any
  `payment_mode` string is accepted (an unknown mode holds no money);
  unknown vehicle / hub / no driver → 500 in Django, 400/404 in Go.
- Config namespaces and versions are readable with `finance:read`, which
  rider roles hold (only the admin app calls these endpoints).
- `POST /credit/scores/{unknown}/override/`, offer assign with an unknown
  account id → 500 in Django (`.get()`); Go answers 404.
- Buying a plan whose vehicle_type differs from the vehicle's (e.g. a BOAT
  plan on a motorcycle) is allowed; the charge uses the vehicle's tariff.
- Immediate plan switch cancels the old subscription in one transaction and
  buys in a second; a failed purchase (e.g. low wallet) leaves the vehicle
  with no plan. Go mirrors it.
- `POST /subscriptions/` (and switch / preview) with an unknown vehicle or
  plan id → 500 (`.get()`); Go answers 404.
- Discount create checks the code UniqueValidator on the raw input but
  saves it upper-cased, so `abc` when `ABC` exists → IntegrityError 500;
  Go answers the unique-field 400.
- `GET /accounts/stats/` is network-wide and open to any signed-in user
  (HasCapabilityOrReadOwn lets safe methods through, the stats aren't
  scoped). A rider can read total operator counts. Should require
  accounts:read.
- CRM `active_plan_name` shows the newest subscription of any status
  (prefetch ignores status=ACTIVE), so an expired plan still shows.
- `account.suspended` / `account.reinstated` notifications use a fixed
  dedupe key per account, so the second suspension of the same operator
  never notifies the actor again.
- Operator invites (register) link to the admin console's create-password
  page, same as staff invites.
- Account detail stats default window ends on the UTC date, fleet spend on
  the Lagos date (00:00–01:00 WAT they differ by a day).
- List `end_date` filters (django-filters DateFilter on a datetime) stop at
  Lagos *midnight starting* that day, so the end day is excluded. Stats use
  the inclusive day. Unify once Go is primary.
- Plain-text emails HTML-escape `&` (Django autoescapes .txt templates). Go
  sends the correct `&` (golden test documents the one difference).

### How to run
```
cd backend-go
DATABASE_URL=postgres://kura:kura_dev_password@127.0.0.1:5432/kura \
DJANGO_SECRET_KEY=<same as Django> PORT=8091 go run ./cmd/api
go test ./...
sqlc generate            # after editing db/queries/*.sql
cd ../backend && uv run python ../backend-go/scripts/gen_capabilities.py  # after role changes
```
