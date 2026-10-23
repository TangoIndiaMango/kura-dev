-- Alerts, alert rules, overrides, inventory counts, command centre.

-- name: AlertsPage :many
SELECT al.id FROM operations_alert al
LEFT JOIN mobility_hub h ON h.id = al.hub_id
WHERE (sqlc.arg(all_hubs)::bool OR al.hub_id = ANY(sqlc.arg(hubs)::uuid[]))
  AND (sqlc.narg(status)::text IS NULL OR al.status = sqlc.narg(status))
  AND (sqlc.narg(severity)::text IS NULL OR al.severity = sqlc.narg(severity))
  AND (sqlc.narg(kind)::text IS NULL OR al.kind = sqlc.narg(kind))
  AND (sqlc.narg(hub)::uuid IS NULL OR al.hub_id = sqlc.narg(hub))
  AND (sqlc.narg(is_resolved)::bool IS NULL OR al.is_resolved = sqlc.narg(is_resolved))
  AND (sqlc.narg(from_at)::timestamptz IS NULL OR al.created_at >= sqlc.narg(from_at))
  AND (sqlc.narg(to_at)::timestamptz IS NULL OR al.created_at < sqlc.narg(to_at))
  AND (sqlc.narg(q)::text IS NULL OR al.message ILIKE '%' || sqlc.narg(q) || '%' OR al.kind ILIKE '%' || sqlc.narg(q) || '%'
       OR h.code ILIKE '%' || sqlc.narg(q) || '%' OR h.name ILIKE '%' || sqlc.narg(q) || '%')
  AND (sqlc.narg(after_at)::timestamptz IS NULL
       OR (sqlc.arg(back)::bool AND (al.created_at, al.id) > (sqlc.narg(after_at), sqlc.arg(after_id)::uuid))
       OR (NOT sqlc.arg(back)::bool AND (al.created_at, al.id) < (sqlc.narg(after_at), sqlc.arg(after_id)::uuid)))
ORDER BY CASE WHEN sqlc.arg(back)::bool THEN al.created_at END, CASE WHEN sqlc.arg(back)::bool THEN al.id END,
  al.created_at DESC, al.id DESC
LIMIT sqlc.arg(lim);

-- name: AlertRows :many
SELECT al.*, h.code AS hub_code, h.name AS hub_name FROM operations_alert al
LEFT JOIN mobility_hub h ON h.id = al.hub_id
WHERE al.id = ANY(sqlc.arg(ids)::uuid[]);

-- name: AlertForUpdate :one
SELECT * FROM operations_alert WHERE id = $1 FOR UPDATE;

-- name: SaveAlert :exec
UPDATE operations_alert SET status = $2, severity = $3, is_resolved = $4, acknowledged_at = $5, acknowledged_by_id = $6,
  resolved_at = $7, resolved_by_id = $8, resolve_note = $9, updated_at = now() WHERE id = $1;

-- name: InsertAlert :exec
INSERT INTO operations_alert (id, created_at, updated_at, kind, severity, message, is_resolved, hub_id, delivery_channel,
  resolve_note, status)
VALUES ($1, clock_timestamp(), clock_timestamp(), $2, $3, $4, false, $5, $6, '', 'OPEN');

-- name: OpenAlertWithPrefix :one
-- _open_alert dedupe: same hub + kind, still live, message starting with the prefix.
SELECT * FROM operations_alert
WHERE hub_id IS NOT DISTINCT FROM sqlc.narg(hub)::uuid AND kind = sqlc.arg(kind)
  AND status IN ('OPEN', 'ACKNOWLEDGED', 'ESCALATED') AND starts_with(message, sqlc.arg(prefix)::text)
ORDER BY created_at DESC LIMIT 1;

-- name: OpenCashLimitAlertExists :one
SELECT EXISTS (SELECT 1 FROM operations_alert WHERE kind = 'CASH_LIMIT' AND status = 'OPEN'
  AND starts_with(message, sqlc.arg(prefix)::text));

-- name: AlertQueueStats :one
SELECT count(*) FILTER (WHERE status = 'OPEN')::int AS open,
  count(*) FILTER (WHERE status = 'ACKNOWLEDGED')::int AS acknowledged,
  count(*) FILTER (WHERE status = 'ESCALATED')::int AS escalated,
  count(*) FILTER (WHERE status = 'OPEN' AND severity = 'CRITICAL')::int AS critical_open,
  count(*) FILTER (WHERE status IN ('OPEN', 'ACKNOWLEDGED', 'ESCALATED'))::int AS active,
  count(*) FILTER (WHERE status = 'RESOLVED')::int AS resolved
FROM operations_alert WHERE sqlc.arg(all_hubs)::bool OR hub_id = ANY(sqlc.arg(hubs)::uuid[]);

-- name: AlertPeriodStats :one
SELECT count(*)::int AS opened, count(*) FILTER (WHERE status = 'RESOLVED')::int AS resolved
FROM operations_alert
WHERE (sqlc.arg(all_hubs)::bool OR hub_id = ANY(sqlc.arg(hubs)::uuid[]))
  AND (sqlc.narg(from_at)::timestamptz IS NULL OR created_at >= sqlc.narg(from_at))
  AND (sqlc.narg(to_at)::timestamptz IS NULL OR created_at <= sqlc.narg(to_at));

-- name: AlertPeriodBySeverity :many
SELECT severity, count(*)::int AS count FROM operations_alert
WHERE (sqlc.arg(all_hubs)::bool OR hub_id = ANY(sqlc.arg(hubs)::uuid[]))
  AND (sqlc.narg(from_at)::timestamptz IS NULL OR created_at >= sqlc.narg(from_at))
  AND (sqlc.narg(to_at)::timestamptz IS NULL OR created_at <= sqlc.narg(to_at))
GROUP BY severity ORDER BY count DESC;

-- name: AlertPeriodByDay :many
-- TruncDate in TIME_ZONE (Africa/Lagos).
SELECT (created_at AT TIME ZONE 'Africa/Lagos')::date AS day, count(*)::int AS count FROM operations_alert
WHERE (sqlc.arg(all_hubs)::bool OR hub_id = ANY(sqlc.arg(hubs)::uuid[]))
  AND (sqlc.narg(from_at)::timestamptz IS NULL OR created_at >= sqlc.narg(from_at))
  AND (sqlc.narg(to_at)::timestamptz IS NULL OR created_at <= sqlc.narg(to_at))
GROUP BY day ORDER BY day;

-- name: ListAlertRules :many
SELECT * FROM operations_alertrule ORDER BY created_at DESC LIMIT sqlc.arg(lim) OFFSET sqlc.arg(off);

-- name: CountAlertRules :one
SELECT count(*) FROM operations_alertrule;

-- name: AlertRuleByID :one
SELECT * FROM operations_alertrule WHERE id = $1;

-- name: InsertAlertRule :exec
INSERT INTO operations_alertrule (id, created_at, updated_at, name, kind, severity, threshold, channels, cooldown_minutes,
  status, created_by_id)
VALUES ($1, clock_timestamp(), clock_timestamp(), $2, $3, $4, $5, $6, $7, $8, $9);

-- name: SaveAlertRule :exec
UPDATE operations_alertrule SET name = $2, kind = $3, severity = $4, threshold = $5, channels = $6, cooldown_minutes = $7,
  status = $8, updated_at = now() WHERE id = $1;

-- name: ListOverrides :many
SELECT o.*, u.email AS agent_email FROM operations_override o JOIN accounts_user u ON u.id = o.agent_id
WHERE sqlc.narg(agent)::uuid IS NULL OR o.agent_id = sqlc.narg(agent)
ORDER BY o.created_at DESC LIMIT sqlc.arg(lim) OFFSET sqlc.arg(off);

-- name: CountOverrides :one
SELECT count(*) FROM operations_override WHERE sqlc.narg(agent)::uuid IS NULL OR agent_id = sqlc.narg(agent);

-- name: OverrideByID :one
SELECT o.*, u.email AS agent_email FROM operations_override o JOIN accounts_user u ON u.id = o.agent_id WHERE o.id = $1;

-- name: InsertOverride :exec
INSERT INTO operations_override (id, created_at, updated_at, reason, note, agent_id, swap_id)
VALUES ($1, clock_timestamp(), clock_timestamp(), $2, $3, $4, $5);

-- name: AgentOverridesSince :one
SELECT count(*)::int FROM operations_override WHERE agent_id = $1 AND created_at >= $2;

-- name: TouchOverride :exec
UPDATE operations_override SET updated_at = now() WHERE id = $1;

-- name: ListInventoryCounts :many
SELECT c.*, h.code AS hub_code FROM operations_inventorycount c JOIN mobility_hub h ON h.id = c.hub_id
WHERE sqlc.narg(hub)::uuid IS NULL OR c.hub_id = sqlc.narg(hub)
ORDER BY c.created_at DESC LIMIT sqlc.arg(lim) OFFSET sqlc.arg(off);

-- name: CountInventoryCounts :one
SELECT count(*) FROM operations_inventorycount WHERE sqlc.narg(hub)::uuid IS NULL OR hub_id = sqlc.narg(hub);

-- name: InventoryCountByID :one
SELECT c.*, h.code AS hub_code FROM operations_inventorycount c JOIN mobility_hub h ON h.id = c.hub_id WHERE c.id = $1;

-- name: InsertInventoryCount :exec
INSERT INTO operations_inventorycount (id, created_at, updated_at, counted, expected, variance, note, hub_id, shift_id,
  signed_by_id)
VALUES ($1, clock_timestamp(), clock_timestamp(), $2, $3, $4, $5, $6, $7, $8);

-- name: HubSlotStates :many
SELECT b.serial, s.state FROM mobility_hubslot s JOIN mobility_battery b ON b.id = s.battery_id WHERE s.hub_id = $1;

-- name: CommandCentreHubs :many
SELECT h.id, h.code, h.name, h.status, h.last_sync_at, h.solar_capacity_kw::text AS solar_capacity_kw,
  (SELECT count(*) FROM mobility_battery b WHERE b.current_hub_id = h.id AND b.status = 'AVAILABLE' AND b.charge_pct >= 90)::int AS ready,
  (SELECT count(*) FROM mobility_battery b WHERE b.current_hub_id = h.id AND b.status = 'CHARGING')::int AS charging,
  (SELECT count(*) FROM mobility_battery b WHERE b.current_hub_id = h.id AND b.status = 'ISSUED')::int AS issued,
  (SELECT count(*) FROM operations_alert a WHERE a.hub_id = h.id AND a.status IN ('OPEN', 'ACKNOWLEDGED'))::int AS open_alerts,
  EXISTS (SELECT 1 FROM operations_alert a WHERE a.hub_id = h.id AND a.kind = 'SOLAR_FAULT'
          AND a.status IN ('OPEN', 'ACKNOWLEDGED')) AS solar_fault
FROM mobility_hub h ORDER BY h.code LIMIT 50;

-- name: CommandCentreKPIs :one
SELECT
  (SELECT count(*) FROM mobility_swap WHERE status = 'COMPLETED' AND completed_at >= sqlc.arg(day_start) AND completed_at < sqlc.arg(day_end))::int AS today_swaps,
  (SELECT COALESCE(sum(amount_kobo), 0) FROM finance_payment WHERE created_at >= sqlc.arg(day_start) AND created_at < sqlc.arg(day_end)
     AND status = 'SUCCESS' AND purpose IN ('SWAP', 'PLAN'))::bigint AS today_revenue_kobo,
  (SELECT count(*) FROM operations_alert WHERE status IN ('OPEN', 'ACKNOWLEDGED', 'ESCALATED'))::int AS active_alerts,
  (SELECT COALESCE(sum(amount_kobo), 0) FROM operations_cashdeposit WHERE created_at >= sqlc.arg(day_start)
     AND status = 'SUCCESS')::bigint AS today_cash_kobo;

-- name: HourlyCompletedSwaps :many
SELECT extract(hour FROM completed_at AT TIME ZONE 'Africa/Lagos')::int AS h, count(*)::int AS n FROM mobility_swap
WHERE status = 'COMPLETED' AND completed_at >= sqlc.arg(day_start) AND completed_at < sqlc.arg(day_end)
GROUP BY h;

-- name: ActivitySwaps :many
SELECT s.id, s.created_at, h.code AS hub_code, v.registration_plate FROM mobility_swap s
JOIN mobility_hub h ON h.id = s.hub_id JOIN mobility_vehicle v ON v.id = s.vehicle_id
ORDER BY s.created_at DESC LIMIT $1;

-- name: ActivityAlerts :many
SELECT a.id, a.created_at, a.kind, a.message, h.code AS hub_code FROM operations_alert a
LEFT JOIN mobility_hub h ON h.id = a.hub_id
WHERE a.status IN ('OPEN', 'ACKNOWLEDGED') ORDER BY a.created_at DESC LIMIT $1;

-- name: SwapHub :one
SELECT hub_id FROM mobility_swap WHERE id = $1;
