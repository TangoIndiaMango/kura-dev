-- name: UpdateUserProfile :exec
UPDATE accounts_user
SET first_name = $2, last_name = $3, phone = $4, email = $5, avatar_id = $6,
    notification_prefs = $7, updated_at = now()
WHERE id = $1;

-- name: SetUserPassword :exec
UPDATE accounts_user SET password = $2, updated_at = now() WHERE id = $1;

-- name: MediaAssetOwner :one
SELECT id, uploaded_by_id FROM core_mediaasset WHERE id = $1;

-- name: SetupTokenByHash :one
SELECT t.id, t.purpose, t.expires_at, t.consumed_at, t.user_id,
       u.email, u.first_name, u.is_active
FROM accounts_passwordsetuptoken t JOIN accounts_user u ON u.id = t.user_id
WHERE t.token_hash = $1 LIMIT 1;

-- name: SetupTokenByHashForUpdate :one
SELECT t.id, t.purpose, t.expires_at, t.consumed_at, t.user_id, u.is_active
FROM accounts_passwordsetuptoken t JOIN accounts_user u ON u.id = t.user_id
WHERE t.token_hash = $1 LIMIT 1
FOR UPDATE OF t;

-- name: ConsumeSetupTokens :exec
-- Consume this token and every other open one for the same user + purpose.
UPDATE accounts_passwordsetuptoken SET consumed_at = now(), updated_at = now()
WHERE user_id = $1 AND purpose = $2 AND consumed_at IS NULL;

-- name: ActiveConsentForUpdate :one
SELECT id, granted_at, withdrawn_at, channel, policy_version FROM accounts_consent
WHERE account_id = $1 AND purpose = $2 AND withdrawn_at IS NULL
LIMIT 1 FOR UPDATE;

-- name: InsertConsent :exec
INSERT INTO accounts_consent (id, created_at, updated_at, purpose, granted_at, channel,
    policy_version, account_id)
VALUES ($1, now(), now(), $2, $3, $4, $5, $6);

-- name: RestampConsent :exec
UPDATE accounts_consent SET granted_at = $2, channel = $3, policy_version = $4,
    updated_at = now() WHERE id = $1;

-- name: WithdrawConsent :exec
UPDATE accounts_consent SET withdrawn_at = $2, updated_at = now() WHERE id = $1;

-- name: TrustedDeviceForUpdate :one
SELECT * FROM accounts_trusteddevice WHERE account_id = $1 AND device_key = $2
LIMIT 1 FOR UPDATE;

-- name: InsertTrustedDevice :one
INSERT INTO accounts_trusteddevice (id, created_at, updated_at, device_key, label,
    user_agent, first_seen_at, last_seen_at, status, account_id)
VALUES ($1, now(), now(), $2, $3, $4, now(), now(), 'ACTIVE', $5)
RETURNING *;

-- name: TouchTrustedDevice :one
UPDATE accounts_trusteddevice SET last_seen_at = now(), user_agent = $2, updated_at = now()
WHERE id = $1 RETURNING *;
