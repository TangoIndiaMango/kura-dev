-- Analytics: dashboard tiles, hub demand, revenue, impact, stories, cooperatives.

-- name: DashboardCounts :one
SELECT (SELECT count(*) FROM mobility_hub h1)::int AS hubs,
  (SELECT count(*) FROM mobility_hub h2 WHERE h2.status = 'ONLINE')::int AS hubs_online,
  (SELECT count(*) FROM mobility_battery b1)::int AS batteries,
  (SELECT count(*) FROM mobility_battery b2 WHERE b2.status = 'AVAILABLE' AND b2.charge_pct >= 90)::int AS ready,
  (SELECT count(*) FROM mobility_battery b3 WHERE b3.status = 'CHARGING')::int AS charging,
  (SELECT count(*) FROM mobility_battery b4 WHERE b4.status = 'ISSUED')::int AS issued,
  (SELECT count(*) FROM mobility_swap s1)::int AS swaps,
  (SELECT count(*) FROM mobility_swap s2 WHERE s2.status = 'COMPLETED' AND s2.completed_at >= sqlc.arg(since)::timestamptz)::int AS swaps_today,
  (SELECT count(*) FROM mobility_swap s3 WHERE s3.created_at >= sqlc.arg(since)::timestamptz AND s3.mismatch_flag)::int AS mismatches_today,
  (SELECT COALESCE(sum(p.amount_kobo), 0) FROM finance_payment p WHERE p.created_at >= sqlc.arg(since)::timestamptz
     AND p.status = 'SUCCESS' AND p.purpose IN ('SWAP', 'PLAN'))::bigint AS revenue_today,
  (SELECT count(*) FROM operations_alert al WHERE NOT al.is_resolved)::int AS alerts,
  (SELECT count(*) FROM mobility_vehicle v WHERE v.status = 'ACTIVE')::int AS vehicles;

-- name: SlotStateCounts :many
SELECT state, count(*)::int AS n FROM mobility_hubslot GROUP BY state;

-- name: DemandHubs :many
SELECT id, code, name FROM mobility_hub
WHERE sqlc.arg(all_rows)::bool OR id = ANY(sqlc.arg(hubs)::uuid[]) ORDER BY code;

-- name: DemandTotals :many
SELECT hub_id, count(*)::int AS n FROM mobility_swap
WHERE hub_id = ANY(sqlc.arg(hubs)::uuid[]) AND status = 'COMPLETED' AND completed_at >= sqlc.arg(since)
GROUP BY hub_id;

-- name: DemandPeakHours :many
-- ExtractHour runs in the current (Lagos) zone; first row per hub wins.
SELECT hub_id, EXTRACT(hour FROM completed_at AT TIME ZONE 'Africa/Lagos')::int AS hour, count(*)::int AS n
FROM mobility_swap
WHERE hub_id = ANY(sqlc.arg(hubs)::uuid[]) AND status = 'COMPLETED' AND completed_at >= sqlc.arg(since)
GROUP BY hub_id, 2 ORDER BY hub_id, n DESC, hour;

-- name: RevenueTotals :one
SELECT COALESCE(sum(amount_kobo) FILTER (WHERE status = 'SUCCESS'), 0)::bigint AS gross,
  COALESCE(sum(vat_kobo) FILTER (WHERE status = 'SUCCESS'), 0)::bigint AS vat,
  (count(*) FILTER (WHERE status = 'SUCCESS'))::int AS transactions,
  COALESCE(sum(amount_kobo) FILTER (WHERE status = 'PENDING'), 0)::bigint AS outstanding,
  (count(*) FILTER (WHERE status = 'PENDING'))::int AS outstanding_n
FROM finance_payment WHERE created_at >= sqlc.arg(from_at) AND created_at < sqlc.arg(to_at);

-- name: RevenueByChannel :many
SELECT channel AS k, sum(amount_kobo)::bigint AS amount, count(*)::int AS n FROM finance_payment
WHERE created_at >= sqlc.arg(from_at) AND created_at < sqlc.arg(to_at) AND status = 'SUCCESS'
GROUP BY channel ORDER BY 2 DESC, 1;

-- name: RevenueByPurpose :many
SELECT purpose AS k, sum(amount_kobo)::bigint AS amount, count(*)::int AS n FROM finance_payment
WHERE created_at >= sqlc.arg(from_at) AND created_at < sqlc.arg(to_at) AND status = 'SUCCESS'
GROUP BY purpose ORDER BY 2 DESC, 1;

-- name: RevenueDaily :many
SELECT (created_at AT TIME ZONE 'Africa/Lagos')::date AS day, sum(amount_kobo)::bigint AS amount, count(*)::int AS n
FROM finance_payment
WHERE created_at >= sqlc.arg(from_at) AND created_at < sqlc.arg(to_at) AND status = 'SUCCESS'
GROUP BY 1 ORDER BY 1;

-- name: SubscriptionStatusCounts :one
SELECT (count(*) FILTER (WHERE status = 'ACTIVE'))::int AS active,
  (count(*) FILTER (WHERE status = 'PENDING_PAYMENT'))::int AS pending,
  (count(*) FILTER (WHERE status = 'LAPSED_TO_PPS'))::int AS lapsed
FROM mobility_subscription;

-- name: ImpactMetric :one
SELECT period, operators_served, swaps, fuel_savings_kobo, engines_replaced, co2_kg::text AS co2_kg, inputs
FROM analytics_monthlyimpactmetric WHERE period = $1 ORDER BY period DESC LIMIT 1;

-- name: ImpactSeries :many
SELECT period, swaps, fuel_savings_kobo, co2_kg::float8 AS co2_kg FROM analytics_monthlyimpactmetric
ORDER BY period DESC LIMIT 6;

-- name: StoryPage :many
SELECT id FROM analytics_impactstory
WHERE (sqlc.narg(status)::text IS NULL OR status = sqlc.narg(status))
  AND (sqlc.narg(q)::text IS NULL OR title ILIKE '%' || sqlc.narg(q) || '%' OR region ILIKE '%' || sqlc.narg(q) || '%'
       OR partners ILIKE '%' || sqlc.narg(q) || '%')
ORDER BY CASE WHEN sqlc.arg(ord)::text = 'status' THEN status END, CASE WHEN sqlc.arg(ord) = '-status' THEN status END DESC,
  CASE WHEN sqlc.arg(ord) = 'published_at' THEN published_at END,
  CASE WHEN sqlc.arg(ord) = '-published_at' THEN published_at END DESC,
  CASE WHEN sqlc.arg(ord) = 'created_at' THEN created_at END, created_at DESC, id DESC
LIMIT sqlc.arg(lim) OFFSET sqlc.arg(off);

-- name: StoryCount :one
SELECT count(*) FROM analytics_impactstory
WHERE (sqlc.narg(status)::text IS NULL OR status = sqlc.narg(status))
  AND (sqlc.narg(q)::text IS NULL OR title ILIKE '%' || sqlc.narg(q) || '%' OR region ILIKE '%' || sqlc.narg(q) || '%'
       OR partners ILIKE '%' || sqlc.narg(q) || '%');

-- name: StoriesByIDs :many
SELECT * FROM analytics_impactstory WHERE id = ANY(sqlc.arg(ids)::uuid[]);

-- name: StoryForUpdate :one
SELECT * FROM analytics_impactstory WHERE id = $1 FOR UPDATE;

-- name: InsertStory :exec
INSERT INTO analytics_impactstory (id, created_at, updated_at, title, region, metric_highlight, partners, summary, status,
  published_at, raw, created_by_id)
VALUES ($1, clock_timestamp(), clock_timestamp(), $2, $3, $4, $5, $6, $7, NULL, $8, $9);

-- name: SaveStory :exec
UPDATE analytics_impactstory SET title = $2, region = $3, metric_highlight = $4, partners = $5, summary = $6,
  status = $7, published_at = $8, raw = $9, updated_at = now()
WHERE id = $1;

-- name: CooperativeByID :one
SELECT * FROM accounts_cooperative WHERE id = $1;

-- name: CooperativeForChairman :one
SELECT * FROM accounts_cooperative WHERE chairman_user_id = $1 ORDER BY name LIMIT 1;

-- name: FirstCooperative :one
SELECT * FROM accounts_cooperative ORDER BY name LIMIT 1;

-- name: CooperativeMembers :many
SELECT a.id, a.kura_id, a.display_name, a.status, u.phone FROM accounts_account a
LEFT JOIN accounts_user u ON u.id = a.owner_user_id
WHERE a.cooperative_id = $1 ORDER BY a.display_name;

-- name: CooperativeFleet :one
SELECT (SELECT count(*) FROM mobility_vehicle v WHERE v.account_id = ANY(sqlc.arg(ids)::uuid[]) AND v.status = 'ACTIVE')::int AS vehicles,
  (SELECT count(*) FROM mobility_battery b JOIN mobility_vehicle v ON v.current_battery_id = b.id
     WHERE b.status = 'ISSUED' AND v.account_id = ANY(sqlc.arg(ids)::uuid[]))::int AS unreturned,
  (SELECT count(*) FROM mobility_swap s WHERE s.account_id = ANY(sqlc.arg(ids)::uuid[]) AND s.status = 'COMPLETED')::bigint AS swaps;
