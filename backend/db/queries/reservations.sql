-- Reservations (bay holds): ReservationViewSet + ReservationService.

-- name: ReservationsPage :many
SELECT r.id FROM mobility_reservation r
WHERE (sqlc.arg(all_rows)::bool
       OR (sqlc.arg(hub_scoped)::bool AND r.hub_id = ANY(sqlc.arg(hubs)::uuid[]))
       OR (NOT sqlc.arg(hub_scoped)::bool AND r.account_id = ANY(sqlc.arg(own)::uuid[])))
  AND (sqlc.narg(account)::uuid IS NULL OR r.account_id = sqlc.narg(account))
  AND (sqlc.narg(status)::text IS NULL
       OR (sqlc.narg(status) = 'ACTIVE' AND r.status IN ('PENDING', 'CONFIRMED') AND r.expires_at > now())
       OR (sqlc.narg(status) = 'EXPIRED' AND (r.status = 'EXPIRED' OR (r.status IN ('PENDING', 'CONFIRMED') AND r.expires_at <= now())))
       OR (sqlc.narg(status) NOT IN ('ACTIVE', 'EXPIRED') AND r.status = sqlc.narg(status)))
  AND (sqlc.narg(payment_mode)::text IS NULL OR r.payment_mode = sqlc.narg(payment_mode))
  AND (sqlc.narg(hub)::uuid IS NULL OR r.hub_id = sqlc.narg(hub))
  AND (sqlc.narg(vehicle)::uuid IS NULL OR r.vehicle_id = sqlc.narg(vehicle))
  AND (sqlc.narg(code)::text IS NULL OR r.code = sqlc.narg(code))
  AND (sqlc.narg(from_at)::timestamptz IS NULL OR r.created_at >= sqlc.narg(from_at))
  AND (sqlc.narg(to_at)::timestamptz IS NULL OR r.created_at < sqlc.narg(to_at))
  AND (sqlc.narg(after_at)::timestamptz IS NULL
       OR (sqlc.arg(back)::bool AND (r.created_at, r.id) > (sqlc.narg(after_at), sqlc.arg(after_id)::uuid))
       OR (NOT sqlc.arg(back)::bool AND (r.created_at, r.id) < (sqlc.narg(after_at), sqlc.arg(after_id)::uuid)))
ORDER BY CASE WHEN sqlc.arg(back)::bool THEN r.created_at END, CASE WHEN sqlc.arg(back)::bool THEN r.id END,
  r.created_at DESC, r.id DESC
LIMIT sqlc.arg(lim);

-- name: ReservationRows :many
SELECT r.*, h.name AS hub_name, h.code AS hub_code, v.registration_plate AS vehicle_plate,
  u.first_name AS driver_first, a.owner_user_id
FROM mobility_reservation r
JOIN mobility_hub h ON h.id = r.hub_id
JOIN mobility_vehicle v ON v.id = r.vehicle_id
JOIN accounts_driver d ON d.id = r.driver_id
JOIN accounts_user u ON u.id = d.user_id
JOIN accounts_account a ON a.id = r.account_id
WHERE r.id = ANY(sqlc.arg(ids)::uuid[]);

-- name: ReservationByID :one
SELECT * FROM mobility_reservation WHERE id = $1;

-- name: ReservationForUpdate :one
SELECT * FROM mobility_reservation WHERE id = $1 FOR UPDATE;

-- name: LiveReservationForVehicle :one
SELECT * FROM mobility_reservation WHERE vehicle_id = $1 AND status IN ('PENDING', 'CONFIRMED') AND expires_at > now()
ORDER BY id LIMIT 1 FOR UPDATE;

-- name: ReservationByCode :one
SELECT * FROM mobility_reservation WHERE upper(code) = upper($1) ORDER BY created_at DESC LIMIT 1;

-- name: ReservationCodeTaken :one
SELECT EXISTS (SELECT 1 FROM mobility_reservation WHERE code = $1);

-- name: InsertReservation :exec
INSERT INTO mobility_reservation (id, created_at, updated_at, code, status, payment_mode, expires_at, account_id,
  battery_id, driver_id, hub_id, vehicle_id, hold_amount_kobo, token_hash, source, token_ciphertext, list_price_kobo,
  discount_code, discount_kobo)
VALUES ($1, clock_timestamp(), clock_timestamp(), $2, 'CONFIRMED', $3, $4, $5, $6, $7, $8, $9, 0, '', $10, '', 0, '', 0);

-- name: SaveReservation :exec
UPDATE mobility_reservation SET status = $2, hold_amount_kobo = $3, expires_at = $4, token_hash = $5,
  token_ciphertext = $6, list_price_kobo = $7, discount_code = $8, discount_kobo = $9, updated_at = now()
WHERE id = $1;

-- name: LiveReservationsAtHub :many
SELECT id FROM mobility_reservation WHERE hub_id = $1 AND status IN ('PENDING', 'CONFIRMED') ORDER BY id FOR UPDATE;

-- name: DriverForUpdate :one
SELECT * FROM accounts_driver WHERE id = $1 FOR UPDATE;

-- name: DriverDaySwaps :one
SELECT count(*)::int AS swaps, COALESCE(sum(amount_kobo), 0)::bigint AS spend FROM mobility_swap
WHERE driver_id = $1 AND status = 'COMPLETED' AND completed_at >= $2 AND completed_at < $3;

-- name: DriverLiveHolds :one
SELECT count(*)::int AS n, COALESCE(sum(hold_amount_kobo), 0)::bigint AS held FROM mobility_reservation
WHERE driver_id = $1 AND status IN ('PENDING', 'CONFIRMED') AND expires_at > now();

-- name: AccountHasOverdueBattery :one
SELECT EXISTS (SELECT 1 FROM mobility_battery b JOIN mobility_vehicle v ON v.current_battery_id = b.id
  WHERE b.status = 'ISSUED' AND v.account_id = $1
    AND (b.expected_return_by < now() OR (b.expected_return_by IS NULL AND b.issued_at < now() - interval '48 hours')));

-- name: ReadySlotForUpdate :one
-- First READY slot (slot_no order) holding an AVAILABLE pack of the vehicle's type.
SELECT s.id AS slot_id, b.id AS battery_id FROM mobility_hubslot s JOIN mobility_battery b ON b.id = s.battery_id
WHERE s.hub_id = sqlc.arg(hub) AND s.state = 'READY' AND b.status = 'AVAILABLE'
  AND (sqlc.narg(battery_type)::uuid IS NULL OR b.battery_type_id = sqlc.narg(battery_type))
ORDER BY s.slot_no LIMIT 1 FOR UPDATE OF s;

-- name: ReleaseReservedBattery :exec
UPDATE mobility_battery SET status = 'AVAILABLE', updated_at = now() WHERE id = $1 AND status = 'RESERVED';

-- name: SetBatteryAvailable :exec
UPDATE mobility_battery SET status = 'AVAILABLE', updated_at = now() WHERE id = $1;

-- name: UsersForHub :many
-- users_for_hub: staff memberships on the hub or an open shift there.
SELECT u.id FROM accounts_user u WHERE u.is_active AND (
  u.id IN (SELECT m.user_id FROM accounts_staffmembership m WHERE m.hub_id = $1::uuid::text AND m.hub_id <> '')
  OR u.id IN (SELECT s.agent_id FROM operations_shift s WHERE s.hub_id = $1::uuid AND s.status = 'OPEN'));

-- name: ActiveSubscriptionCovering :one
SELECT * FROM mobility_subscription WHERE vehicle_id = $1 AND status = 'ACTIVE' AND ends_at > now()
ORDER BY ends_at DESC LIMIT 1 FOR UPDATE;

-- name: BumpSubscriptionSwaps :exec
UPDATE mobility_subscription SET swaps_used = swaps_used + $2, updated_at = now() WHERE id = $1;

-- name: DriverPhoto :one
SELECT u.first_name, u.last_name, u.phone, u.email, m.provider, m.storage_key, m.resource_type, m.visibility
FROM accounts_driver d JOIN accounts_user u ON u.id = d.user_id LEFT JOIN core_mediaasset m ON m.id = d.photo_id
WHERE d.id = $1;

-- name: ReleaseRedemptionForReservation :one
DELETE FROM mobility_discountredemption WHERE idempotency_key = $1 RETURNING discount_id;

-- name: DecrementRedemptions :exec
UPDATE mobility_discountcampaign SET redemptions_count = redemptions_count - 1, updated_at = now()
WHERE id = $1 AND redemptions_count > 0;

-- name: LinkRedemptionPayment :exec
UPDATE mobility_discountredemption SET payment_id = $2, updated_at = now() WHERE idempotency_key = $1;

-- name: SetBatteryStatus :exec
UPDATE mobility_battery SET status = $2, updated_at = now() WHERE id = $1;

-- name: GetUserRow :one
SELECT * FROM accounts_user WHERE id = $1;
