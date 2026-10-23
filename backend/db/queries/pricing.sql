-- Pricing: tariff matrices, hold policy, catalogue plans (PricingService).

-- name: AnyHoldPolicy :one
SELECT EXISTS (SELECT 1 FROM mobility_bayholdpolicy);

-- name: FirstHoldPolicy :one
SELECT * FROM mobility_bayholdpolicy ORDER BY id LIMIT 1;

-- name: InsertHoldPolicy :one
INSERT INTO mobility_bayholdpolicy (id, created_at, updated_at, default_hold_minutes, max_extend_minutes)
VALUES ($1, clock_timestamp(), clock_timestamp(), $2, $3) RETURNING *;

-- name: UpdateHoldPolicy :exec
UPDATE mobility_bayholdpolicy SET default_hold_minutes = $2, max_extend_minutes = $3, updated_at = now() WHERE id = $1;

-- name: ActiveMatrixExists :one
SELECT EXISTS (SELECT 1 FROM mobility_pricematrix WHERE vehicle_type = $1 AND status = 'ACTIVE');

-- name: InsertMatrix :one
INSERT INTO mobility_pricematrix (id, created_at, updated_at, vehicle_type, daily_kobo, weekly_kobo, monthly_kobo,
  pay_per_swap_kobo, effective_from, status, created_by_id, approved_by_id)
VALUES ($1, clock_timestamp(), clock_timestamp(), $2, $3, $4, $5, $6, $7, $8, $9, NULL) RETURNING *;

-- name: LatestActiveMatrix :one
-- Newest ACTIVE matrix for a type (no date bound) — ensure_defaults' sync.
SELECT * FROM mobility_pricematrix WHERE vehicle_type = $1 AND status = 'ACTIVE'
ORDER BY effective_from DESC, created_at DESC LIMIT 1;

-- name: ActiveMatrixAsOf :one
SELECT * FROM mobility_pricematrix WHERE vehicle_type = $1 AND status = 'ACTIVE'
  AND effective_from <= sqlc.arg(today)::date
ORDER BY effective_from DESC, created_at DESC LIMIT 1;

-- name: PlanByCode :one
SELECT * FROM mobility_plan WHERE code = $1;

-- name: InsertCataloguePlan :exec
INSERT INTO mobility_plan (id, created_at, updated_at, code, name, vehicle_type, period, duration_days,
  swap_allowance, price_kobo, description, auto_renew_default, status, is_active)
VALUES ($1, clock_timestamp(), clock_timestamp(), $2, $3, $4, $5, $6, $7, $8, '', false, 'ACTIVE', true)
ON CONFLICT (code) DO NOTHING;

-- name: SaveCataloguePlan :exec
UPDATE mobility_plan SET name = $2, vehicle_type = $3, period = $4, duration_days = $5, swap_allowance = $6,
  price_kobo = $7, is_active = $8, status = $9, updated_at = now() WHERE id = $1;

-- name: ExpirePPSSubscriptions :exec
UPDATE mobility_subscription SET status = 'EXPIRED', auto_renew = false, updated_at = now()
WHERE plan_id = $1 AND status = 'ACTIVE';

-- name: SyncPlanPrice :exec
UPDATE mobility_plan SET price_kobo = $3, updated_at = now() WHERE vehicle_type = $1 AND period = $2 AND is_active;

-- name: ListMatrices :many
SELECT * FROM mobility_pricematrix
WHERE (sqlc.narg(status)::text IS NULL OR status = sqlc.narg(status))
  AND (sqlc.narg(vehicle_type)::text IS NULL OR vehicle_type = sqlc.narg(vehicle_type))
ORDER BY CASE WHEN sqlc.arg(ord)::text = 'effective_from' THEN effective_from END,
  CASE WHEN sqlc.arg(ord)::text = 'created_at' THEN created_at END,
  CASE WHEN sqlc.arg(ord)::text = '-created_at' THEN created_at END DESC,
  CASE WHEN sqlc.arg(ord)::text = 'vehicle_type' THEN vehicle_type END,
  CASE WHEN sqlc.arg(ord)::text = '-vehicle_type' THEN vehicle_type END DESC,
  effective_from DESC, created_at DESC
LIMIT sqlc.arg(lim) OFFSET sqlc.arg(off);

-- name: CountMatrices :one
SELECT count(*) FROM mobility_pricematrix
WHERE (sqlc.narg(status)::text IS NULL OR status = sqlc.narg(status))
  AND (sqlc.narg(vehicle_type)::text IS NULL OR vehicle_type = sqlc.narg(vehicle_type));

-- name: MatrixByID :one
SELECT * FROM mobility_pricematrix WHERE id = $1;

-- name: MatrixForUpdate :one
SELECT * FROM mobility_pricematrix WHERE id = $1 FOR UPDATE;

-- name: SupersedeMatrices :exec
UPDATE mobility_pricematrix SET status = 'SUPERSEDED', updated_at = now()
WHERE vehicle_type = $1 AND status = 'ACTIVE' AND id <> $2;

-- name: SetMatrixStatus :exec
UPDATE mobility_pricematrix SET status = $2, approved_by_id = $3, effective_from = $4, updated_at = now() WHERE id = $1;

-- name: TariffNoticeOwners :many
-- Owners of vehicles of this type (distinct), for the customer notice.
SELECT DISTINCT u.id, u.email, u.phone, u.first_name
FROM mobility_vehicle v JOIN mobility_vehiclemodel m ON m.id = v.vehicle_model_id
JOIN accounts_account a ON a.id = v.account_id JOIN accounts_user u ON u.id = a.owner_user_id
WHERE m.vehicle_type = $1;

-- name: ListPlans :many
-- PlanViewSet: active subscriber counts; default order vehicle_type, price.
SELECT p.*, (SELECT count(*) FROM mobility_subscription s WHERE s.plan_id = p.id AND s.status = 'ACTIVE')::int
  AS active_subscriber_count
FROM mobility_plan p
WHERE (sqlc.narg(active)::bool IS NULL OR p.is_active = sqlc.narg(active))
  AND (sqlc.narg(active2)::bool IS NULL OR p.is_active = sqlc.narg(active2))
  AND (sqlc.narg(vehicle_type)::text IS NULL OR p.vehicle_type = sqlc.narg(vehicle_type))
  AND (sqlc.narg(status)::text IS NULL OR p.status = sqlc.narg(status))
  AND (sqlc.narg(period)::text IS NULL OR p.period = sqlc.narg(period))
ORDER BY CASE WHEN sqlc.arg(ord)::text = 'price_kobo' THEN p.price_kobo END,
  CASE WHEN sqlc.arg(ord)::text = '-price_kobo' THEN p.price_kobo END DESC,
  CASE WHEN sqlc.arg(ord)::text = 'name' THEN p.name END,
  CASE WHEN sqlc.arg(ord)::text = '-name' THEN p.name END DESC,
  CASE WHEN sqlc.arg(ord)::text = 'created_at' THEN p.created_at END,
  CASE WHEN sqlc.arg(ord)::text = '-created_at' THEN p.created_at END DESC,
  CASE WHEN sqlc.arg(ord)::text = '-vehicle_type' THEN p.vehicle_type END DESC,
  p.vehicle_type, p.price_kobo
LIMIT sqlc.arg(lim) OFFSET sqlc.arg(off);

-- name: CountPlans :one
SELECT count(*) FROM mobility_plan p
WHERE (sqlc.narg(active)::bool IS NULL OR p.is_active = sqlc.narg(active))
  AND (sqlc.narg(active2)::bool IS NULL OR p.is_active = sqlc.narg(active2))
  AND (sqlc.narg(vehicle_type)::text IS NULL OR p.vehicle_type = sqlc.narg(vehicle_type))
  AND (sqlc.narg(status)::text IS NULL OR p.status = sqlc.narg(status))
  AND (sqlc.narg(period)::text IS NULL OR p.period = sqlc.narg(period));

-- name: PlanWithCount :one
SELECT p.*, (SELECT count(*) FROM mobility_subscription s WHERE s.plan_id = p.id AND s.status = 'ACTIVE')::int
  AS active_subscriber_count
FROM mobility_plan p WHERE p.id = $1;

-- name: InsertPlan :exec
INSERT INTO mobility_plan (id, created_at, updated_at, code, name, vehicle_type, period, duration_days,
  swap_allowance, price_kobo, description, auto_renew_default, status, is_active)
VALUES ($1, clock_timestamp(), clock_timestamp(), $2, $3, $4, $5, $6, $7, $8, $9, $10, 'ACTIVE', true);

-- name: SavePlan :exec
UPDATE mobility_plan SET name = $2, description = $3, duration_days = $4, swap_allowance = $5, price_kobo = $6,
  auto_renew_default = $7, status = $8, is_active = $9, updated_at = now() WHERE id = $1;
