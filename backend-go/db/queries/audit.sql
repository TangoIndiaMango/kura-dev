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
