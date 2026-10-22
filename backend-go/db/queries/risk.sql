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
