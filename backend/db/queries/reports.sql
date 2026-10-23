-- ReportJob lifecycle + CSV sources (analytics.services.reports / report_csvs).

-- name: ReportByID :one
SELECT * FROM analytics_reportjob WHERE id = $1;

-- name: ReportForUpdate :one
SELECT * FROM analytics_reportjob WHERE id = $1 FOR UPDATE;

-- name: ReportByKey :one
SELECT * FROM analytics_reportjob WHERE idempotency_key = $1 AND requested_by_id = $2 ORDER BY created_at DESC LIMIT 1;

-- name: InsertReport :exec
INSERT INTO analytics_reportjob (id, created_at, updated_at, kind, params, status, file_public_id, expires_at, raw,
  requested_by_id, idempotency_key)
VALUES ($1, clock_timestamp(), clock_timestamp(), $2, $3, 'QUEUED', '', $4, '{}', $5, $6);

-- name: SaveReport :exec
UPDATE analytics_reportjob SET status = $2, file_public_id = $3, expires_at = $4, raw = $5, updated_at = now()
WHERE id = $1;

-- name: OpsCsvRows :many
SELECT m.date, m.hub_id, h.code, h.name, m.swaps, m.revenue_kobo_by_channel, m.batteries_ready_avg::text AS ready_avg,
  m.no_shows, m.overrides
FROM analytics_dailyhubmetric m JOIN mobility_hub h ON h.id = m.hub_id
WHERE m.date >= sqlc.arg(from_day) AND m.date <= sqlc.arg(to_day)
  AND (sqlc.narg(hub)::uuid IS NULL OR m.hub_id = sqlc.narg(hub))
ORDER BY m.date, h.code;

-- name: FleetCsvRows :many
SELECT b.id, b.serial, t.name AS type_name, b.status, b.charge_pct, b.health_pct, b.cycle_count,
  h.code AS hub_code, h.name AS hub_name, b.created_at
FROM mobility_battery b
JOIN mobility_batterytype t ON t.id = b.battery_type_id
LEFT JOIN mobility_hub h ON h.id = b.current_hub_id
WHERE (sqlc.narg(status)::text IS NULL OR b.status = sqlc.narg(status))
  AND (sqlc.narg(hub)::uuid IS NULL OR b.current_hub_id = sqlc.narg(hub))
ORDER BY b.serial;

-- name: RevenueCsvRows :many
SELECT t.posted_at, t.kind, t.reference,
  COALESCE(sum(e.credit_kobo) FILTER (WHERE a.code LIKE 'revenue:%'), 0)::bigint AS net,
  COALESCE(sum(e.credit_kobo) FILTER (WHERE a.code = 'vat_payable'), 0)::bigint AS vat
FROM finance_ledgertransaction t
LEFT JOIN finance_ledgerentry e ON e.transaction_id = t.id
LEFT JOIN finance_ledgeraccount a ON a.id = e.ledger_account_id
WHERE t.kind IN ('SWAP_FEE', 'PLAN_FEE', 'LOAN_REPAY') AND t.posted_at >= sqlc.arg(from_at) AND t.posted_at <= sqlc.arg(to_at)
GROUP BY t.id ORDER BY t.posted_at;
