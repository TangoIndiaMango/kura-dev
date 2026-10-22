-- name: GetUserByID :one
SELECT u.*, r.code AS assigned_role_code, r.name AS assigned_role_name
FROM accounts_user u
LEFT JOIN accounts_role r ON r.id = u.assigned_role_id
WHERE u.id = $1;

-- name: GetUserByIDForUpdate :one
SELECT * FROM accounts_user WHERE id = $1 FOR UPDATE;

-- name: GetUserByEmail :one
-- Django email__iexact.
SELECT * FROM accounts_user WHERE upper(email) = upper(sqlc.arg(email)::text) LIMIT 1;

-- name: GetUserByPhone :one
SELECT * FROM accounts_user WHERE phone = $1 LIMIT 1;

-- name: HubIDsForUser :many
SELECT hub_id FROM accounts_staffmembership
WHERE user_id = $1 AND hub_id <> '' AND hub_id <> '*'
ORDER BY created_at;

-- name: TouchLastLogin :one
UPDATE accounts_user SET last_login = now(), updated_at = now()
WHERE id = $1 RETURNING last_login;

-- name: FirstAccountDisplayName :one
SELECT display_name FROM accounts_account
WHERE owner_user_id = $1 ORDER BY created_at LIMIT 1;

-- name: SetPinFailure :exec
UPDATE accounts_user
SET pin_failed_attempts = $2, pin_locked_until = $3, updated_at = now()
WHERE id = $1;

-- name: ClearPinFailures :exec
UPDATE accounts_user
SET pin_failed_attempts = 0, pin_locked_until = NULL, updated_at = now()
WHERE id = $1;

-- name: SetPin :exec
UPDATE accounts_user
SET pin_hash = $2, pin_failed_attempts = 0, pin_locked_until = NULL,
    onboarding_step = $3, session_version = $4, updated_at = now()
WHERE id = $1;

-- name: SetOnboardingStep :exec
UPDATE accounts_user SET onboarding_step = $2, updated_at = now() WHERE id = $1;

-- name: PublicIDTaken :one
SELECT EXISTS (SELECT 1 FROM accounts_user WHERE public_id = $1);

-- name: InsertOperatorUser :exec
INSERT INTO accounts_user (id, created_at, updated_at, password, is_superuser, phone,
    first_name, last_name, role, pin_hash, is_active, is_staff, pin_failed_attempts,
    onboarding_step, public_id, notification_prefs, session_version)
VALUES ($1, now(), now(), '!', false, $2, '', '', 'DRIVER', '', true, false, 0,
    'pin', $3, '{}'::jsonb, 0);

-- name: InsertIndividualAccount :one
INSERT INTO accounts_account (id, created_at, updated_at, kura_id, kind, display_name,
    status, kyc_status, owner_user_id, registration_channel, psp, risk_status)
VALUES ($1, now(), now(), $2, 'INDIVIDUAL', $3, 'ACTIVE', 'NONE', $4, $5, '', 'NORMAL')
RETURNING id;

-- name: InsertDriver :exec
INSERT INTO accounts_driver (id, created_at, updated_at, license_number, status,
    account_id, user_id)
VALUES ($1, now(), now(), '', 'ACTIVE', $2, $3);

-- name: FirstAccountForOwner :one
SELECT id, kura_id, display_name FROM accounts_account
WHERE owner_user_id = $1 ORDER BY created_at LIMIT 1;
