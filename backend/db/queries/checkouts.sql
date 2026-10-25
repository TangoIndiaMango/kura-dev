-- Paystack Checkout payments (finance_walletcheckout): top-ups and pay-at-swap.

-- name: InsertCheckout :one
INSERT INTO finance_walletcheckout (id, created_at, updated_at, reference, amount_kobo, status, access_code,
  authorization_url, account_id, user_id, purpose, swap_id, reservation_id)
VALUES ($1, clock_timestamp(), clock_timestamp(), $2, $3, 'PENDING', $4, $5, $6, $7, $8, $9, $10)
RETURNING *;

-- name: CheckoutByReference :one
SELECT * FROM finance_walletcheckout WHERE reference = $1;

-- name: CheckoutForUpdate :one
SELECT * FROM finance_walletcheckout WHERE reference = $1 FOR UPDATE;

-- name: SettleCheckout :exec
UPDATE finance_walletcheckout SET status = $2, payment_id = $3, failure_reason = $4, channel = $5, updated_at = now()
WHERE id = $1;

-- name: LatestSwapCheckout :one
SELECT * FROM finance_walletcheckout WHERE swap_id = $1 ORDER BY (status = 'SUCCESS') DESC, created_at DESC LIMIT 1;

-- name: PaidSwapCheckout :one
SELECT * FROM finance_walletcheckout WHERE swap_id = $1 AND status = 'SUCCESS' ORDER BY created_at LIMIT 1;

-- name: UnrecordedCheckouts :many
-- Paid checkouts for a swap or its booking whose money was never used.
SELECT * FROM finance_walletcheckout WHERE status = 'SUCCESS' AND payment_id IS NULL
  AND ((sqlc.narg(swap)::uuid IS NOT NULL AND swap_id = sqlc.narg(swap))
    OR (sqlc.narg(reservation)::uuid IS NOT NULL AND reservation_id = sqlc.narg(reservation)))
ORDER BY created_at FOR UPDATE;

-- name: SetCheckoutPayment :exec
UPDATE finance_walletcheckout SET payment_id = $2, updated_at = now() WHERE id = $1;

-- name: CheckoutsToReverify :many
SELECT * FROM finance_walletcheckout WHERE status = 'PENDING'
  AND created_at < now() - interval '2 minutes' AND created_at > now() - interval '48 hours'
ORDER BY created_at LIMIT $1;

-- name: ExpireStaleCheckouts :execrows
UPDATE finance_walletcheckout SET status = 'FAILED', failure_reason = 'expired', updated_at = now()
WHERE status = 'PENDING' AND created_at <= now() - interval '48 hours';

-- name: RefundDueCheckouts :many
SELECT * FROM finance_walletcheckout WHERE status = 'REFUND_PENDING' ORDER BY updated_at LIMIT $1; -- approved by finance

-- name: CheckoutByPayment :one
SELECT * FROM finance_walletcheckout WHERE payment_id = $1 LIMIT 1;

-- name: LatestReservationCheckout :one
SELECT * FROM finance_walletcheckout WHERE reservation_id = $1
ORDER BY (status = 'SUCCESS') DESC, created_at DESC LIMIT 1;

-- name: PaidReservationCheckout :one
SELECT * FROM finance_walletcheckout WHERE reservation_id = $1 AND status = 'SUCCESS' ORDER BY created_at LIMIT 1;

-- name: CheckoutByIDForUpdate :one
SELECT * FROM finance_walletcheckout WHERE id = $1 FOR UPDATE;

-- name: RefundsByStatus :many
SELECT c.*, a.kura_id, a.display_name FROM finance_walletcheckout c JOIN accounts_account a ON a.id = c.account_id
WHERE c.status = $1 ORDER BY c.updated_at DESC LIMIT $2;
