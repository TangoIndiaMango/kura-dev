-- Shifts + cash deposits (ShiftViewSet, CashDepositViewSet, ShiftService, CashDepositService).

-- name: ShiftIDs :many
-- ShiftViewSet: hub scope, ShiftFilter (a window belongs to every day it overlaps), ordering -opened_at.
SELECT s.id FROM operations_shift s
WHERE (sqlc.arg(all_hubs)::bool OR s.hub_id = ANY(sqlc.arg(hubs)::uuid[]))
  AND (sqlc.narg(status)::text IS NULL OR s.status = sqlc.narg(status))
  AND (sqlc.narg(hub)::uuid IS NULL OR s.hub_id = sqlc.narg(hub))
  AND (sqlc.narg(agent)::uuid IS NULL OR s.agent_id = sqlc.narg(agent))
  AND (sqlc.narg(from_at)::timestamptz IS NULL OR s.closed_at IS NULL OR s.closed_at >= sqlc.narg(from_at))
  AND (sqlc.narg(to_at)::timestamptz IS NULL OR s.opened_at < sqlc.narg(to_at))
ORDER BY
  CASE WHEN sqlc.arg(ord)::text = 'opened_at' THEN s.opened_at END,
  CASE WHEN sqlc.arg(ord)::text = '-closed_at' THEN s.closed_at END DESC NULLS FIRST,
  CASE WHEN sqlc.arg(ord)::text = 'closed_at' THEN s.closed_at END NULLS LAST,
  s.opened_at DESC
LIMIT sqlc.arg(lim) OFFSET sqlc.arg(off);

-- name: CountShifts :one
SELECT count(*) FROM operations_shift s
WHERE (sqlc.arg(all_hubs)::bool OR s.hub_id = ANY(sqlc.arg(hubs)::uuid[]))
  AND (sqlc.narg(status)::text IS NULL OR s.status = sqlc.narg(status))
  AND (sqlc.narg(hub)::uuid IS NULL OR s.hub_id = sqlc.narg(hub))
  AND (sqlc.narg(agent)::uuid IS NULL OR s.agent_id = sqlc.narg(agent))
  AND (sqlc.narg(from_at)::timestamptz IS NULL OR s.closed_at IS NULL OR s.closed_at >= sqlc.narg(from_at))
  AND (sqlc.narg(to_at)::timestamptz IS NULL OR s.opened_at < sqlc.narg(to_at));

-- name: ShiftRows :many
SELECT s.*, u.first_name AS agent_first, u.last_name AS agent_last, u.email AS agent_email, u.phone AS agent_phone,
  h.code AS hub_code, h.name AS hub_name,
  (SELECT COALESCE(sum(d.amount_kobo), 0) FROM operations_cashdeposit d
   WHERE d.shift_id = s.id AND d.status = 'SUCCESS')::bigint AS collected_cash_kobo
FROM operations_shift s
JOIN accounts_user u ON u.id = s.agent_id
JOIN mobility_hub h ON h.id = s.hub_id
WHERE s.id = ANY(sqlc.arg(ids)::uuid[]);

-- name: ShiftDepositIDs :many
SELECT id FROM operations_cashdeposit WHERE shift_id = $1 ORDER BY created_at DESC;

-- name: OpenShiftForUpdate :one
SELECT * FROM operations_shift WHERE agent_id = $1 AND hub_id = $2 AND status = 'OPEN' LIMIT 1 FOR UPDATE;

-- name: LatestOpenShift :one
SELECT * FROM operations_shift WHERE agent_id = $1 AND hub_id = $2 AND status = 'OPEN' ORDER BY opened_at DESC LIMIT 1;

-- name: InsertShift :exec
INSERT INTO operations_shift (id, created_at, updated_at, opened_at, opening_cash_kobo, status, agent_id, hub_id,
  lodge_ref, auto_closed)
VALUES ($1, clock_timestamp(), clock_timestamp(), clock_timestamp(), $2, 'OPEN', $3, $4, '', false);

-- name: ShiftForUpdate :one
SELECT * FROM operations_shift WHERE id = $1 FOR UPDATE;

-- name: OpenShiftByIDForUpdate :one
SELECT * FROM operations_shift WHERE id = $1 AND status = 'OPEN' FOR UPDATE;

-- name: ShiftByID :one
SELECT * FROM operations_shift WHERE id = $1;

-- name: SaveShiftClose :exec
UPDATE operations_shift SET closing_cash_kobo = $2, expected_cash_kobo = $3, variance_kobo = $4, closed_at = $5,
  status = 'CLOSED', updated_at = now() WHERE id = $1;

-- name: SaveShiftLodge :exec
UPDATE operations_shift SET lodge_ref = $2, lodged_amount_kobo = $3, lodged_at = now(), updated_at = now() WHERE id = $1;

-- name: ShiftDepositTotal :one
SELECT COALESCE(sum(amount_kobo), 0)::bigint FROM operations_cashdeposit WHERE shift_id = $1 AND status = 'SUCCESS';

-- name: AgentFloatOutstanding :one
SELECT COALESCE(sum(d.amount_kobo), 0)::bigint FROM operations_cashdeposit d
JOIN operations_shift s ON s.id = d.shift_id
WHERE d.agent_id = $1 AND d.status = 'SUCCESS' AND s.status = 'OPEN';

-- name: DepositsPage :many
-- CashDepositViewSet: finance:read / shifts:manage see all, others their owned accounts; keyset newest first.
SELECT d.id FROM operations_cashdeposit d
JOIN accounts_account a ON a.id = d.account_id
WHERE (sqlc.arg(all_rows)::bool OR a.owner_user_id = sqlc.arg(owner)::uuid)
  AND (sqlc.narg(status)::text IS NULL OR d.status = sqlc.narg(status))
  AND (sqlc.narg(hub)::uuid IS NULL OR d.hub_id = sqlc.narg(hub))
  AND (sqlc.narg(shift)::uuid IS NULL OR d.shift_id = sqlc.narg(shift))
  AND (sqlc.narg(agent)::uuid IS NULL OR d.agent_id = sqlc.narg(agent))
  AND (sqlc.narg(q)::text IS NULL OR d.receipt_code ILIKE '%' || sqlc.narg(q) || '%' OR a.kura_id ILIKE '%' || sqlc.narg(q) || '%')
  AND (sqlc.narg(after_at)::timestamptz IS NULL
       OR (sqlc.arg(back)::bool AND (d.created_at, d.id) > (sqlc.narg(after_at), sqlc.arg(after_id)::uuid))
       OR (NOT sqlc.arg(back)::bool AND (d.created_at, d.id) < (sqlc.narg(after_at), sqlc.arg(after_id)::uuid)))
ORDER BY CASE WHEN sqlc.arg(back)::bool THEN d.created_at END, CASE WHEN sqlc.arg(back)::bool THEN d.id END,
  d.created_at DESC, d.id DESC
LIMIT sqlc.arg(lim);

-- name: DepositRows :many
SELECT d.*, h.code AS hub_code, h.name AS hub_name, a.kura_id AS account_kura_id, a.owner_user_id
FROM operations_cashdeposit d
JOIN mobility_hub h ON h.id = d.hub_id
JOIN accounts_account a ON a.id = d.account_id
WHERE d.id = ANY(sqlc.arg(ids)::uuid[]);

-- name: DepositByIdempotency :one
SELECT * FROM operations_cashdeposit WHERE idempotency_key = $1;

-- name: InsertDeposit :exec
INSERT INTO operations_cashdeposit (id, created_at, updated_at, amount_kobo, psp_agent_ref, receipt_code, status,
  account_id, agent_id, hub_id, payment_id, shift_id, idempotency_key, purpose)
VALUES ($1, clock_timestamp(), clock_timestamp(), $2, $3, $4, 'SUCCESS', $5, $6, $7, $8, $9, $10, $11);

-- name: UserExists :one
SELECT EXISTS (SELECT 1 FROM accounts_user WHERE id = $1);

-- name: ShiftExists :one
SELECT EXISTS (SELECT 1 FROM operations_shift WHERE id = $1);

-- name: CashDepositReceipt :one
SELECT d.*, h.code AS hub_code, h.name AS hub_name, a.kura_id AS account_kura_id,
  o.id AS owner_id, o.first_name AS owner_first, o.last_name AS owner_last, o.email AS owner_email, o.phone AS owner_phone,
  ag.first_name AS agent_first, ag.last_name AS agent_last, ag.email AS agent_email, ag.phone AS agent_phone
FROM operations_cashdeposit d
JOIN mobility_hub h ON h.id = d.hub_id
JOIN accounts_account a ON a.id = d.account_id
LEFT JOIN accounts_user o ON o.id = a.owner_user_id
JOIN accounts_user ag ON ag.id = d.agent_id
WHERE d.id = $1;

-- name: CashDepositByID :one
SELECT * FROM operations_cashdeposit WHERE id = $1;

-- name: HubRow :one
SELECT * FROM mobility_hub WHERE id = $1;
