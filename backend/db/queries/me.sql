-- name: DriverForUser :one
SELECT d.id, d.account_id, d.photo_id
FROM accounts_driver d WHERE d.user_id = $1 LIMIT 1;

-- name: AccountByID :one
SELECT * FROM accounts_account WHERE id = $1;

-- name: FirstOwnedAccount :one
SELECT * FROM accounts_account WHERE owner_user_id = $1 ORDER BY created_at LIMIT 1;

-- name: FirstDriverForAccount :one
SELECT id, account_id, photo_id FROM accounts_driver
WHERE account_id = $1 ORDER BY created_at LIMIT 1;

-- name: LatestIdentityDoc :one
SELECT * FROM accounts_identitydocument
WHERE account_id = $1 ORDER BY created_at DESC LIMIT 1;

-- name: VirtualAccountFor :one
SELECT status, nuban FROM finance_virtualaccount WHERE account_id = $1;

-- name: ConsentRows :many
SELECT purpose, granted_at, withdrawn_at, channel, policy_version
FROM accounts_consent WHERE account_id = $1 ORDER BY granted_at DESC;

-- name: MediaAssetByID :one
SELECT provider, storage_key, resource_type, visibility FROM core_mediaasset WHERE id = $1;
