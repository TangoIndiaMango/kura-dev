-- name: ListCooperatives :many
SELECT c.id, c.name, c.region, c.status, c.chairman_user_id, c.created_at, c.updated_at,
  u.email AS chairman_email,
  (SELECT count(*) FROM accounts_account a WHERE a.cooperative_id = c.id)::int AS member_count
FROM accounts_cooperative c LEFT JOIN accounts_user u ON u.id = c.chairman_user_id
WHERE (sqlc.arg(all_rows)::bool OR c.chairman_user_id = sqlc.narg(chairman))
  AND (sqlc.narg(q)::text IS NULL OR c.name ILIKE '%' || sqlc.narg(q) || '%'
       OR c.region ILIKE '%' || sqlc.narg(q) || '%')
ORDER BY c.name
LIMIT sqlc.arg(lim) OFFSET sqlc.arg(off);

-- name: CountCooperatives :one
SELECT count(*) FROM accounts_cooperative c
WHERE (sqlc.arg(all_rows)::bool OR c.chairman_user_id = sqlc.narg(chairman))
  AND (sqlc.narg(q)::text IS NULL OR c.name ILIKE '%' || sqlc.narg(q) || '%'
       OR c.region ILIKE '%' || sqlc.narg(q) || '%');

-- name: GetCooperative :one
SELECT c.id, c.name, c.region, c.status, c.chairman_user_id, c.created_at, c.updated_at,
  u.email AS chairman_email,
  (SELECT count(*) FROM accounts_account a WHERE a.cooperative_id = c.id)::int AS member_count
FROM accounts_cooperative c LEFT JOIN accounts_user u ON u.id = c.chairman_user_id
WHERE c.id = $1;

-- name: CooperativeAccountIDs :many
SELECT id FROM accounts_account WHERE cooperative_id = $1 ORDER BY created_at, id;

-- name: InsertCooperative :exec
INSERT INTO accounts_cooperative (id, created_at, updated_at, name, region, status)
VALUES ($1, now(), now(), $2, $3, 'ACTIVE');

-- name: UpdateCooperative :exec
UPDATE accounts_cooperative SET name = $2, region = $3, status = $4, updated_at = now() WHERE id = $1;

-- name: ListDrivers :many
SELECT d.id, d.user_id, d.account_id, d.license_number, d.status, d.daily_swap_limit,
  d.daily_spend_kobo_limit, u.phone, u.first_name, u.last_name
FROM accounts_driver d JOIN accounts_user u ON u.id = d.user_id
WHERE (sqlc.arg(all_rows)::bool OR d.account_id = ANY(sqlc.arg(account_ids)::uuid[])
       OR d.user_id = sqlc.narg(only_user))
  AND (sqlc.narg(account)::uuid IS NULL OR d.account_id = sqlc.narg(account))
  AND (sqlc.narg(status)::text IS NULL OR d.status = sqlc.narg(status))
  AND (sqlc.narg(user_id)::uuid IS NULL OR d.user_id = sqlc.narg(user_id))
  AND (sqlc.narg(q)::text IS NULL OR u.first_name ILIKE '%' || sqlc.narg(q) || '%'
       OR u.last_name ILIKE '%' || sqlc.narg(q) || '%' OR u.phone ILIKE '%' || sqlc.narg(q) || '%'
       OR d.license_number ILIKE '%' || sqlc.narg(q) || '%')
ORDER BY d.created_at DESC, d.id
LIMIT sqlc.arg(lim) OFFSET sqlc.arg(off);

-- name: CountDrivers :one
SELECT count(*) FROM accounts_driver d JOIN accounts_user u ON u.id = d.user_id
WHERE (sqlc.arg(all_rows)::bool OR d.account_id = ANY(sqlc.arg(account_ids)::uuid[])
       OR d.user_id = sqlc.narg(only_user))
  AND (sqlc.narg(account)::uuid IS NULL OR d.account_id = sqlc.narg(account))
  AND (sqlc.narg(status)::text IS NULL OR d.status = sqlc.narg(status))
  AND (sqlc.narg(user_id)::uuid IS NULL OR d.user_id = sqlc.narg(user_id))
  AND (sqlc.narg(q)::text IS NULL OR u.first_name ILIKE '%' || sqlc.narg(q) || '%'
       OR u.last_name ILIKE '%' || sqlc.narg(q) || '%' OR u.phone ILIKE '%' || sqlc.narg(q) || '%'
       OR d.license_number ILIKE '%' || sqlc.narg(q) || '%');

-- name: GetDriverRow :one
SELECT d.id, d.user_id, d.account_id, d.license_number, d.status, d.daily_swap_limit,
  d.daily_spend_kobo_limit, u.phone, u.first_name, u.last_name, a.owner_user_id
FROM accounts_driver d JOIN accounts_user u ON u.id = d.user_id
JOIN accounts_account a ON a.id = d.account_id
WHERE d.id = $1;

-- name: DriverByUser :one
SELECT id, account_id, license_number, status, daily_swap_limit, daily_spend_kobo_limit
FROM accounts_driver WHERE user_id = $1 LIMIT 1;

-- name: InsertFleetDriverUser :exec
INSERT INTO accounts_user (id, created_at, updated_at, password, is_superuser, phone,
    first_name, last_name, role, pin_hash, is_active, is_staff, pin_failed_attempts,
    onboarding_step, public_id, notification_prefs, session_version)
VALUES ($1, now(), now(), $2, false, $3, $4, $5, 'DRIVER', '', true, false, 0, 'home', $6, '{}'::jsonb, 0);

-- name: InsertFleetDriver :exec
INSERT INTO accounts_driver (id, created_at, updated_at, license_number, status, account_id,
    user_id, daily_swap_limit, daily_spend_kobo_limit)
VALUES ($1, now(), now(), $2, 'ACTIVE', $3, $4, $5, $6);

-- name: ReattachDriver :exec
UPDATE accounts_driver SET license_number = $2, status = 'ACTIVE', daily_swap_limit = $3,
  daily_spend_kobo_limit = $4, updated_at = now() WHERE id = $1;

-- name: SetDriverLimits :exec
UPDATE accounts_driver SET daily_swap_limit = $2, daily_spend_kobo_limit = $3, updated_at = now()
WHERE id = $1;

-- name: AccountForUpdate :one
SELECT * FROM accounts_account WHERE id = $1 FOR UPDATE;

-- name: AccountVehicleCount :one
SELECT count(*) FROM mobility_vehicle WHERE account_id = $1;

-- name: SetAccountKind :exec
UPDATE accounts_account SET kind = $2, updated_at = now() WHERE id = $1;
