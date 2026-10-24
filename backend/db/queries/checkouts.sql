-- Paystack Checkout wallet top-ups (finance_walletcheckout).

-- name: InsertCheckout :one
INSERT INTO finance_walletcheckout (id, created_at, updated_at, reference, amount_kobo, status, access_code,
  authorization_url, account_id, user_id, purpose, swap_id)
VALUES ($1, clock_timestamp(), clock_timestamp(), $2, $3, 'PENDING', $4, $5, $6, $7, $8, $9)
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
SELECT * FROM finance_walletcheckout WHERE swap_id = $1 AND status = 'SUCCESS';
