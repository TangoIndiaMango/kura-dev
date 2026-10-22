-- name: EnsureRiskRule :exec
-- RiskService.ensure_rules: get_or_create by code.
INSERT INTO risk_riskrule (id, created_at, updated_at, code, name, severity, params, action, enabled)
VALUES ($1, clock_timestamp(), clock_timestamp(), $2, $3, $4, $5, $6, true)
ON CONFLICT (code) DO NOTHING;

-- name: EnabledRiskRule :one
SELECT id, code, severity, action FROM risk_riskrule WHERE code = $1 AND enabled LIMIT 1;

-- name: InsertRiskEvent :exec
INSERT INTO risk_riskevent (id, created_at, updated_at, subject_type, subject_id, severity,
    score, context, action_taken, status, review_note, account_id, rule_id)
VALUES ($1, clock_timestamp(), clock_timestamp(), $2, $3, $4, $5, $6, $7, 'OPEN', '', $8, $9);

-- name: RiskReviewers :many
-- notify_risk_reviewers: active SUPER_ADMIN / OPS_MANAGER, max 25.
SELECT id FROM accounts_user
WHERE is_active AND role IN ('SUPER_ADMIN', 'OPS_MANAGER')
LIMIT 25;

-- name: ListRiskRules :many
SELECT * FROM risk_riskrule ORDER BY code LIMIT sqlc.arg(lim) OFFSET sqlc.arg(off);

-- name: CountRiskRules :one
SELECT count(*) FROM risk_riskrule;

-- name: RiskRuleByID :one
SELECT * FROM risk_riskrule WHERE id = $1;

-- name: RiskRuleByCode :one
SELECT * FROM risk_riskrule WHERE code = $1;

-- name: SaveRiskRule :exec
UPDATE risk_riskrule SET name = $2, severity = $3, action = $4, enabled = $5, params = $6, updated_at = now()
WHERE id = $1;

-- name: RiskEventsPage :many
-- RiskEventViewSet list: filters, ?q= over rule code/name, account name/kura id, subject id; keyset newest first.
SELECT e.id FROM risk_riskevent e
JOIN risk_riskrule r ON r.id = e.rule_id
LEFT JOIN accounts_account a ON a.id = e.account_id
WHERE (sqlc.narg(account)::uuid IS NULL OR e.account_id = sqlc.narg(account))
  AND (sqlc.narg(status)::text IS NULL OR e.status = sqlc.narg(status))
  AND (sqlc.narg(severity)::text IS NULL OR e.severity = sqlc.narg(severity))
  AND (sqlc.narg(rule)::text IS NULL OR r.code = sqlc.narg(rule))
  AND (sqlc.narg(subject_type)::text IS NULL OR e.subject_type = sqlc.narg(subject_type))
  AND (sqlc.narg(subject_id)::text IS NULL OR e.subject_id = sqlc.narg(subject_id))
  AND (sqlc.narg(from_at)::timestamptz IS NULL OR e.created_at >= sqlc.narg(from_at))
  AND (sqlc.narg(to_at)::timestamptz IS NULL OR e.created_at < sqlc.narg(to_at))
  AND (sqlc.narg(q)::text IS NULL OR r.code ILIKE '%' || sqlc.narg(q) || '%' OR r.name ILIKE '%' || sqlc.narg(q) || '%'
       OR a.display_name ILIKE '%' || sqlc.narg(q) || '%' OR a.kura_id ILIKE '%' || sqlc.narg(q) || '%'
       OR e.subject_id ILIKE '%' || sqlc.narg(q) || '%')
  AND (sqlc.narg(after_at)::timestamptz IS NULL
       OR (sqlc.arg(back)::bool AND (e.created_at, e.id) > (sqlc.narg(after_at), sqlc.arg(after_id)::uuid))
       OR (NOT sqlc.arg(back)::bool AND (e.created_at, e.id) < (sqlc.narg(after_at), sqlc.arg(after_id)::uuid)))
ORDER BY CASE WHEN sqlc.arg(back)::bool THEN e.created_at END, CASE WHEN sqlc.arg(back)::bool THEN e.id END,
  e.created_at DESC, e.id DESC
LIMIT sqlc.arg(lim);

-- name: RiskEventRows :many
SELECT e.*, r.code AS rule_code, r.name AS rule_name, a.kura_id AS account_kura_id,
  a.display_name AS account_display_name,
  u.first_name AS reviewer_first, u.last_name AS reviewer_last, u.email AS reviewer_email, u.phone AS reviewer_phone
FROM risk_riskevent e
JOIN risk_riskrule r ON r.id = e.rule_id
LEFT JOIN accounts_account a ON a.id = e.account_id
LEFT JOIN accounts_user u ON u.id = e.reviewed_by_id
WHERE e.id = ANY(sqlc.arg(ids)::uuid[]);

-- name: RiskEventForUpdate :one
SELECT e.*, r.code AS rule_code FROM risk_riskevent e JOIN risk_riskrule r ON r.id = e.rule_id
WHERE e.id = $1 FOR UPDATE OF e;

-- name: SaveRiskEventReview :exec
UPDATE risk_riskevent SET status = $2, reviewed_by_id = $3, review_note = $4, updated_at = now() WHERE id = $1;

-- name: SaveRiskEventContext :exec
UPDATE risk_riskevent SET context = $2, updated_at = now() WHERE id = $1;

-- name: OpenVelocityEvent :one
SELECT e.* FROM risk_riskevent e JOIN risk_riskrule r ON r.id = e.rule_id
WHERE r.code = 'SWAP_VELOCITY' AND e.subject_type = 'vehicle' AND e.subject_id = $1 AND e.status = 'OPEN'
ORDER BY e.created_at DESC LIMIT 1;

-- name: ActiveGrantForEvent :one
SELECT * FROM risk_riskvelocitygrant
WHERE risk_event_id = $1 AND status = 'ACTIVE' AND expires_at > now() AND uses_remaining > 0
ORDER BY created_at DESC LIMIT 1;

-- name: ActiveGrantForVehicle :one
SELECT * FROM risk_riskvelocitygrant
WHERE vehicle_id = $1 AND status = 'ACTIVE' AND expires_at > now() AND uses_remaining > 0
ORDER BY expires_at LIMIT 1;

-- name: ConsumableGrantForUpdate :one
SELECT * FROM risk_riskvelocitygrant
WHERE vehicle_id = $1 AND status = 'ACTIVE' AND expires_at > now() AND uses_remaining > 0
ORDER BY expires_at LIMIT 1 FOR UPDATE;

-- name: SaveGrantUse :exec
UPDATE risk_riskvelocitygrant SET uses_remaining = $2, status = $3, updated_at = now() WHERE id = $1;

-- name: RevokeEventGrants :exec
UPDATE risk_riskvelocitygrant SET status = 'REVOKED', updated_at = now()
WHERE risk_event_id = $1 AND status = 'ACTIVE';

-- name: InsertVelocityGrant :exec
INSERT INTO risk_riskvelocitygrant (id, created_at, updated_at, vehicle_id, expires_at, max_uses, uses_remaining,
  status, note, account_id, granted_by_id, risk_event_id)
VALUES ($1, clock_timestamp(), clock_timestamp(), $2, $3, $4, $4, 'ACTIVE', $5, $6, $7, $8);

-- name: RiskQueueStats :one
SELECT count(*) FILTER (WHERE status = 'OPEN')::int AS open,
  count(*) FILTER (WHERE status = 'ESCALATED')::int AS escalated,
  count(*) FILTER (WHERE status = 'OPEN' AND severity IN ('HIGH', 'CRITICAL'))::int AS high_severity,
  count(*) FILTER (WHERE status = 'OPEN' AND severity = 'CRITICAL')::int AS critical,
  count(*) FILTER (WHERE status IN ('REVIEWED_OK', 'REVIEWED_FRAUD'))::int AS reviewed
FROM risk_riskevent;

-- name: RiskPeriodStats :one
SELECT count(*)::int AS opened,
  count(*) FILTER (WHERE status IN ('REVIEWED_OK', 'REVIEWED_FRAUD'))::int AS reviewed
FROM risk_riskevent
WHERE (sqlc.narg(from_at)::timestamptz IS NULL OR created_at >= sqlc.narg(from_at))
  AND (sqlc.narg(to_at)::timestamptz IS NULL OR created_at <= sqlc.narg(to_at));

-- name: RiskPeriodByRule :many
SELECT r.code AS rule, count(e.id)::int AS count FROM risk_riskevent e JOIN risk_riskrule r ON r.id = e.rule_id
WHERE (sqlc.narg(from_at)::timestamptz IS NULL OR e.created_at >= sqlc.narg(from_at))
  AND (sqlc.narg(to_at)::timestamptz IS NULL OR e.created_at <= sqlc.narg(to_at))
GROUP BY r.code ORDER BY count DESC;

-- name: RiskOpenBySeverity :many
SELECT severity, count(*)::int AS count FROM risk_riskevent WHERE status = 'OPEN'
GROUP BY severity ORDER BY count DESC;

-- name: VehicleSwapsToday :one
-- inspect_swap_velocity: completed in the WAT day + open swaps started (or created) that day.
SELECT
  (SELECT count(*) FROM mobility_swap s WHERE s.vehicle_id = sqlc.arg(vehicle_id) AND s.status = 'COMPLETED'
     AND s.completed_at >= sqlc.arg(day_start) AND s.completed_at < sqlc.arg(day_end))::int
  + (SELECT count(*) FROM mobility_swap s WHERE s.vehicle_id = sqlc.arg(vehicle_id)
     AND s.status IN ('STARTED', 'RETURN_RECORDED', 'ISSUED')
     AND ((s.started_at >= sqlc.arg(day_start) AND s.started_at < sqlc.arg(day_end))
          OR (s.started_at IS NULL AND s.created_at >= sqlc.arg(day_start) AND s.created_at < sqlc.arg(day_end))))::int;

-- name: LastCompletedSwapAt :one
SELECT completed_at FROM mobility_swap WHERE vehicle_id = $1 AND status = 'COMPLETED' AND completed_at IS NOT NULL
ORDER BY completed_at DESC LIMIT 1;
