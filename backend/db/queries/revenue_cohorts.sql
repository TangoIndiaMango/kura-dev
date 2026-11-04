-- Revenue analytics from the per-account daily rollup (analytics_dailyaccount).

-- name: CohortSizes :many
-- Riders who joined in each Lagos month since from_month.
SELECT date_trunc('month', created_at AT TIME ZONE 'Africa/Lagos')::date AS cohort, count(*)::int AS riders
FROM accounts_account
WHERE created_at >= (sqlc.arg(from_month)::date::timestamp AT TIME ZONE 'Africa/Lagos')
GROUP BY 1 ORDER BY 1;

-- name: CohortActivity :many
-- For each joining month, how many of those riders paid or swapped in each later month, and what they paid.
WITH act AS (
  SELECT account_id, date_trunc('month', day)::date AS month, sum(paid_kobo)::bigint AS paid
  FROM analytics_dailyaccount WHERE day >= sqlc.arg(from_month)::date GROUP BY 1, 2
)
SELECT date_trunc('month', a.created_at AT TIME ZONE 'Africa/Lagos')::date AS cohort, act.month,
  count(*)::int AS active, sum(act.paid)::bigint AS paid_kobo
FROM act JOIN accounts_account a ON a.id = act.account_id
WHERE a.created_at >= (sqlc.arg(from_month)::date::timestamp AT TIME ZONE 'Africa/Lagos')
GROUP BY 1, 2 ORDER BY 1, 2;

-- name: MonthlyArpu :many
SELECT date_trunc('month', day)::date AS month, count(DISTINCT account_id)::int AS active_riders,
  sum(paid_kobo)::bigint AS paid_kobo
FROM analytics_dailyaccount
WHERE day >= sqlc.arg(from_month)::date AND (paid_kobo > 0 OR swaps > 0)
GROUP BY 1 ORDER BY 1;

-- name: RiderRetention :one
-- Riders active in the 30 days before `today` (now) versus the 30 days before that.
WITH now_set AS (
  SELECT DISTINCT account_id FROM analytics_dailyaccount
  WHERE day > sqlc.arg(today)::date - 30 AND day <= sqlc.arg(today)::date
), before_set AS (
  SELECT DISTINCT account_id FROM analytics_dailyaccount
  WHERE day > sqlc.arg(today)::date - 60 AND day <= sqlc.arg(today)::date - 30
)
SELECT (SELECT count(*) FROM now_set)::int AS active_now,
  (SELECT count(*) FROM before_set)::int AS active_before,
  (SELECT count(*) FROM before_set b WHERE NOT EXISTS (SELECT 1 FROM now_set n WHERE n.account_id = b.account_id))::int AS churned;

-- name: PlanRenewals :one
-- Plans that ended in the last 30 days and how many were followed by a new
-- plan on the same vehicle within three days.
SELECT count(*)::int AS ended,
  count(*) FILTER (WHERE EXISTS (SELECT 1 FROM mobility_subscription n
    WHERE n.vehicle_id = s.vehicle_id AND n.id <> s.id
      AND n.starts_at BETWEEN s.ends_at - interval '3 days' AND s.ends_at + interval '3 days'))::int AS renewed,
  (SELECT count(*) FROM mobility_subscription WHERE status = 'ACTIVE')::int AS active_plans
FROM mobility_subscription s
WHERE s.ends_at >= now() - interval '30 days' AND s.ends_at < now();
