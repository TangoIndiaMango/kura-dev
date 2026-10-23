-- Support cases (SupportCaseViewSet / SupportCaseService).

-- name: CasesPage :many
-- cases_for scope + SupportCaseFilter + ?q= (code, subject, account name / kura id); keyset newest first.
SELECT c.id FROM support_supportcase c
JOIN accounts_account a ON a.id = c.account_id
WHERE (sqlc.arg(all_rows)::bool OR c.account_id = ANY(sqlc.arg(own)::uuid[]))
  AND (sqlc.narg(account)::uuid IS NULL OR c.account_id = sqlc.narg(account))
  AND (sqlc.narg(status)::text IS NULL OR c.status = sqlc.narg(status))
  AND (sqlc.narg(kind)::text IS NULL OR c.kind = sqlc.narg(kind))
  AND (sqlc.narg(priority)::text IS NULL OR c.priority = sqlc.narg(priority))
  AND (sqlc.narg(from_at)::timestamptz IS NULL OR c.created_at >= sqlc.narg(from_at))
  AND (sqlc.narg(to_at)::timestamptz IS NULL OR c.created_at < sqlc.narg(to_at))
  AND (sqlc.narg(unassigned)::bool IS NULL OR (c.assigned_to_id IS NULL) = sqlc.narg(unassigned))
  AND (sqlc.narg(sla)::text IS NULL OR sqlc.narg(sla) NOT IN ('breached', 'at_risk')
       OR (sqlc.narg(sla) = 'breached' AND c.status IN ('OPEN', 'PENDING') AND c.sla_due_at IS NOT NULL AND c.sla_due_at < now())
       OR (sqlc.narg(sla) = 'at_risk' AND c.status IN ('OPEN', 'PENDING') AND c.sla_due_at IS NOT NULL
           AND c.sla_due_at > now() AND c.sla_due_at <= now() + interval '2 hours'))
  AND (sqlc.narg(q)::text IS NULL OR c.code ILIKE '%' || sqlc.narg(q) || '%' OR c.subject ILIKE '%' || sqlc.narg(q) || '%'
       OR a.display_name ILIKE '%' || sqlc.narg(q) || '%' OR a.kura_id ILIKE '%' || sqlc.narg(q) || '%')
  AND (sqlc.narg(after_at)::timestamptz IS NULL
       OR (sqlc.arg(back)::bool AND (c.created_at, c.id) > (sqlc.narg(after_at), sqlc.arg(after_id)::uuid))
       OR (NOT sqlc.arg(back)::bool AND (c.created_at, c.id) < (sqlc.narg(after_at), sqlc.arg(after_id)::uuid)))
ORDER BY CASE WHEN sqlc.arg(back)::bool THEN c.created_at END, CASE WHEN sqlc.arg(back)::bool THEN c.id END,
  c.created_at DESC, c.id DESC
LIMIT sqlc.arg(lim);

-- name: CaseRows :many
SELECT c.*, a.kura_id AS account_kura_id, a.display_name AS account_display_name, a.owner_user_id,
  u.first_name AS assignee_first, u.last_name AS assignee_last, u.email AS assignee_email, u.phone AS assignee_phone,
  p.receipt_code AS payment_receipt_code, p.amount_kobo AS payment_amount_kobo
FROM support_supportcase c
JOIN accounts_account a ON a.id = c.account_id
LEFT JOIN accounts_user u ON u.id = c.assigned_to_id
LEFT JOIN finance_payment p ON p.id = c.payment_id
WHERE c.id = ANY(sqlc.arg(ids)::uuid[]);

-- name: CaseEventRows :many
-- CaseEvent.Meta.ordering = created_at.
SELECT e.*, u.first_name AS actor_first, u.last_name AS actor_last, u.email AS actor_email, u.phone AS actor_phone,
  m.provider, m.storage_key, m.resource_type, m.visibility, m.original_filename, m.content_type
FROM support_caseevent e
LEFT JOIN accounts_user u ON u.id = e.actor_id
LEFT JOIN core_mediaasset m ON m.id = e.attachment_id
WHERE e.case_id = $1
ORDER BY e.created_at;

-- name: CaseForUpdate :one
SELECT * FROM support_supportcase WHERE id = $1 FOR UPDATE;

-- name: InsertCase :exec
INSERT INTO support_supportcase (id, created_at, updated_at, code, kind, priority, status, subject, sla_due_at,
  account_id, assigned_to_id, driver_id, opened_by_id, payment_id)
VALUES ($1, clock_timestamp(), clock_timestamp(), $2, $3, $4, 'OPEN', $5, $6, $7, NULL, $8, $9, $10);

-- name: CaseCodeTaken :one
SELECT EXISTS (SELECT 1 FROM support_supportcase WHERE code = $1);

-- name: InsertCaseEvent :exec
INSERT INTO support_caseevent (id, created_at, updated_at, kind, body, actor_id, case_id, attachment_id)
VALUES ($1, clock_timestamp(), clock_timestamp(), $2, $3, $4, $5, $6);

-- name: SaveCaseStatus :exec
UPDATE support_supportcase SET status = $2, updated_at = now() WHERE id = $1;

-- name: SaveCaseAssignee :exec
UPDATE support_supportcase SET assigned_to_id = $2, status = $3, updated_at = now() WHERE id = $1;

-- name: ActiveUser :one
SELECT id, is_active, email, phone FROM accounts_user WHERE id = $1;

-- name: MediaAssetFull :one
SELECT * FROM core_mediaasset WHERE id = $1;

-- name: CaseQueueStats :one
SELECT count(*) FILTER (WHERE status = 'OPEN')::int AS open,
  count(*) FILTER (WHERE status = 'PENDING')::int AS pending,
  count(*) FILTER (WHERE status IN ('OPEN', 'PENDING') AND assigned_to_id IS NULL)::int AS unassigned,
  count(*) FILTER (WHERE status IN ('OPEN', 'PENDING') AND priority IN ('HIGH', 'URGENT'))::int AS high_priority,
  count(*) FILTER (WHERE status IN ('OPEN', 'PENDING') AND sla_due_at IS NOT NULL AND sla_due_at > now()
                   AND sla_due_at <= now() + interval '2 hours')::int AS sla_at_risk,
  count(*) FILTER (WHERE status IN ('OPEN', 'PENDING') AND sla_due_at IS NOT NULL AND sla_due_at < now())::int AS sla_breached,
  count(*) FILTER (WHERE status IN ('OPEN', 'PENDING') AND kind = 'PAYMENT_DISPUTE')::int AS disputes,
  count(*) FILTER (WHERE status IN ('OPEN', 'PENDING'))::int AS active,
  count(*) FILTER (WHERE status IN ('RESOLVED', 'CLOSED'))::int AS closed
FROM support_supportcase;

-- name: CasePeriodStats :one
SELECT count(*)::int AS opened, count(*) FILTER (WHERE status IN ('RESOLVED', 'CLOSED'))::int AS resolved
FROM support_supportcase
WHERE (sqlc.narg(from_at)::timestamptz IS NULL OR created_at >= sqlc.narg(from_at))
  AND (sqlc.narg(to_at)::timestamptz IS NULL OR created_at <= sqlc.narg(to_at));

-- name: CasePeriodByKind :many
SELECT kind, count(*)::int AS count FROM support_supportcase
WHERE (sqlc.narg(from_at)::timestamptz IS NULL OR created_at >= sqlc.narg(from_at))
  AND (sqlc.narg(to_at)::timestamptz IS NULL OR created_at <= sqlc.narg(to_at))
GROUP BY kind ORDER BY count DESC;
