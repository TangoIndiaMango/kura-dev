-- name: LockAuditChain :exec
-- Same key as Django audit/services.py so both backends serialise appends.
SELECT pg_advisory_xact_lock(874210019);

-- name: AuditChainTip :one
SELECT row_hash FROM audit_auditevent ORDER BY created_at DESC, id DESC LIMIT 1;

-- name: InsertAuditEvent :exec
INSERT INTO audit_auditevent (
    id, created_at, updated_at, actor_id, actor_email, actor_role, action,
    subject_type, subject_id, subject_label, before, after, metadata,
    ip_address, request_id, prev_hash, row_hash
) VALUES (
    sqlc.arg(id), sqlc.arg(created_at)::timestamptz, sqlc.arg(created_at)::timestamptz,
    sqlc.arg(actor_id), sqlc.arg(actor_email), sqlc.arg(actor_role), sqlc.arg(action),
    sqlc.arg(subject_type), sqlc.arg(subject_id), sqlc.arg(subject_label),
    sqlc.arg(before), sqlc.arg(after), sqlc.arg(metadata), sqlc.arg(ip_address),
    sqlc.arg(request_id), sqlc.arg(prev_hash), sqlc.arg(row_hash)
);

-- name: AuditPage :many
-- AuditEventViewSet: subject-type ACL, AuditEventFilter, keyset newest first.
SELECT a.id FROM audit_auditevent a
WHERE (sqlc.arg(unrestricted)::bool OR lower(a.subject_type) = ANY(sqlc.arg(allowed)::text[]))
  AND (sqlc.narg(q)::text IS NULL OR a.action ILIKE '%' || sqlc.narg(q) || '%' OR a.actor_email ILIKE '%' || sqlc.narg(q) || '%'
       OR a.subject_label ILIKE '%' || sqlc.narg(q) || '%' OR a.subject_id ILIKE '%' || sqlc.narg(q) || '%'
       OR a.subject_type ILIKE '%' || sqlc.narg(q) || '%')
  AND (sqlc.narg(search)::text IS NULL OR a.action ILIKE '%' || sqlc.narg(search) || '%'
       OR a.actor_email ILIKE '%' || sqlc.narg(search) || '%' OR a.subject_label ILIKE '%' || sqlc.narg(search) || '%'
       OR a.subject_id ILIKE '%' || sqlc.narg(search) || '%' OR a.subject_type ILIKE '%' || sqlc.narg(search) || '%')
  AND (sqlc.narg(action)::text IS NULL OR a.action ILIKE '%' || sqlc.narg(action) || '%')
  AND (sqlc.narg(subject_type)::text IS NULL OR a.subject_type = sqlc.narg(subject_type))
  AND (sqlc.narg(subject_ids)::text[] IS NULL OR a.subject_id = ANY(sqlc.narg(subject_ids)::text[]))
  AND (sqlc.narg(actor)::text IS NULL OR a.actor_email ILIKE '%' || sqlc.narg(actor) || '%')
  AND (sqlc.narg(from_at)::timestamptz IS NULL OR a.created_at >= sqlc.narg(from_at))
  AND (sqlc.narg(to_at)::timestamptz IS NULL OR a.created_at <= sqlc.narg(to_at))
  AND (sqlc.narg(after_at)::timestamptz IS NULL
       OR (sqlc.arg(back)::bool AND (a.created_at, a.id) > (sqlc.narg(after_at), sqlc.arg(after_id)::uuid))
       OR (NOT sqlc.arg(back)::bool AND (a.created_at, a.id) < (sqlc.narg(after_at), sqlc.arg(after_id)::uuid)))
ORDER BY CASE WHEN sqlc.arg(back)::bool THEN a.created_at END, CASE WHEN sqlc.arg(back)::bool THEN a.id END,
  a.created_at DESC, a.id DESC
LIMIT sqlc.arg(lim);

-- name: AuditRows :many
SELECT a.*, u.first_name AS actor_first, u.last_name AS actor_last FROM audit_auditevent a
LEFT JOIN accounts_user u ON u.id = a.actor_id
WHERE a.id = ANY(sqlc.arg(ids)::uuid[]);

-- name: AuditStats :one
SELECT count(*)::int AS all_rows, count(*) FILTER (WHERE created_at >= now() - interval '24 hours')::int AS last_24h
FROM audit_auditevent
WHERE sqlc.arg(unrestricted)::bool OR lower(subject_type) = ANY(sqlc.arg(allowed)::text[]);
