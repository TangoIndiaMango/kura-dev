-- Account spend (accounts.selectors.spend + account_detail_stats).
-- Every query reads COMPLETED swaps of one account with completed_at in [from, to).

-- name: SwapTotals :one
SELECT count(*)::int AS swaps, COALESCE(sum(amount_kobo), 0)::bigint AS spend,
  COALESCE(avg(returned_charge_pct), 0)::float8 AS avg_soc,
  count(*) FILTER (WHERE returned_charge_pct >= 20)::int AS optimal,
  count(*) FILTER (WHERE returned_charge_pct >= 12 AND returned_charge_pct < 20)::int AS adequate,
  count(*) FILTER (WHERE returned_charge_pct < 12)::int AS critical
FROM mobility_swap
WHERE account_id = $1 AND status = 'COMPLETED' AND completed_at >= sqlc.arg(from_at)::timestamptz AND completed_at < sqlc.arg(to_at)::timestamptz;

-- name: SwapDaily :many
-- Lagos-local days (TruncDate in Django's TIME_ZONE); energy is 3.24 kWh per pack.
SELECT (completed_at AT TIME ZONE 'Africa/Lagos')::date AS day, count(*)::int AS swaps,
  COALESCE(sum(amount_kobo), 0)::bigint AS fees,
  COALESCE(sum((issued_charge_pct - returned_charge_pct) * 3.24 / 100.0), 0)::float8 AS energy
FROM mobility_swap
WHERE account_id = $1 AND status = 'COMPLETED' AND completed_at >= sqlc.arg(from_at)::timestamptz AND completed_at < sqlc.arg(to_at)::timestamptz
GROUP BY 1;

-- name: SwapByVehicle :many
SELECT s.vehicle_id, v.registration_plate AS plate, count(*)::int AS swaps,
  COALESCE(sum(s.amount_kobo), 0)::bigint AS fees
FROM mobility_swap s JOIN mobility_vehicle v ON v.id = s.vehicle_id
WHERE s.account_id = $1 AND s.status = 'COMPLETED' AND s.completed_at >= sqlc.arg(from_at)::timestamptz AND s.completed_at < sqlc.arg(to_at)::timestamptz
GROUP BY s.vehicle_id, v.registration_plate
ORDER BY 4 DESC;

-- name: SwapByDriver :many
SELECT s.driver_id, u.first_name, u.last_name, u.phone, count(*)::int AS swaps,
  COALESCE(sum(s.amount_kobo), 0)::bigint AS fees
FROM mobility_swap s JOIN accounts_driver d ON d.id = s.driver_id JOIN accounts_user u ON u.id = d.user_id
WHERE s.account_id = $1 AND s.status = 'COMPLETED' AND s.completed_at >= sqlc.arg(from_at)::timestamptz AND s.completed_at < sqlc.arg(to_at)::timestamptz
GROUP BY s.driver_id, u.first_name, u.last_name, u.phone
ORDER BY 6 DESC;

-- name: SwapByMode :many
SELECT payment_mode, count(*)::int AS swaps, COALESCE(sum(amount_kobo), 0)::bigint AS fees
FROM mobility_swap
WHERE account_id = $1 AND status = 'COMPLETED' AND completed_at >= sqlc.arg(from_at)::timestamptz AND completed_at < sqlc.arg(to_at)::timestamptz
GROUP BY payment_mode
ORDER BY 3 DESC;

-- name: PlanFeesDaily :many
SELECT (created_at AT TIME ZONE 'Africa/Lagos')::date AS day, COALESCE(sum(amount_kobo), 0)::bigint AS fees
FROM finance_payment
WHERE account_id = $1 AND purpose = 'PLAN' AND status = 'SUCCESS'
  AND created_at >= sqlc.arg(from_at)::timestamptz AND created_at < sqlc.arg(to_at)::timestamptz
GROUP BY 1;

-- name: PlanFeesByVehicle :many
-- values("subscriptions__vehicle_id"): a LEFT JOIN, so unlinked payments group under NULL.
SELECT s.vehicle_id, v.registration_plate AS plate, COALESCE(sum(p.amount_kobo), 0)::bigint AS fees
FROM finance_payment p
LEFT JOIN mobility_subscription s ON s.payment_id = p.id
LEFT JOIN mobility_vehicle v ON v.id = s.vehicle_id
WHERE p.account_id = $1 AND p.purpose = 'PLAN' AND p.status = 'SUCCESS'
  AND p.created_at >= sqlc.arg(from_at)::timestamptz AND p.created_at < sqlc.arg(to_at)::timestamptz
GROUP BY s.vehicle_id, v.registration_plate;

-- name: DriversUsage :many
-- drivers_usage_today: every driver on the account with today's swaps / spend.
SELECT d.id, u.first_name, u.last_name, u.phone, d.daily_swap_limit, d.daily_spend_kobo_limit,
  COALESCE(t.swaps, 0)::int AS swaps, COALESCE(t.fees, 0)::bigint AS fees
FROM accounts_driver d JOIN accounts_user u ON u.id = d.user_id
LEFT JOIN (SELECT ms.driver_id, count(*) AS swaps, sum(ms.amount_kobo) AS fees FROM mobility_swap ms
  WHERE ms.account_id = sqlc.arg(account_id) AND ms.status = 'COMPLETED' AND ms.completed_at >= sqlc.arg(from_at)::timestamptz
    AND ms.completed_at < sqlc.arg(to_at)::timestamptz
  GROUP BY ms.driver_id) t ON t.driver_id = d.id
WHERE d.account_id = sqlc.arg(account_id);

-- name: AccountChildCounts :one
SELECT (SELECT count(*) FROM accounts_driver d WHERE d.account_id = sqlc.arg(account_id))::int AS drivers,
  (SELECT count(*) FROM mobility_vehicle v WHERE v.account_id = sqlc.arg(account_id))::int AS vehicles,
  (SELECT count(*) FROM accounts_identitydocument i WHERE i.account_id = sqlc.arg(account_id))::int AS docs;
