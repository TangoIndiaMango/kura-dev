-- Shared WHERE for the staff directory (StaffUserFilter). Dates arrive as
-- Lagos-midnight timestamps computed in Go (django-filters DateFilter).

-- name: ListStaffUsers :many
SELECT u.id FROM accounts_user u
WHERE u.is_staff
  AND (sqlc.narg(q)::text IS NULL OR u.email ILIKE '%' || sqlc.narg(q) || '%'
       OR u.first_name ILIKE '%' || sqlc.narg(q) || '%' OR u.last_name ILIKE '%' || sqlc.narg(q) || '%'
       OR u.phone ILIKE '%' || sqlc.narg(q) || '%' OR u.public_id ILIKE '%' || sqlc.narg(q) || '%')
  AND (sqlc.narg(role)::text IS NULL OR u.role = sqlc.narg(role))
  AND (sqlc.narg(hub)::text IS NULL OR EXISTS (SELECT 1 FROM accounts_staffmembership m
       WHERE m.user_id = u.id AND (m.hub_id = sqlc.narg(hub) OR m.hub_id = '*')))
  AND (sqlc.narg(is_active)::bool IS NULL OR u.is_active = sqlc.narg(is_active))
  AND (sqlc.narg(status)::text IS NULL
       OR (sqlc.narg(status) = 'ACTIVE' AND u.is_active AND u.last_login IS NOT NULL)
       OR (sqlc.narg(status) = 'INVITED' AND u.is_active AND u.last_login IS NULL)
       OR (sqlc.narg(status) IN ('SUSPENDED', 'REVOKED') AND NOT u.is_active)
       OR sqlc.narg(status) NOT IN ('ACTIVE', 'INVITED', 'SUSPENDED', 'REVOKED'))
  AND (sqlc.narg(created_from)::timestamptz IS NULL OR u.created_at >= sqlc.narg(created_from))
  AND (sqlc.narg(created_to)::timestamptz IS NULL OR u.created_at <= sqlc.narg(created_to))
ORDER BY u.created_at DESC, u.id
LIMIT sqlc.arg(lim) OFFSET sqlc.arg(off);

-- name: CountStaffUsers :one
SELECT count(*) FROM accounts_user u
WHERE u.is_staff
  AND (sqlc.narg(q)::text IS NULL OR u.email ILIKE '%' || sqlc.narg(q) || '%'
       OR u.first_name ILIKE '%' || sqlc.narg(q) || '%' OR u.last_name ILIKE '%' || sqlc.narg(q) || '%'
       OR u.phone ILIKE '%' || sqlc.narg(q) || '%' OR u.public_id ILIKE '%' || sqlc.narg(q) || '%')
  AND (sqlc.narg(role)::text IS NULL OR u.role = sqlc.narg(role))
  AND (sqlc.narg(hub)::text IS NULL OR EXISTS (SELECT 1 FROM accounts_staffmembership m
       WHERE m.user_id = u.id AND (m.hub_id = sqlc.narg(hub) OR m.hub_id = '*')))
  AND (sqlc.narg(is_active)::bool IS NULL OR u.is_active = sqlc.narg(is_active))
  AND (sqlc.narg(status)::text IS NULL
       OR (sqlc.narg(status) = 'ACTIVE' AND u.is_active AND u.last_login IS NOT NULL)
       OR (sqlc.narg(status) = 'INVITED' AND u.is_active AND u.last_login IS NULL)
       OR (sqlc.narg(status) IN ('SUSPENDED', 'REVOKED') AND NOT u.is_active)
       OR sqlc.narg(status) NOT IN ('ACTIVE', 'INVITED', 'SUSPENDED', 'REVOKED'))
  AND (sqlc.narg(created_from)::timestamptz IS NULL OR u.created_at >= sqlc.narg(created_from))
  AND (sqlc.narg(created_to)::timestamptz IS NULL OR u.created_at <= sqlc.narg(created_to));

-- name: StaffStats :one
SELECT count(*)::int AS all_users,
  count(*) FILTER (WHERE is_active AND last_login IS NOT NULL)::int AS active,
  count(*) FILTER (WHERE is_active AND last_login IS NULL)::int AS invited,
  count(*) FILTER (WHERE NOT is_active)::int AS suspended,
  (SELECT count(*) FROM accounts_role)::int AS roles
FROM accounts_user
WHERE is_staff
  AND (sqlc.narg(created_from)::timestamptz IS NULL OR created_at >= sqlc.narg(created_from))
  AND (sqlc.narg(created_to)::timestamptz IS NULL OR created_at <= sqlc.narg(created_to));

-- name: RoleByCode :one
SELECT id, code, name, is_active FROM accounts_role WHERE code = $1;

-- name: EmailTaken :one
SELECT EXISTS (SELECT 1 FROM accounts_user WHERE upper(email) = upper(sqlc.arg(email)::text));

-- name: InsertStaffUser :exec
INSERT INTO accounts_user (id, created_at, updated_at, password, is_superuser, email, phone,
    first_name, last_name, role, pin_hash, is_active, is_staff, assigned_role_id,
    pin_failed_attempts, onboarding_step, public_id, notification_prefs, session_version)
VALUES ($1, now(), now(), $2, $3, $4, $5, $6, $7, $8, '', true, true, $9, 0, 'pin', $10,
    '{}'::jsonb, 0);

-- name: UpdateStaffUser :exec
UPDATE accounts_user SET first_name = $2, last_name = $3, phone = $4, role = $5,
    assigned_role_id = $6, is_superuser = $7, is_active = $8, session_version = $9,
    updated_at = now()
WHERE id = $1;

-- name: ClearMemberships :exec
DELETE FROM accounts_staffmembership WHERE user_id = $1;

-- name: InsertMembership :exec
INSERT INTO accounts_staffmembership (id, created_at, updated_at, role, hub_id, user_id)
VALUES ($1, now(), now(), 'HUB_AGENT', $2, $3);

-- name: ExistingHubIDs :many
SELECT id FROM mobility_hub WHERE id = ANY(sqlc.arg(ids)::uuid[]);

-- name: CooperativeForUpdate :one
SELECT id, name, chairman_user_id FROM accounts_cooperative WHERE id = $1 FOR UPDATE;

-- name: SetCooperativeChairman :exec
UPDATE accounts_cooperative SET chairman_user_id = $2, updated_at = now() WHERE id = $1;

-- name: ConsumeOpenSetupTokens :exec
UPDATE accounts_passwordsetuptoken SET consumed_at = now(), updated_at = now()
WHERE user_id = $1 AND purpose = $2 AND consumed_at IS NULL;

-- name: InsertSetupToken :exec
INSERT INTO accounts_passwordsetuptoken (id, created_at, updated_at, purpose, token_hash, expires_at, user_id)
VALUES ($1, now(), now(), $2, $3, $4, $5);
