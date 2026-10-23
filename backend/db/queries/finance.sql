-- Finance reads (PaymentViewSet, WalletViewSet, LedgerTransactionViewSet).

-- name: PaymentsPage :many
-- payments_for scope + PaymentFilter; cursor on (created_at, id) newest first.
SELECT p.*, a.kura_id AS account_kura_id, a.display_name AS account_name, a.owner_user_id, h.code AS hub_code
FROM finance_payment p JOIN accounts_account a ON a.id = p.account_id LEFT JOIN mobility_hub h ON h.id = p.hub_id
WHERE (sqlc.arg(all_rows)::bool OR p.account_id = ANY(sqlc.arg(own)::uuid[]))
  AND (sqlc.narg(account)::uuid IS NULL OR p.account_id = sqlc.narg(account))
  AND (sqlc.narg(status)::text IS NULL OR p.status = sqlc.narg(status))
  AND (sqlc.narg(channel)::text IS NULL OR p.channel = sqlc.narg(channel))
  AND (sqlc.narg(purpose)::text IS NULL OR p.purpose = sqlc.narg(purpose))
  AND (sqlc.narg(hub)::uuid IS NULL OR p.hub_id = sqlc.narg(hub))
  AND (sqlc.narg(q)::text IS NULL OR p.receipt_code ILIKE '%' || sqlc.narg(q) || '%'
       OR a.display_name ILIKE '%' || sqlc.narg(q) || '%' OR a.kura_id ILIKE '%' || sqlc.narg(q) || '%')
  AND (sqlc.narg(from_at)::timestamptz IS NULL OR p.created_at >= sqlc.narg(from_at))
  AND (sqlc.narg(to_at)::timestamptz IS NULL OR p.created_at < sqlc.narg(to_at))
  AND (sqlc.narg(after_at)::timestamptz IS NULL
       OR (sqlc.arg(back)::bool AND (p.created_at, p.id) > (sqlc.narg(after_at), sqlc.arg(after_id)::uuid))
       OR (NOT sqlc.arg(back)::bool AND (p.created_at, p.id) < (sqlc.narg(after_at), sqlc.arg(after_id)::uuid)))
ORDER BY CASE WHEN sqlc.arg(back)::bool THEN p.created_at END, CASE WHEN sqlc.arg(back)::bool THEN p.id END,
  p.created_at DESC, p.id DESC
LIMIT sqlc.arg(lim);

-- name: PaymentStats :one
SELECT COALESCE(sum(p.amount_kobo) FILTER (WHERE p.status = 'SUCCESS'), 0)::bigint AS success_kobo,
  count(*) FILTER (WHERE p.status = 'SUCCESS')::int AS success,
  count(*) FILTER (WHERE p.status = 'PENDING')::int AS pending,
  count(*) FILTER (WHERE p.status = 'FAILED')::int AS failed
FROM finance_payment p JOIN accounts_account a ON a.id = p.account_id
WHERE (sqlc.arg(all_rows)::bool OR p.account_id = ANY(sqlc.arg(own)::uuid[]))
  AND (sqlc.narg(account)::uuid IS NULL OR p.account_id = sqlc.narg(account))
  AND (sqlc.narg(status)::text IS NULL OR p.status = sqlc.narg(status))
  AND (sqlc.narg(channel)::text IS NULL OR p.channel = sqlc.narg(channel))
  AND (sqlc.narg(purpose)::text IS NULL OR p.purpose = sqlc.narg(purpose))
  AND (sqlc.narg(hub)::uuid IS NULL OR p.hub_id = sqlc.narg(hub))
  AND (sqlc.narg(q)::text IS NULL OR p.receipt_code ILIKE '%' || sqlc.narg(q) || '%'
       OR a.display_name ILIKE '%' || sqlc.narg(q) || '%' OR a.kura_id ILIKE '%' || sqlc.narg(q) || '%')
  AND (sqlc.narg(from_at)::timestamptz IS NULL OR p.created_at >= sqlc.narg(from_at))
  AND (sqlc.narg(to_at)::timestamptz IS NULL OR p.created_at < sqlc.narg(to_at));

-- name: PaymentChannelTotals :many
SELECT p.channel, count(*)::int AS n, COALESCE(sum(p.amount_kobo), 0)::bigint AS total
FROM finance_payment p JOIN accounts_account a ON a.id = p.account_id
WHERE p.status = 'SUCCESS'
  AND (sqlc.arg(all_rows)::bool OR p.account_id = ANY(sqlc.arg(own)::uuid[]))
  AND (sqlc.narg(account)::uuid IS NULL OR p.account_id = sqlc.narg(account))
  AND (sqlc.narg(status)::text IS NULL OR p.status = sqlc.narg(status))
  AND (sqlc.narg(channel)::text IS NULL OR p.channel = sqlc.narg(channel))
  AND (sqlc.narg(purpose)::text IS NULL OR p.purpose = sqlc.narg(purpose))
  AND (sqlc.narg(hub)::uuid IS NULL OR p.hub_id = sqlc.narg(hub))
  AND (sqlc.narg(q)::text IS NULL OR p.receipt_code ILIKE '%' || sqlc.narg(q) || '%'
       OR a.display_name ILIKE '%' || sqlc.narg(q) || '%' OR a.kura_id ILIKE '%' || sqlc.narg(q) || '%')
  AND (sqlc.narg(from_at)::timestamptz IS NULL OR p.created_at >= sqlc.narg(from_at))
  AND (sqlc.narg(to_at)::timestamptz IS NULL OR p.created_at < sqlc.narg(to_at))
GROUP BY p.channel ORDER BY 3 DESC;

-- name: StatementRows :many
-- statement_rows: the same joins as Django's select_related so rows tied on
-- created_at come back in the same order; swaps are fetched separately.
SELECT p.*, a.kura_id AS account_kura_id, a.display_name AS account_name, h.code AS hub_code
FROM finance_payment p INNER JOIN accounts_account a ON p.account_id = a.id LEFT OUTER JOIN mobility_hub h ON p.hub_id = h.id
WHERE (sqlc.arg(all_rows)::bool OR p.account_id = ANY(sqlc.arg(own)::uuid[]))
  AND (sqlc.narg(account)::uuid IS NULL OR p.account_id = sqlc.narg(account))
  AND (sqlc.narg(status)::text IS NULL OR p.status = sqlc.narg(status))
  AND (sqlc.narg(channel)::text IS NULL OR p.channel = sqlc.narg(channel))
  AND (sqlc.narg(purpose)::text IS NULL OR p.purpose = sqlc.narg(purpose))
  AND (sqlc.narg(hub)::uuid IS NULL OR p.hub_id = sqlc.narg(hub))
  AND (sqlc.narg(q)::text IS NULL OR p.receipt_code ILIKE '%' || sqlc.narg(q) || '%'
       OR a.display_name ILIKE '%' || sqlc.narg(q) || '%' OR a.kura_id ILIKE '%' || sqlc.narg(q) || '%')
  AND (sqlc.narg(from_at)::timestamptz IS NULL OR p.created_at >= sqlc.narg(from_at))
  AND (sqlc.narg(to_at)::timestamptz IS NULL OR p.created_at < sqlc.narg(to_at))
ORDER BY p.created_at ASC
LIMIT sqlc.arg(lim);

-- name: SwapsForPayments :many
SELECT s.payment_id, v.registration_plate AS plate, u.first_name AS agent_first, u.last_name AS agent_last
FROM mobility_swap s JOIN mobility_vehicle v ON v.id = s.vehicle_id LEFT JOIN accounts_user u ON u.id = s.agent_id
WHERE s.payment_id = ANY(sqlc.arg(ids)::uuid[]);

-- name: PaymentByID :one
SELECT p.*, a.kura_id AS account_kura_id, a.display_name AS account_name, a.owner_user_id, h.code AS hub_code
FROM finance_payment p JOIN accounts_account a ON a.id = p.account_id LEFT JOIN mobility_hub h ON h.id = p.hub_id
WHERE p.id = $1;

-- name: ReceiptSwap :one
-- _swap_for_payment: newest swap paid by this payment, with pack details.
SELECT s.id, s.reservation_id, s.agent_id, s.returned_battery_id, s.issued_battery_id, s.returned_charge_pct,
  s.issued_charge_pct, h.code AS hub_code, h.name AS hub_name, v.registration_plate,
  au.first_name AS agent_first, au.last_name AS agent_last, au.email AS agent_email, au.phone AS agent_phone,
  rb.serial AS returned_serial, ib.serial AS issued_serial, it.name AS issued_type
FROM mobility_swap s JOIN mobility_hub h ON h.id = s.hub_id JOIN mobility_vehicle v ON v.id = s.vehicle_id
LEFT JOIN accounts_user au ON au.id = s.agent_id
LEFT JOIN mobility_battery rb ON rb.id = s.returned_battery_id
LEFT JOIN mobility_battery ib ON ib.id = s.issued_battery_id
LEFT JOIN mobility_batterytype it ON it.id = ib.battery_type_id
WHERE s.payment_id = $1 ORDER BY s.created_at DESC LIMIT 1;

-- name: RedemptionForPayment :one
SELECT r.list_price_kobo, r.discount_kobo, d.code FROM mobility_discountredemption r
JOIN mobility_discountcampaign d ON d.id = r.discount_id
WHERE r.payment_id = $1 LIMIT 1;

-- name: RedemptionByKey :one
SELECT r.list_price_kobo, r.discount_kobo, d.code FROM mobility_discountredemption r
JOIN mobility_discountcampaign d ON d.id = r.discount_id
WHERE r.idempotency_key = $1 LIMIT 1;

-- name: ListWallets :many
SELECT w.* FROM finance_wallet w
WHERE (sqlc.arg(all_rows)::bool OR w.account_id = ANY(sqlc.arg(own)::uuid[]))
  AND (sqlc.narg(account)::uuid IS NULL OR w.account_id = sqlc.narg(account))
  AND (sqlc.narg(status)::text IS NULL OR w.status = sqlc.narg(status))
ORDER BY w.created_at DESC
LIMIT sqlc.arg(lim) OFFSET sqlc.arg(off);

-- name: CountWallets :one
SELECT count(*) FROM finance_wallet w
WHERE (sqlc.arg(all_rows)::bool OR w.account_id = ANY(sqlc.arg(own)::uuid[]))
  AND (sqlc.narg(account)::uuid IS NULL OR w.account_id = sqlc.narg(account))
  AND (sqlc.narg(status)::text IS NULL OR w.status = sqlc.narg(status));

-- name: WalletByID :one
SELECT w.*, a.owner_user_id FROM finance_wallet w JOIN accounts_account a ON a.id = w.account_id WHERE w.id = $1;

-- name: WalletByAccount :one
SELECT * FROM finance_wallet WHERE account_id = $1;

-- name: VirtualAccountFull :one
SELECT * FROM finance_virtualaccount WHERE account_id = $1;

-- name: LedgerPage :many
SELECT * FROM finance_ledgertransaction t
WHERE sqlc.narg(after_at)::timestamptz IS NULL
   OR (sqlc.arg(back)::bool AND (t.created_at, t.id) > (sqlc.narg(after_at), sqlc.arg(after_id)::uuid))
   OR (NOT sqlc.arg(back)::bool AND (t.created_at, t.id) < (sqlc.narg(after_at), sqlc.arg(after_id)::uuid))
ORDER BY CASE WHEN sqlc.arg(back)::bool THEN t.created_at END, CASE WHEN sqlc.arg(back)::bool THEN t.id END,
  t.created_at DESC, t.id DESC
LIMIT sqlc.arg(lim);

-- name: LedgerTxByID :one
SELECT * FROM finance_ledgertransaction WHERE id = $1;

-- name: LedgerEntriesFor :many
-- LedgerEntry inherits BaseModel ordering (-created_at).
SELECT e.id, e.transaction_id, e.debit_kobo, e.credit_kobo, a.code, a.account_type
FROM finance_ledgerentry e JOIN finance_ledgeraccount a ON a.id = e.ledger_account_id
WHERE e.transaction_id = ANY(sqlc.arg(ids)::uuid[])
ORDER BY e.created_at DESC;
