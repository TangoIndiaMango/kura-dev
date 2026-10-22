-- PSP webhook events (integrations.PspWebhookEvent).

-- name: InsertPspEvent :exec
INSERT INTO integrations_pspwebhookevent (id, created_at, updated_at, psp, psp_event_id, event_kind, payload, status, error)
VALUES ($1, clock_timestamp(), clock_timestamp(), $2, $3, $4, $5, 'RECEIVED', '');

-- name: PspEventByKey :one
SELECT * FROM integrations_pspwebhookevent WHERE psp = $1 AND psp_event_id = $2;

-- name: PspEventByID :one
SELECT * FROM integrations_pspwebhookevent WHERE id = $1;

-- name: SetPspEventStatus :exec
UPDATE integrations_pspwebhookevent SET status = $2, error = $3, updated_at = now() WHERE id = $1;

-- name: VAAccountByNuban :one
SELECT account_id FROM finance_virtualaccount WHERE nuban = $1 ORDER BY created_at DESC LIMIT 1;

-- name: VAAccountByReference :one
SELECT account_id FROM finance_virtualaccount WHERE psp_reference = $1 ORDER BY created_at DESC LIMIT 1;

-- name: PspEventsPage :many
SELECT * FROM integrations_pspwebhookevent
WHERE (sqlc.narg(psp)::text IS NULL OR psp = sqlc.narg(psp))
  AND (sqlc.narg(status)::text IS NULL OR status = sqlc.narg(status))
  AND (sqlc.narg(event_kind)::text IS NULL OR event_kind = sqlc.narg(event_kind))
  AND (sqlc.narg(after_at)::timestamptz IS NULL
       OR (sqlc.arg(back)::bool AND (created_at, id) > (sqlc.narg(after_at), sqlc.arg(after_id)::uuid))
       OR (NOT sqlc.arg(back)::bool AND (created_at, id) < (sqlc.narg(after_at), sqlc.arg(after_id)::uuid)))
ORDER BY CASE WHEN sqlc.arg(back)::bool THEN created_at END, CASE WHEN sqlc.arg(back)::bool THEN id END,
  created_at DESC, id DESC
LIMIT sqlc.arg(lim);
