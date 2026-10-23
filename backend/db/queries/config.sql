-- Platform config (ConfigService, ConfigVersionViewSet).

-- name: ActiveConfig :one
SELECT * FROM core_configversion WHERE namespace = $1 AND key = $2 AND status = 'ACTIVE'
ORDER BY effective_from DESC, created_at DESC LIMIT 1;

-- name: PendingConfig :one
SELECT * FROM core_configversion WHERE namespace = $1 AND key = $2 AND status = 'PENDING'
ORDER BY created_at DESC LIMIT 1;

-- name: RejectPendingConfig :exec
UPDATE core_configversion SET status = 'REJECTED', updated_at = now()
WHERE namespace = $1 AND key = $2 AND status = 'PENDING';

-- name: InsertConfig :exec
INSERT INTO core_configversion (id, created_at, updated_at, namespace, key, value, status, created_by_id, note)
VALUES ($1, clock_timestamp(), clock_timestamp(), $2, $3, $4, 'PENDING', $5, $6);

-- name: ConfigVersionsPage :many
SELECT id FROM core_configversion
WHERE (sqlc.narg(namespace)::text IS NULL OR namespace = sqlc.narg(namespace))
  AND (sqlc.narg(key)::text IS NULL OR key = sqlc.narg(key))
  AND (sqlc.narg(status)::text IS NULL OR status = sqlc.narg(status))
ORDER BY created_at DESC LIMIT sqlc.arg(lim) OFFSET sqlc.arg(off);

-- name: CountConfigVersions :one
SELECT count(*) FROM core_configversion
WHERE (sqlc.narg(namespace)::text IS NULL OR namespace = sqlc.narg(namespace))
  AND (sqlc.narg(key)::text IS NULL OR key = sqlc.narg(key))
  AND (sqlc.narg(status)::text IS NULL OR status = sqlc.narg(status));

-- name: ConfigVersionRows :many
SELECT v.*, c.first_name AS c_first, c.last_name AS c_last, c.email AS c_email, c.phone AS c_phone,
  a.first_name AS a_first, a.last_name AS a_last, a.email AS a_email, a.phone AS a_phone
FROM core_configversion v
LEFT JOIN accounts_user c ON c.id = v.created_by_id
LEFT JOIN accounts_user a ON a.id = v.approved_by_id
WHERE v.id = ANY(sqlc.arg(ids)::uuid[]);

-- name: ConfigForUpdate :one
SELECT * FROM core_configversion WHERE id = $1 FOR UPDATE;

-- name: SupersedeConfig :exec
UPDATE core_configversion SET status = 'SUPERSEDED', updated_at = now()
WHERE namespace = $1 AND key = $2 AND status = 'ACTIVE' AND id <> $3;

-- name: ActivateConfig :exec
UPDATE core_configversion SET status = 'ACTIVE', approved_by_id = $2, effective_from = $3, updated_at = now()
WHERE id = $1;
