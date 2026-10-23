-- Worker sweeps (run_task_worker): swap lifecycle, unreturned packs,
-- subscriptions, price matrices, shifts, settlement, credit.

-- name: DueReservationIDs :many
SELECT id FROM mobility_reservation WHERE status IN ('PENDING', 'CONFIRMED') AND expires_at <= now()
ORDER BY expires_at LIMIT $1;

-- name: ReleaseOrphanedReserved :execrows
-- QuerySet.update(): updated_at is left alone.
UPDATE mobility_battery SET status = 'AVAILABLE'
WHERE status = 'RESERVED' AND id NOT IN (SELECT battery_id FROM mobility_reservation
  WHERE status IN ('PENDING', 'CONFIRMED') AND battery_id IS NOT NULL);

-- name: StaleOpenSwapIDs :many
SELECT DISTINCT s.id, s.started_at, s.created_at FROM mobility_swap s
LEFT JOIN mobility_reservation r ON r.id = s.reservation_id
WHERE s.status IN ('STARTED', 'RETURN_RECORDED', 'ISSUED')
  AND (s.started_at <= sqlc.arg(cutoff)::timestamptz OR r.status IN ('EXPIRED', 'CANCELLED')
       OR (r.status IN ('PENDING', 'CONFIRMED') AND r.expires_at <= now()))
ORDER BY s.started_at, s.created_at LIMIT sqlc.arg(lim);

-- name: OpenSwapIDs :many
SELECT id FROM mobility_swap WHERE status IN ('STARTED', 'RETURN_RECORDED', 'ISSUED')
ORDER BY started_at, created_at LIMIT $1;

-- name: OverdueBatteryIDs :many
SELECT id FROM mobility_battery WHERE status = 'ISSUED'
  AND (expected_return_by < now() OR (expected_return_by IS NULL AND issued_at < now() - interval '48 hours'))
ORDER BY expected_return_by, issued_at LIMIT $1;

-- name: IssuedBatteryForUpdate :one
SELECT * FROM mobility_battery WHERE id = $1 AND status = 'ISSUED' FOR UPDATE;

-- name: MountedVehicle :one
SELECT * FROM mobility_vehicle WHERE current_battery_id = $1 ORDER BY id LIMIT 1;

-- name: SetAccountStatusOnly :exec
UPDATE accounts_account SET status = $2, updated_at = now() WHERE id = $1;

-- name: DueSubscriptionIDs :many
SELECT id FROM mobility_subscription WHERE status = 'ACTIVE' AND auto_renew = $1 AND ends_at <= now()
ORDER BY ends_at LIMIT $2;

-- name: PriceWarnCandidates :many
SELECT s.id, s.ends_at, s.list_price_kobo, p.name AS plan_name, p.period, m.vehicle_type, a.owner_user_id
FROM mobility_subscription s
JOIN mobility_plan p ON p.id = s.plan_id
JOIN mobility_vehicle v ON v.id = s.vehicle_id
JOIN mobility_vehiclemodel m ON m.id = v.vehicle_model_id
JOIN accounts_account a ON a.id = s.account_id
WHERE s.status = 'ACTIVE' AND s.auto_renew AND s.ends_at > now() AND s.ends_at <= sqlc.arg(window_end)::timestamptz
  AND s.queued_plan_id IS NULL
ORDER BY s.ends_at LIMIT sqlc.arg(lim);

-- name: DueMatrixIDs :many
SELECT id FROM mobility_pricematrix WHERE status = 'SCHEDULED' AND effective_from <= sqlc.arg(today)::date
ORDER BY effective_from, created_at LIMIT sqlc.arg(lim);

-- name: SubscriptionByID :one
SELECT * FROM mobility_subscription WHERE id = $1;

-- name: StaleOpenShiftIDs :many
SELECT id FROM operations_shift WHERE status = 'OPEN' AND opened_at < $1 ORDER BY created_at DESC LIMIT 500;

-- name: AutoCloseShift :exec
UPDATE operations_shift SET expected_cash_kobo = $2, closed_at = $3, status = 'CLOSED', auto_closed = true,
  updated_at = now()
WHERE id = $1;

-- name: ClosedShiftsBefore :many
SELECT s.*, h.code AS hub_code FROM operations_shift s JOIN mobility_hub h ON h.id = s.hub_id
WHERE s.status = 'CLOSED' AND s.closed_at <= $1 ORDER BY s.closed_at DESC LIMIT 200;

-- name: OpenShiftFloat :one
SELECT COALESCE(sum(d.amount_kobo), 0)::bigint FROM operations_cashdeposit d
JOIN operations_shift s ON s.id = d.shift_id WHERE d.status = 'SUCCESS' AND s.status = 'OPEN';

-- name: EscalatableAlertIDs :many
SELECT id FROM operations_alert WHERE kind IN ('SETTLEMENT_MISMATCH', 'SHIFT_CASH_VARIANCE') AND status = 'OPEN'
  AND created_at <= $1 ORDER BY created_at LIMIT 100;

-- name: EscalateAlert :exec
UPDATE operations_alert SET status = 'ESCALATED', severity = 'CRITICAL', updated_at = now() WHERE id = $1;

-- name: ActiveAccountsForScoring :many
SELECT * FROM accounts_account WHERE status = 'ACTIVE' ORDER BY created_at LIMIT $1;

-- name: SaveCreditLineScoreOpen :exec
UPDATE credit_creditline SET score_id = $2, limit_kobo = $3, updated_at = now() WHERE account_id = $1 AND status <> 'CLOSED';

-- name: DebitableLoans :many
SELECT * FROM credit_loan WHERE status IN ('ACTIVE', 'GRACE', 'RESTRICTED') ORDER BY due_at LIMIT $1;

-- name: AutoDebitedOn :one
-- created_at__date compares the Lagos date with the worker's UTC "today".
SELECT EXISTS (SELECT 1 FROM credit_loanrepayment WHERE loan_id = $1 AND kind = 'AUTO_DEBIT' AND status = 'SUCCESS'
  AND (created_at AT TIME ZONE 'Africa/Lagos')::date = sqlc.arg(day)::date);

-- name: InsertAutoRepayment :exec
INSERT INTO credit_loanrepayment (id, created_at, updated_at, amount_kobo, kind, status, idempotency_key, loan_id, payment_id)
VALUES ($1, clock_timestamp(), clock_timestamp(), $2, 'AUTO_DEBIT', 'SUCCESS', $3, $4, $5);

-- name: SaveLoanState :exec
UPDATE credit_loan SET repaid_kobo = $2, status = $3, swap_credit_remaining_kobo = $4, grace_until = $5, updated_at = now()
WHERE id = $1;

-- name: SetCreditLinesStatus :exec
UPDATE credit_creditline SET status = $2, updated_at = now() WHERE account_id = $1;

-- name: SetAccountRiskStatus :exec
UPDATE accounts_account SET risk_status = $2, updated_at = now() WHERE id = $1;
