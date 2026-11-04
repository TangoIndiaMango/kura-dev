-- Per-day report rollups. Each refresh replaces whole Lagos days
-- [from_day, to_day] so a payment that changed status since the last run
-- moves to its new row. Only the rollup tables are written; payments and
-- swaps are read under MVCC, so nothing on the hot path waits on this.

-- name: RollupTryLock :one
SELECT pg_try_advisory_xact_lock(hashtext('kura.rollup'));

-- name: RollupState :one
SELECT * FROM analytics_rollupstate WHERE name = $1;

-- name: SaveRollupState :exec
INSERT INTO analytics_rollupstate (name, last_run_at, backfilled_from) VALUES ($1, now(), $2)
ON CONFLICT (name) DO UPDATE SET last_run_at = now(), backfilled_from = EXCLUDED.backfilled_from;

-- name: FirstActivityDay :one
-- The oldest Lagos day with a payment or swap (both columns are indexed).
SELECT COALESCE(LEAST(
  (SELECT min(created_at) FROM finance_payment),
  (SELECT min(created_at) FROM mobility_swap)), now())::timestamptz AS first_at;

-- name: ClearDailyMoney :exec
DELETE FROM analytics_dailymoney WHERE day BETWEEN sqlc.arg(from_day)::date AND sqlc.arg(to_day)::date;

-- name: FillDailyMoney :execrows
-- A payment counts under the chairman of the vehicle it paid for (its swap
-- or plan), else of the paying account's chairman-linked vehicle.
INSERT INTO analytics_dailymoney (day, hub_id, cooperative_id, purpose, channel, status, payments, amount_kobo, vat_kobo)
SELECT (p.created_at AT TIME ZONE 'Africa/Lagos')::date, p.hub_id,
  COALESCE(sw.cooperative_id, su.cooperative_id, av.cooperative_id),
  p.purpose, p.channel, p.status, count(*), sum(p.amount_kobo), sum(p.vat_kobo)
FROM finance_payment p
LEFT JOIN LATERAL (SELECT v.cooperative_id FROM mobility_swap s JOIN mobility_vehicle v ON v.id = s.vehicle_id
  WHERE s.payment_id = p.id LIMIT 1) sw ON true
LEFT JOIN LATERAL (SELECT v.cooperative_id FROM mobility_subscription s JOIN mobility_vehicle v ON v.id = s.vehicle_id
  WHERE s.payment_id = p.id LIMIT 1) su ON true
LEFT JOIN LATERAL (SELECT v.cooperative_id FROM mobility_vehicle v
  WHERE v.account_id = p.account_id AND v.cooperative_id IS NOT NULL ORDER BY v.created_at, v.id LIMIT 1) av ON true
WHERE p.created_at >= (sqlc.arg(from_day)::date::timestamp AT TIME ZONE 'Africa/Lagos')
  AND p.created_at < ((sqlc.arg(to_day)::date + 1)::timestamp AT TIME ZONE 'Africa/Lagos')
GROUP BY 1, 2, 3, 4, 5, 6;

-- name: ClearDailySwaps :exec
DELETE FROM analytics_dailyswaps WHERE day BETWEEN sqlc.arg(from_day)::date AND sqlc.arg(to_day)::date;

-- name: FillDailySwaps :execrows
INSERT INTO analytics_dailyswaps (day, hub_id, cooperative_id, swaps, amount_kobo)
SELECT (s.created_at AT TIME ZONE 'Africa/Lagos')::date, s.hub_id, v.cooperative_id, count(*), sum(s.amount_kobo)
FROM mobility_swap s JOIN mobility_vehicle v ON v.id = s.vehicle_id
WHERE s.status = 'COMPLETED'
  AND s.created_at >= (sqlc.arg(from_day)::date::timestamp AT TIME ZONE 'Africa/Lagos')
  AND s.created_at < ((sqlc.arg(to_day)::date + 1)::timestamp AT TIME ZONE 'Africa/Lagos')
GROUP BY 1, 2, 3;

-- name: ClearDailyHubMetrics :exec
DELETE FROM analytics_dailyhubmetric WHERE inputs->>'source' = 'rollup'
  AND date BETWEEN sqlc.arg(from_day)::date AND sqlc.arg(to_day)::date;

-- name: FillDailyHubMetrics :execrows
-- DailyHubMetric (OPS_CSV): swaps, money by channel, expired reservations
-- and overrides per hub per day, from the rollups above plus two small counts.
WITH days AS (
  SELECT d::date AS day FROM generate_series(sqlc.arg(from_day)::date, sqlc.arg(to_day)::date, interval '1 day') d
), swaps AS (
  SELECT day, hub_id, sum(swaps)::int AS n FROM analytics_dailyswaps
  WHERE day BETWEEN sqlc.arg(from_day)::date AND sqlc.arg(to_day)::date GROUP BY 1, 2
), money AS (
  SELECT day, hub_id, jsonb_object_agg(channel, amount) AS by_channel FROM (
    SELECT day, hub_id, channel, sum(amount_kobo) AS amount FROM analytics_dailymoney
    WHERE status = 'SUCCESS' AND hub_id IS NOT NULL
      AND day BETWEEN sqlc.arg(from_day)::date AND sqlc.arg(to_day)::date GROUP BY 1, 2, 3) c
  GROUP BY 1, 2
), expired AS (
  SELECT (r.created_at AT TIME ZONE 'Africa/Lagos')::date AS day, r.hub_id, count(*)::int AS n
  FROM mobility_reservation r
  WHERE r.status = 'EXPIRED'
    AND r.created_at >= (sqlc.arg(from_day)::date::timestamp AT TIME ZONE 'Africa/Lagos')
    AND r.created_at < ((sqlc.arg(to_day)::date + 1)::timestamp AT TIME ZONE 'Africa/Lagos')
  GROUP BY 1, 2
), overrides AS (
  SELECT (o.created_at AT TIME ZONE 'Africa/Lagos')::date AS day, s.hub_id, count(*)::int AS n
  FROM operations_override o JOIN mobility_swap s ON s.id = o.swap_id
  WHERE o.created_at >= (sqlc.arg(from_day)::date::timestamp AT TIME ZONE 'Africa/Lagos')
    AND o.created_at < ((sqlc.arg(to_day)::date + 1)::timestamp AT TIME ZONE 'Africa/Lagos')
  GROUP BY 1, 2
), keys AS (
  SELECT day, hub_id FROM swaps UNION SELECT day, hub_id FROM money
  UNION SELECT day, hub_id FROM expired UNION SELECT day, hub_id FROM overrides
)
INSERT INTO analytics_dailyhubmetric (id, created_at, updated_at, date, swaps, revenue_kobo_by_channel,
  batteries_ready_avg, no_shows, overrides, inputs, hub_id)
SELECT gen_random_uuid(), now(), now(), k.day, COALESCE(sw.n, 0), COALESCE(m.by_channel, '{}'::jsonb), 0,
  COALESCE(e.n, 0), COALESCE(o.n, 0), '{"source": "rollup"}'::jsonb, k.hub_id
FROM keys k JOIN days USING (day)
LEFT JOIN swaps sw USING (day, hub_id) LEFT JOIN money m USING (day, hub_id)
LEFT JOIN expired e USING (day, hub_id) LEFT JOIN overrides o USING (day, hub_id)
ON CONFLICT (hub_id, date) DO UPDATE SET swaps = EXCLUDED.swaps,
  revenue_kobo_by_channel = EXCLUDED.revenue_kobo_by_channel, no_shows = EXCLUDED.no_shows,
  overrides = EXCLUDED.overrides, inputs = EXCLUDED.inputs, updated_at = now();

-- name: ClearDailyAccounts :exec
DELETE FROM analytics_dailyaccount WHERE day BETWEEN sqlc.arg(from_day)::date AND sqlc.arg(to_day)::date;

-- name: FillDailyAccounts :execrows
-- What each account spent (successful payments, wallet top-ups left out:
-- they are spent later) and its completed swaps, per day.
WITH pay AS (
  SELECT (created_at AT TIME ZONE 'Africa/Lagos')::date AS day, account_id, count(*)::int AS n, sum(amount_kobo)::bigint AS kobo
  FROM finance_payment
  WHERE status = 'SUCCESS' AND purpose NOT IN ('FUND', 'WALLET_TOPUP')
    AND created_at >= (sqlc.arg(from_day)::date::timestamp AT TIME ZONE 'Africa/Lagos')
    AND created_at < ((sqlc.arg(to_day)::date + 1)::timestamp AT TIME ZONE 'Africa/Lagos')
  GROUP BY 1, 2
), sw AS (
  SELECT (created_at AT TIME ZONE 'Africa/Lagos')::date AS day, account_id, count(*)::int AS n
  FROM mobility_swap
  WHERE status = 'COMPLETED'
    AND created_at >= (sqlc.arg(from_day)::date::timestamp AT TIME ZONE 'Africa/Lagos')
    AND created_at < ((sqlc.arg(to_day)::date + 1)::timestamp AT TIME ZONE 'Africa/Lagos')
  GROUP BY 1, 2
)
INSERT INTO analytics_dailyaccount (day, account_id, payments, paid_kobo, swaps)
SELECT COALESCE(pay.day, sw.day), COALESCE(pay.account_id, sw.account_id), COALESCE(pay.n, 0), COALESCE(pay.kobo, 0),
  COALESCE(sw.n, 0)
FROM pay FULL JOIN sw ON sw.day = pay.day AND sw.account_id = pay.account_id;
