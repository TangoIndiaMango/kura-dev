-- Reports summary: everything period-shaped reads the per-day rollups
-- (see rollup.sql); only distinct rider/vehicle counts and point-in-time
-- snapshots touch live tables, each bounded by an index.
--
-- Revenue is successful payments for services: wallet top-ups (FUND,
-- WALLET_TOPUP) are left out because they are spent later as wallet-debit
-- payments, which would count the same naira twice.

-- name: SummaryMoney :many
SELECT purpose, channel, status, sum(payments)::bigint AS payments, sum(amount_kobo)::bigint AS amount_kobo,
  sum(vat_kobo)::bigint AS vat_kobo
FROM analytics_dailymoney
WHERE day BETWEEN sqlc.arg(from_day)::date AND sqlc.arg(to_day)::date
  AND (sqlc.narg(hub)::uuid IS NULL OR hub_id = sqlc.narg(hub))
  AND (sqlc.narg(cooperative)::uuid IS NULL OR cooperative_id = sqlc.narg(cooperative))
GROUP BY 1, 2, 3;

-- name: SummaryDaily :many
-- One row per day in range (zeros included) so charts have no gaps.
SELECT d::date AS day,
  COALESCE((SELECT sum(m.amount_kobo) FROM analytics_dailymoney m WHERE m.day = d::date AND m.status = 'SUCCESS'
    AND m.purpose NOT IN ('FUND', 'WALLET_TOPUP')
    AND (sqlc.narg(hub)::uuid IS NULL OR m.hub_id = sqlc.narg(hub))
    AND (sqlc.narg(cooperative)::uuid IS NULL OR m.cooperative_id = sqlc.narg(cooperative))), 0)::bigint AS revenue_kobo,
  COALESCE((SELECT sum(s.swaps) FROM analytics_dailyswaps s WHERE s.day = d::date
    AND (sqlc.narg(hub)::uuid IS NULL OR s.hub_id = sqlc.narg(hub))
    AND (sqlc.narg(cooperative)::uuid IS NULL OR s.cooperative_id = sqlc.narg(cooperative))), 0)::bigint AS swaps
FROM generate_series(sqlc.arg(from_day)::date, sqlc.arg(to_day)::date, interval '1 day') d
ORDER BY 1;

-- name: SummaryOps :one
SELECT
  COALESCE((SELECT sum(swaps) FROM analytics_dailyswaps
    WHERE day BETWEEN sqlc.arg(from_day)::date AND sqlc.arg(to_day)::date
      AND (sqlc.narg(hub)::uuid IS NULL OR hub_id = sqlc.narg(hub))
      AND (sqlc.narg(cooperative)::uuid IS NULL OR cooperative_id = sqlc.narg(cooperative))), 0)::bigint AS swaps,
  COALESCE((SELECT sum(amount_kobo) FROM analytics_dailyswaps
    WHERE day BETWEEN sqlc.arg(from_day)::date AND sqlc.arg(to_day)::date
      AND (sqlc.narg(hub)::uuid IS NULL OR hub_id = sqlc.narg(hub))
      AND (sqlc.narg(cooperative)::uuid IS NULL OR cooperative_id = sqlc.narg(cooperative))), 0)::bigint AS swap_kobo,
  COALESCE((SELECT sum(no_shows) FROM analytics_dailyhubmetric
    WHERE date BETWEEN sqlc.arg(from_day)::date AND sqlc.arg(to_day)::date
      AND (sqlc.narg(hub)::uuid IS NULL OR hub_id = sqlc.narg(hub))), 0)::bigint AS expired_reservations,
  COALESCE((SELECT sum(overrides) FROM analytics_dailyhubmetric
    WHERE date BETWEEN sqlc.arg(from_day)::date AND sqlc.arg(to_day)::date
      AND (sqlc.narg(hub)::uuid IS NULL OR hub_id = sqlc.narg(hub))), 0)::bigint AS overrides;

-- name: SummaryFleetNow :one
-- Point in time: packs that can be swapped and hubs that are not closed,
-- the denominators for swaps per pack and per hub.
SELECT (SELECT count(*) FROM mobility_battery WHERE status NOT IN ('LOST', 'RETIRED')
          AND (sqlc.narg(hub)::uuid IS NULL OR current_hub_id = sqlc.narg(hub)))::bigint AS packs,
  (SELECT count(*) FROM mobility_hub WHERE status <> 'CLOSED'
          AND (sqlc.narg(hub)::uuid IS NULL OR id = sqlc.narg(hub)))::bigint AS hubs;

-- name: SummaryDistinct :one
-- Distinct riders and vehicles that completed a swap in range.
SELECT count(DISTINCT s.account_id)::bigint AS riders, count(DISTINCT s.vehicle_id)::bigint AS vehicles
FROM mobility_swap s JOIN mobility_vehicle v ON v.id = s.vehicle_id
WHERE s.status = 'COMPLETED'
  AND s.created_at >= (sqlc.arg(from_day)::date::timestamp AT TIME ZONE 'Africa/Lagos')
  AND s.created_at < ((sqlc.arg(to_day)::date + 1)::timestamp AT TIME ZONE 'Africa/Lagos')
  AND (sqlc.narg(hub)::uuid IS NULL OR s.hub_id = sqlc.narg(hub))
  AND (sqlc.narg(cooperative)::uuid IS NULL OR v.cooperative_id = sqlc.narg(cooperative));

-- name: SummaryNewRiders :one
SELECT count(*)::bigint FROM accounts_account a
WHERE a.created_at >= (sqlc.arg(from_day)::date::timestamp AT TIME ZONE 'Africa/Lagos')
  AND a.created_at < ((sqlc.arg(to_day)::date + 1)::timestamp AT TIME ZONE 'Africa/Lagos')
  AND (sqlc.narg(cooperative)::uuid IS NULL OR EXISTS (SELECT 1 FROM mobility_vehicle v
       WHERE v.account_id = a.id AND v.cooperative_id = sqlc.narg(cooperative)));

-- name: SummaryCredit :one
-- Point in time: open loans now, split by how long past due they are.
SELECT count(*)::bigint AS loans,
  COALESCE(sum(l.total_due_kobo - l.repaid_kobo), 0)::bigint AS outstanding_kobo,
  count(*) FILTER (WHERE COALESCE(l.grace_until, l.due_at) < now())::bigint AS past_due_loans,
  COALESCE(sum(l.total_due_kobo - l.repaid_kobo) FILTER (WHERE COALESCE(l.grace_until, l.due_at) < now()
    AND COALESCE(l.grace_until, l.due_at) >= now() - interval '7 days'), 0)::bigint AS late_1_7_kobo,
  COALESCE(sum(l.total_due_kobo - l.repaid_kobo) FILTER (WHERE COALESCE(l.grace_until, l.due_at) < now() - interval '7 days'
    AND COALESCE(l.grace_until, l.due_at) >= now() - interval '30 days'), 0)::bigint AS late_8_30_kobo,
  COALESCE(sum(l.total_due_kobo - l.repaid_kobo) FILTER (WHERE COALESCE(l.grace_until, l.due_at) < now() - interval '30 days'
    AND COALESCE(l.grace_until, l.due_at) >= now() - interval '90 days'), 0)::bigint AS late_31_90_kobo,
  COALESCE(sum(l.total_due_kobo - l.repaid_kobo) FILTER (WHERE COALESCE(l.grace_until, l.due_at) < now() - interval '90 days'), 0)::bigint AS late_90_plus_kobo
FROM credit_loan l
WHERE l.status IN ('ACTIVE', 'GRACE', 'RESTRICTED')
  AND (sqlc.narg(cooperative)::uuid IS NULL OR EXISTS (SELECT 1 FROM mobility_vehicle v
       WHERE v.account_id = l.account_id AND v.cooperative_id = sqlc.narg(cooperative)));

-- name: SummaryHubs :many
WITH m AS (
  SELECT hub_id, sum(amount_kobo) FILTER (WHERE status = 'SUCCESS' AND purpose NOT IN ('FUND', 'WALLET_TOPUP'))::bigint AS revenue
  FROM analytics_dailymoney WHERE day BETWEEN sqlc.arg(from_day)::date AND sqlc.arg(to_day)::date
    AND hub_id IS NOT NULL AND (sqlc.narg(cooperative)::uuid IS NULL OR cooperative_id = sqlc.narg(cooperative))
  GROUP BY 1
), s AS (
  SELECT hub_id, sum(swaps)::bigint AS swaps FROM analytics_dailyswaps
  WHERE day BETWEEN sqlc.arg(from_day)::date AND sqlc.arg(to_day)::date
    AND (sqlc.narg(cooperative)::uuid IS NULL OR cooperative_id = sqlc.narg(cooperative))
  GROUP BY 1
), o AS (
  SELECT hub_id, sum(no_shows)::bigint AS expired, sum(overrides)::bigint AS overrides FROM analytics_dailyhubmetric
  WHERE date BETWEEN sqlc.arg(from_day)::date AND sqlc.arg(to_day)::date GROUP BY 1
)
SELECT h.id, h.code, h.name, COALESCE(s.swaps, 0)::bigint AS swaps, COALESCE(m.revenue, 0)::bigint AS revenue_kobo,
  COALESCE(o.expired, 0)::bigint AS expired_reservations, COALESCE(o.overrides, 0)::bigint AS overrides,
  count(*) OVER ()::int AS total
FROM mobility_hub h LEFT JOIN m ON m.hub_id = h.id LEFT JOIN s ON s.hub_id = h.id LEFT JOIN o ON o.hub_id = h.id
WHERE (sqlc.narg(hub)::uuid IS NULL OR h.id = sqlc.narg(hub))
  AND (m.hub_id IS NOT NULL OR s.hub_id IS NOT NULL OR o.hub_id IS NOT NULL)
ORDER BY revenue_kobo DESC, swaps DESC, h.code
LIMIT sqlc.arg(lim) OFFSET sqlc.arg(off);

-- name: SummaryCooperatives :many
-- Per chairman group, plus one "no chairman" row (id NULL).
WITH m AS (
  SELECT cooperative_id, sum(amount_kobo) FILTER (WHERE status = 'SUCCESS' AND purpose NOT IN ('FUND', 'WALLET_TOPUP'))::bigint AS revenue
  FROM analytics_dailymoney WHERE day BETWEEN sqlc.arg(from_day)::date AND sqlc.arg(to_day)::date
    AND (sqlc.narg(hub)::uuid IS NULL OR hub_id = sqlc.narg(hub))
  GROUP BY 1
), s AS (
  SELECT cooperative_id, sum(swaps)::bigint AS swaps FROM analytics_dailyswaps
  WHERE day BETWEEN sqlc.arg(from_day)::date AND sqlc.arg(to_day)::date
    AND (sqlc.narg(hub)::uuid IS NULL OR hub_id = sqlc.narg(hub))
  GROUP BY 1
), f AS (
  SELECT v.cooperative_id, count(*)::bigint AS vehicles,
    count(b.id) FILTER (WHERE b.status = 'ISSUED')::bigint AS packs_out
  FROM mobility_vehicle v LEFT JOIN mobility_battery b ON b.id = v.current_battery_id
  WHERE v.status <> 'RETIRED' GROUP BY 1
), k AS (
  SELECT cooperative_id FROM m UNION SELECT cooperative_id FROM s UNION SELECT cooperative_id FROM f
)
SELECT k.cooperative_id, c.name, u.first_name AS chairman_first, u.last_name AS chairman_last,
  COALESCE(f.vehicles, 0)::bigint AS vehicles, COALESCE(f.packs_out, 0)::bigint AS packs_out,
  COALESCE(s.swaps, 0)::bigint AS swaps, COALESCE(m.revenue, 0)::bigint AS revenue_kobo,
  count(*) OVER ()::int AS total
FROM k
LEFT JOIN accounts_cooperative c ON c.id = k.cooperative_id
LEFT JOIN accounts_user u ON u.id = c.chairman_user_id
LEFT JOIN m ON m.cooperative_id IS NOT DISTINCT FROM k.cooperative_id
LEFT JOIN s ON s.cooperative_id IS NOT DISTINCT FROM k.cooperative_id
LEFT JOIN f ON f.cooperative_id IS NOT DISTINCT FROM k.cooperative_id
WHERE (sqlc.narg(cooperative)::uuid IS NULL OR k.cooperative_id = sqlc.narg(cooperative))
ORDER BY (k.cooperative_id IS NULL), revenue_kobo DESC, c.name
LIMIT sqlc.arg(lim) OFFSET sqlc.arg(off);

-- name: RollupAsOf :one
SELECT last_run_at FROM analytics_rollupstate WHERE name = 'daily';
