-- Virtual account provisioning (integrations.services.va + WalletService).

-- name: AccountForVA :one
SELECT a.id, a.kura_id, a.display_name, a.psp, a.kyc_status, u.email, u.phone
FROM accounts_account a JOIN accounts_user u ON u.id = a.owner_user_id
WHERE a.id = $1;

-- name: VirtualAccountRow :one
SELECT id, status, nuban, provision_attempts, last_error, next_attempt_at
FROM finance_virtualaccount WHERE account_id = $1;

-- name: EnsureWallet :exec
-- WalletService.get_or_create_wallet (Wallet is one-to-one with Account).
INSERT INTO finance_wallet (id, created_at, updated_at, balance_kobo, hold_kobo, status, account_id)
VALUES ($1, clock_timestamp(), clock_timestamp(), 0, 0, 'ACTIVE', $2)
ON CONFLICT (account_id) DO NOTHING;

-- name: EnsurePendingVA :exec
-- WalletService.ensure_pending_virtual_account.
INSERT INTO finance_virtualaccount (id, created_at, updated_at, nuban, bank_name, account_name, status,
  account_id, psp_reference, last_attempt_at, last_error, next_attempt_at, provision_attempts)
VALUES ($1, clock_timestamp(), clock_timestamp(), NULL, '', '', 'PENDING', $2, '', NULL, '', NULL, 0)
ON CONFLICT (account_id) DO NOTHING;

-- name: SetVAReference :exec
UPDATE finance_virtualaccount SET psp_reference = $2 WHERE account_id = $1;

-- name: VAForUpdate :one
SELECT id FROM finance_virtualaccount WHERE account_id = $1 FOR UPDATE;

-- name: NubanTaken :one
SELECT EXISTS (SELECT 1 FROM finance_virtualaccount WHERE nuban = $1 AND id <> $2);

-- name: ActivateVA :exec
UPDATE finance_virtualaccount SET nuban = $2, bank_name = $3, account_name = $4, psp_reference = $5,
  status = 'ACTIVE', updated_at = now()
WHERE id = $1;

-- name: RecordVAAttempt :exec
UPDATE finance_virtualaccount SET provision_attempts = $2, last_attempt_at = $3, next_attempt_at = $4,
  last_error = $5, updated_at = $3
WHERE id = $1;

-- name: SetAccountKycStatus :exec
UPDATE accounts_account SET kyc_status = $2, updated_at = now() WHERE id = $1;

-- name: LatestBVNOrNIN :one
SELECT number_encrypted FROM accounts_identitydocument
WHERE account_id = $1 AND doc_type IN ('BVN', 'NIN') AND number_encrypted <> ''
ORDER BY created_at DESC LIMIT 1;

-- name: RiskReviewerIDs :many
-- notify_risk_reviewers: active super admins / ops managers (User: -created_at).
SELECT id FROM accounts_user WHERE is_active AND role IN ('SUPER_ADMIN', 'OPS_MANAGER')
ORDER BY created_at DESC LIMIT 25;

-- name: DueVirtualAccounts :many
-- retry_pending_virtual_accounts: PENDING NUBANs whose retry is due.
SELECT account_id FROM finance_virtualaccount
WHERE status = 'PENDING' AND next_attempt_at IS NOT NULL AND next_attempt_at <= $1
ORDER BY next_attempt_at LIMIT $2;
