-- name: GetPrincipalUser :one
-- Live auth state for a token's user_id (role, flags, session version).
SELECT u.id, u.role, u.is_active, u.is_staff, u.is_superuser, u.session_version,
       r.code AS assigned_code, r.is_active AS assigned_active
FROM accounts_user u
LEFT JOIN accounts_role r ON r.id = u.assigned_role_id
WHERE u.id = $1;

-- name: RolePermissionCodes :many
SELECT p.code
FROM accounts_role_permissions rp
JOIN accounts_permission p ON p.id = rp.permission_id
WHERE rp.role_id = (SELECT assigned_role_id FROM accounts_user WHERE accounts_user.id = $1)
ORDER BY p.code;
