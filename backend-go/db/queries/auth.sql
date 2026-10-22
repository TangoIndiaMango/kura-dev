-- name: LatestOpenOTP :one
SELECT * FROM accounts_otpchallenge
WHERE phone = $1 AND purpose = $2 AND consumed_at IS NULL
ORDER BY created_at DESC LIMIT 1;

-- name: LatestOpenOTPForUpdate :one
SELECT * FROM accounts_otpchallenge
WHERE phone = $1 AND purpose = $2 AND consumed_at IS NULL
ORDER BY created_at DESC LIMIT 1
FOR UPDATE;

-- name: InsertOTP :exec
INSERT INTO accounts_otpchallenge (id, created_at, updated_at, phone, purpose,
    code_hash, expires_at, attempts, device_id, channel)
VALUES ($1, now(), now(), $2, $3, $4, $5, 0, $6, $7);

-- name: ConsumeOTP :exec
UPDATE accounts_otpchallenge SET consumed_at = now(), updated_at = now() WHERE id = $1;

-- name: BumpOTPAttempts :one
UPDATE accounts_otpchallenge SET attempts = attempts + 1, updated_at = now()
WHERE id = $1 RETURNING attempts;

-- name: OutstandToken :one
-- simplejwt OutstandingToken.get_or_create(jti=...).
INSERT INTO token_blacklist_outstandingtoken (token, created_at, expires_at, user_id, jti)
VALUES ($1, now(), $2, $3, $4)
ON CONFLICT (jti) DO UPDATE SET jti = EXCLUDED.jti
RETURNING id;

-- name: IsBlacklisted :one
SELECT EXISTS (
    SELECT 1 FROM token_blacklist_blacklistedtoken b
    JOIN token_blacklist_outstandingtoken o ON o.id = b.token_id
    WHERE o.jti = $1
);

-- name: BlacklistToken :exec
INSERT INTO token_blacklist_blacklistedtoken (blacklisted_at, token_id)
VALUES (now(), $1)
ON CONFLICT (token_id) DO NOTHING;
