-- Subscriptions + discounts (SubscriptionViewSet, DiscountViewSet, plan billing).

-- name: ListSubscriptionIDs :many
SELECT s.id FROM mobility_subscription s
WHERE (sqlc.arg(all_rows)::bool OR s.account_id = ANY(sqlc.arg(own)::uuid[]))
  AND (sqlc.narg(account)::uuid IS NULL OR s.account_id = sqlc.narg(account))
  AND (sqlc.narg(status)::text IS NULL OR s.status = sqlc.narg(status))
  AND (sqlc.narg(vehicle)::uuid IS NULL OR s.vehicle_id = sqlc.narg(vehicle))
  AND (sqlc.narg(plan)::uuid IS NULL OR s.plan_id = sqlc.narg(plan))
ORDER BY s.created_at DESC
LIMIT sqlc.arg(lim) OFFSET sqlc.arg(off);

-- name: CountSubscriptions :one
SELECT count(*) FROM mobility_subscription s
WHERE (sqlc.arg(all_rows)::bool OR s.account_id = ANY(sqlc.arg(own)::uuid[]))
  AND (sqlc.narg(account)::uuid IS NULL OR s.account_id = sqlc.narg(account))
  AND (sqlc.narg(status)::text IS NULL OR s.status = sqlc.narg(status))
  AND (sqlc.narg(vehicle)::uuid IS NULL OR s.vehicle_id = sqlc.narg(vehicle))
  AND (sqlc.narg(plan)::uuid IS NULL OR s.plan_id = sqlc.narg(plan));

-- name: SubscriptionRows :many
SELECT s.*, p.name AS plan_name, p.code AS plan_code, p.period AS plan_period, v.registration_plate AS vehicle_plate,
  a.display_name AS account_name, a.kura_id AS account_kura_id, a.owner_user_id
FROM mobility_subscription s JOIN mobility_plan p ON p.id = s.plan_id JOIN mobility_vehicle v ON v.id = s.vehicle_id
JOIN accounts_account a ON a.id = s.account_id
WHERE s.id = ANY(sqlc.arg(ids)::uuid[]);

-- name: SubscriptionForUpdate :one
SELECT * FROM mobility_subscription WHERE id = $1 FOR UPDATE;

-- name: SubscriptionByKey :one
SELECT * FROM mobility_subscription WHERE idempotency_key = $1;

-- name: ActiveSubscriptionForVehicle :one
SELECT * FROM mobility_subscription WHERE vehicle_id = $1 AND status = 'ACTIVE' LIMIT 1 FOR UPDATE;

-- name: InsertSubscription :exec
INSERT INTO mobility_subscription (id, created_at, updated_at, starts_at, ends_at, swaps_used, swaps_allowance, status,
  auto_renew, account_id, plan_id, vehicle_id, amount_kobo, discount_code, discount_kobo, idempotency_key,
  list_price_kobo, payment_id, queued_plan_id)
VALUES ($1, clock_timestamp(), clock_timestamp(), $2, $3, 0, $4, 'ACTIVE', $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NULL);

-- name: SaveSubscription :exec
UPDATE mobility_subscription SET plan_id = $2, queued_plan_id = $3, starts_at = $4, ends_at = $5, status = $6,
  swaps_used = $7, swaps_allowance = $8, payment_id = $9, list_price_kobo = $10, discount_kobo = $11,
  amount_kobo = $12, discount_code = $13, idempotency_key = $14, auto_renew = $15, updated_at = now()
WHERE id = $1;

-- name: PlanRow :one
SELECT * FROM mobility_plan WHERE id = $1;

-- name: DiscountByCode :one
SELECT * FROM mobility_discountcampaign WHERE code = $1;

-- name: DiscountByCodeForUpdate :one
SELECT * FROM mobility_discountcampaign WHERE code = $1 FOR UPDATE;

-- name: DiscountRedemptionByKey :one
SELECT r.*, d.code, d.value_type, d.value FROM mobility_discountredemption r
JOIN mobility_discountcampaign d ON d.id = r.discount_id WHERE r.idempotency_key = $1;

-- name: AccountRedemptionCount :one
SELECT count(*)::int FROM mobility_discountredemption WHERE discount_id = $1 AND account_id = $2;

-- name: BumpRedemptions :execrows
UPDATE mobility_discountcampaign SET redemptions_count = redemptions_count + 1, updated_at = now()
WHERE id = $1 AND (sqlc.narg(max_redemptions)::int IS NULL OR redemptions_count < sqlc.narg(max_redemptions));

-- name: InsertRedemption :exec
INSERT INTO mobility_discountredemption (id, created_at, updated_at, list_price_kobo, discount_kobo, due_kobo, channel,
  period, idempotency_key, account_id, discount_id, payment_id, subscription_id)
VALUES ($1, clock_timestamp(), clock_timestamp(), $2, $3, $4, $5, $6, $7, $8, $9, $10, $11);

-- name: ListDiscounts :many
SELECT * FROM mobility_discountcampaign
WHERE (sqlc.narg(search)::text IS NULL OR name ILIKE '%' || sqlc.narg(search) || '%' OR code ILIKE '%' || sqlc.narg(search) || '%')
  AND (sqlc.narg(status)::text IS NULL OR status = sqlc.narg(status))
  AND (sqlc.narg(audience)::text IS NULL OR audience = sqlc.narg(audience))
ORDER BY created_at DESC
LIMIT sqlc.arg(lim) OFFSET sqlc.arg(off);

-- name: CountDiscounts :one
SELECT count(*) FROM mobility_discountcampaign
WHERE (sqlc.narg(search)::text IS NULL OR name ILIKE '%' || sqlc.narg(search) || '%' OR code ILIKE '%' || sqlc.narg(search) || '%')
  AND (sqlc.narg(status)::text IS NULL OR status = sqlc.narg(status))
  AND (sqlc.narg(audience)::text IS NULL OR audience = sqlc.narg(audience));

-- name: DiscountByID :one
SELECT * FROM mobility_discountcampaign WHERE id = $1;

-- name: DiscountCodeTaken :one
SELECT EXISTS (SELECT 1 FROM mobility_discountcampaign WHERE code = $1 AND id <> sqlc.arg(exclude)::uuid);

-- name: InsertDiscount :exec
INSERT INTO mobility_discountcampaign (id, created_at, updated_at, name, code, value_type, value, status,
  applies_to_all_plans, plan_option_ids, periods, audience, fleet_min_vehicles, segment_id, channels, summary,
  max_redemptions, redemptions_count, max_per_account, starts_at, ends_at, created_by_id, approved_by_id)
VALUES ($1, clock_timestamp(), clock_timestamp(), $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, 0, $16,
  $17, $18, $19, NULL);

-- name: SaveDiscount :exec
UPDATE mobility_discountcampaign SET name = $2, code = $3, value_type = $4, value = $5, status = $6,
  applies_to_all_plans = $7, plan_option_ids = $8, periods = $9, audience = $10, fleet_min_vehicles = $11,
  segment_id = $12, channels = $13, summary = $14, max_redemptions = $15, max_per_account = $16, starts_at = $17,
  ends_at = $18, approved_by_id = $19, updated_at = now()
WHERE id = $1;

-- name: RedemptionsPage :many
SELECT r.*, a.display_name AS account_display_name, a.kura_id FROM mobility_discountredemption r
JOIN accounts_account a ON a.id = r.account_id
WHERE r.discount_id = sqlc.arg(discount_id) AND (sqlc.narg(account)::uuid IS NULL OR r.account_id = sqlc.narg(account))
  AND (sqlc.narg(after_at)::timestamptz IS NULL
       OR (sqlc.arg(back)::bool AND (r.created_at, r.id) > (sqlc.narg(after_at), sqlc.arg(after_id)::uuid))
       OR (NOT sqlc.arg(back)::bool AND (r.created_at, r.id) < (sqlc.narg(after_at), sqlc.arg(after_id)::uuid)))
ORDER BY CASE WHEN sqlc.arg(back)::bool THEN r.created_at END, CASE WHEN sqlc.arg(back)::bool THEN r.id END,
  r.created_at DESC, r.id DESC
LIMIT sqlc.arg(lim);

-- name: NewestOwnedAccount :one
-- user.accounts.first(): Account's default ordering is -created_at.
SELECT * FROM accounts_account WHERE owner_user_id = $1 ORDER BY created_at DESC LIMIT 1;
