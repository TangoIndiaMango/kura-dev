-- name: ListPermissions :many
SELECT id, code, name, module, description FROM accounts_permission
WHERE (sqlc.narg(module)::text IS NULL OR module = sqlc.narg(module))
  AND (sqlc.narg(q)::text IS NULL
       OR code ILIKE '%' || sqlc.narg(q) || '%' OR name ILIKE '%' || sqlc.narg(q) || '%'
       OR module ILIKE '%' || sqlc.narg(q) || '%' OR description ILIKE '%' || sqlc.narg(q) || '%')
ORDER BY module, code
LIMIT sqlc.arg(lim) OFFSET sqlc.arg(off);

-- name: CountPermissions :one
SELECT count(*) FROM accounts_permission
WHERE (sqlc.narg(module)::text IS NULL OR module = sqlc.narg(module))
  AND (sqlc.narg(q)::text IS NULL
       OR code ILIKE '%' || sqlc.narg(q) || '%' OR name ILIKE '%' || sqlc.narg(q) || '%'
       OR module ILIKE '%' || sqlc.narg(q) || '%' OR description ILIKE '%' || sqlc.narg(q) || '%');

-- name: GetPermission :one
SELECT id, code, name, module, description FROM accounts_permission WHERE id = $1;

-- name: ListRoles :many
-- roles_qs: user_count = users assigned to the role, or legacy role=code rows.
SELECT r.id, r.code, r.name, r.description, r.is_system, r.is_active, r.created_at, r.updated_at,
  (SELECT count(*) FROM accounts_user u
     WHERE u.assigned_role_id = r.id OR (u.assigned_role_id IS NULL AND u.role = r.code))::int AS user_count,
  (SELECT count(DISTINCT rp.permission_id) FROM accounts_role_permissions rp WHERE rp.role_id = r.id)::int AS permission_count
FROM accounts_role r
WHERE (sqlc.narg(is_system)::bool IS NULL OR r.is_system = sqlc.narg(is_system))
  AND (sqlc.narg(is_active)::bool IS NULL OR r.is_active = sqlc.narg(is_active))
  AND (sqlc.narg(q)::text IS NULL
       OR r.code ILIKE '%' || sqlc.narg(q) || '%' OR r.name ILIKE '%' || sqlc.narg(q) || '%'
       OR r.description ILIKE '%' || sqlc.narg(q) || '%')
ORDER BY r.name
LIMIT sqlc.arg(lim) OFFSET sqlc.arg(off);

-- name: CountRoles :one
SELECT count(*) FROM accounts_role r
WHERE (sqlc.narg(is_system)::bool IS NULL OR r.is_system = sqlc.narg(is_system))
  AND (sqlc.narg(is_active)::bool IS NULL OR r.is_active = sqlc.narg(is_active))
  AND (sqlc.narg(q)::text IS NULL
       OR r.code ILIKE '%' || sqlc.narg(q) || '%' OR r.name ILIKE '%' || sqlc.narg(q) || '%'
       OR r.description ILIKE '%' || sqlc.narg(q) || '%');

-- name: GetRole :one
SELECT r.id, r.code, r.name, r.description, r.is_system, r.is_active, r.created_at, r.updated_at,
  (SELECT count(*) FROM accounts_user u
     WHERE u.assigned_role_id = r.id OR (u.assigned_role_id IS NULL AND u.role = r.code))::int AS user_count,
  (SELECT count(DISTINCT rp.permission_id) FROM accounts_role_permissions rp WHERE rp.role_id = r.id)::int AS permission_count
FROM accounts_role r WHERE r.id = $1;

-- name: RolePermissions :many
SELECT p.id, p.code, p.name, p.module, p.description
FROM accounts_role_permissions rp JOIN accounts_permission p ON p.id = rp.permission_id
WHERE rp.role_id = $1 ORDER BY p.module, p.code;

-- name: RoleStatsTotals :one
SELECT count(*)::int AS all_roles,
  count(*) FILTER (WHERE is_system)::int AS system,
  count(*) FILTER (WHERE NOT is_system)::int AS custom,
  (SELECT count(*) FROM accounts_user WHERE is_staff)::int AS users_assigned
FROM accounts_role;

-- name: RoleCodeExists :one
SELECT EXISTS (SELECT 1 FROM accounts_role WHERE code = $1);

-- name: ExistingPermissionIDs :many
SELECT id FROM accounts_permission WHERE id = ANY(sqlc.arg(ids)::uuid[]);

-- name: InsertRole :exec
INSERT INTO accounts_role (id, created_at, updated_at, code, name, description, is_system, is_active)
VALUES ($1, clock_timestamp(), clock_timestamp(), $2, $3, $4, false, true);

-- name: UpdateRole :exec
UPDATE accounts_role SET name = $2, description = $3, is_active = $4, updated_at = now()
WHERE id = $1;

-- name: ClearRolePermissions :exec
DELETE FROM accounts_role_permissions WHERE role_id = $1;

-- name: AddRolePermissions :exec
INSERT INTO accounts_role_permissions (role_id, permission_id)
SELECT $1, unnest(sqlc.arg(ids)::uuid[])
ON CONFLICT DO NOTHING;

-- name: RolePermissionIDs :many
SELECT permission_id FROM accounts_role_permissions WHERE role_id = $1 ORDER BY id;
