-- Finance core: ledger, payments, wallets, holds (finance.services).

-- name: WalletForUpdate :one
SELECT * FROM finance_wallet WHERE account_id = $1 FOR UPDATE;

-- name: SaveWalletBalances :exec
UPDATE finance_wallet SET balance_kobo = $2, hold_kobo = $3, updated_at = now() WHERE id = $1;

-- name: EnsureLedgerAccount :exec
INSERT INTO finance_ledgeraccount (id, created_at, updated_at, code, account_type, balance_kobo)
VALUES ($1, clock_timestamp(), clock_timestamp(), $2, $3, 0) ON CONFLICT (code) DO NOTHING;

-- name: LedgerAccountForUpdate :one
SELECT * FROM finance_ledgeraccount WHERE code = $1 FOR UPDATE;

-- name: SetLedgerBalance :exec
UPDATE finance_ledgeraccount SET balance_kobo = $2 WHERE id = $1;

-- name: InsertLedgerTransaction :exec
INSERT INTO finance_ledgertransaction (id, created_at, updated_at, kind, reference, description, posted_at)
VALUES ($1, clock_timestamp(), clock_timestamp(), $2, $3, $4, clock_timestamp());

-- name: InsertLedgerEntry :exec
INSERT INTO finance_ledgerentry (id, created_at, updated_at, debit_kobo, credit_kobo, ledger_account_id, transaction_id)
VALUES ($1, clock_timestamp(), clock_timestamp(), $2, $3, $4, $5);

-- name: PaymentByIdempotency :one
SELECT * FROM finance_payment WHERE idempotency_key = $1;

-- name: PaymentByPSPRef :one
SELECT * FROM finance_payment WHERE psp_reference = $1;

-- name: InsertPayment :one
INSERT INTO finance_payment (id, created_at, updated_at, channel, amount_kobo, vat_kobo, receipt_code, psp_reference,
  status, purpose, account_id, hub_id, idempotency_key)
VALUES ($1, clock_timestamp(), clock_timestamp(), $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
ON CONFLICT DO NOTHING -- a clash (receipt code / key / PSP ref) must not abort the caller's transaction
RETURNING *;

-- name: SetPaymentStatus :exec
UPDATE finance_payment SET status = $2, updated_at = now() WHERE id = $1;
