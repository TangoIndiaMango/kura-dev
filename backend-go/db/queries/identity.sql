-- Identity / KYC writes (IdentityService, identity_review, identity_withdraw)
-- and AccountService.complete_profile.

-- name: IdentityDocByTypeForUpdate :one
SELECT * FROM accounts_identitydocument WHERE account_id = $1 AND doc_type = $2
ORDER BY created_at DESC LIMIT 1 FOR UPDATE;

-- name: LatestIdentityDocForUpdate :one
SELECT * FROM accounts_identitydocument WHERE account_id = $1
ORDER BY created_at DESC LIMIT 1 FOR UPDATE;

-- name: InsertIdentityDoc :exec
INSERT INTO accounts_identitydocument (id, created_at, updated_at, doc_type, number_encrypted, number_last4,
  status, verified_via, verified_at, reject_reason, account_id, back_image_id, front_image_id,
  photos_requested, request_note)
VALUES ($1, now(), now(), $2, $3, $4, 'PENDING', '', NULL, '', $5, $6, $7, false, '');

-- name: ResubmitIdentityDoc :exec
-- A resubmit resets review state: PENDING, no verification, no requests.
UPDATE accounts_identitydocument SET doc_type = $2, number_encrypted = $3, number_last4 = $4,
  front_image_id = $5, back_image_id = $6, status = 'PENDING', verified_via = '', verified_at = NULL,
  reject_reason = '', photos_requested = false, request_note = '', updated_at = now()
WHERE id = $1;

-- name: SetIdentityDocPhotos :exec
UPDATE accounts_identitydocument SET front_image_id = $2, back_image_id = $3, photos_requested = false,
  request_note = '', updated_at = now()
WHERE id = $1;

-- name: SetIdentityDocReview :exec
UPDATE accounts_identitydocument SET status = $2, verified_via = $3, verified_at = $4, reject_reason = $5,
  photos_requested = false, request_note = '', updated_at = now()
WHERE id = $1;

-- name: SetIdentityDocPhotoRequest :exec
UPDATE accounts_identitydocument SET photos_requested = true, request_note = $2, updated_at = now()
WHERE id = $1;

-- name: DeleteIdentityDocs :execrows
DELETE FROM accounts_identitydocument WHERE account_id = $1;

-- name: DriverRowByUser :one
SELECT * FROM accounts_driver WHERE user_id = $1;

-- name: FirstDriverRow :one
SELECT * FROM accounts_driver WHERE account_id = $1 ORDER BY created_at LIMIT 1;

-- name: InsertDriverRow :one
INSERT INTO accounts_driver (id, created_at, updated_at, license_number, status, account_id, user_id,
  photo_id, daily_spend_kobo_limit, daily_swap_limit)
VALUES ($1, now(), now(), '', 'ACTIVE', $2, $3, NULL, NULL, NULL)
RETURNING *;

-- name: SetDriverPhotoAccount :exec
UPDATE accounts_driver SET photo_id = $2, account_id = $3, updated_at = now() WHERE id = $1;

-- name: SetDriverPhoto :exec
UPDATE accounts_driver SET photo_id = $2, updated_at = now() WHERE id = $1;

-- name: FirstOwnedAccountForUpdate :one
SELECT * FROM accounts_account WHERE owner_user_id = $1 ORDER BY created_at LIMIT 1 FOR UPDATE;

-- name: InsertAccount :one
INSERT INTO accounts_account (id, created_at, updated_at, kura_id, kind, display_name, status, kyc_status,
  registration_channel, psp, cooperative_id, owner_user_id, risk_status)
VALUES ($1, now(), now(), $2, $3, $4, $5, $6, $7, '', $8, $9, 'NORMAL')
RETURNING *;

-- name: SetAccountDisplayName :exec
UPDATE accounts_account SET display_name = $2, updated_at = now() WHERE id = $1;

-- name: SetUserNamesStep :exec
UPDATE accounts_user SET first_name = $2, last_name = $3, onboarding_step = $4, updated_at = now()
WHERE id = $1;

-- name: SetUserOnboardingStep :exec
UPDATE accounts_user SET onboarding_step = $2, updated_at = now() WHERE id = $1;

-- name: IdentityDocByID :one
SELECT * FROM accounts_identitydocument WHERE id = $1;
