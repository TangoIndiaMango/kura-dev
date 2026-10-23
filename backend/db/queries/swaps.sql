-- Swaps (bay sessions): SwapViewSet + SwapService.

-- name: SwapsPage :many
SELECT s.id FROM mobility_swap s
WHERE (sqlc.arg(all_rows)::bool
       OR (sqlc.arg(hub_scoped)::bool AND s.hub_id = ANY(sqlc.arg(hubs)::uuid[]))
       OR (NOT sqlc.arg(hub_scoped)::bool AND s.account_id = ANY(sqlc.arg(own)::uuid[])))
  AND (sqlc.narg(account)::uuid IS NULL OR s.account_id = sqlc.narg(account))
  AND (sqlc.narg(status)::text IS NULL OR s.status = sqlc.narg(status))
  AND (sqlc.narg(payment_mode)::text IS NULL OR s.payment_mode = sqlc.narg(payment_mode))
  AND (sqlc.narg(hub)::uuid IS NULL OR s.hub_id = sqlc.narg(hub))
  AND (sqlc.narg(vehicle)::uuid IS NULL OR s.vehicle_id = sqlc.narg(vehicle))
  AND (sqlc.narg(agent)::uuid IS NULL OR s.agent_id = sqlc.narg(agent))
  AND (sqlc.narg(battery)::uuid IS NULL OR s.returned_battery_id = sqlc.narg(battery) OR s.issued_battery_id = sqlc.narg(battery))
  AND (sqlc.narg(from_at)::timestamptz IS NULL OR s.created_at >= sqlc.narg(from_at))
  AND (sqlc.narg(to_at)::timestamptz IS NULL OR s.created_at < sqlc.narg(to_at))
  AND (sqlc.narg(after_at)::timestamptz IS NULL
       OR (sqlc.arg(back)::bool AND (s.created_at, s.id) > (sqlc.narg(after_at), sqlc.arg(after_id)::uuid))
       OR (NOT sqlc.arg(back)::bool AND (s.created_at, s.id) < (sqlc.narg(after_at), sqlc.arg(after_id)::uuid)))
ORDER BY CASE WHEN sqlc.arg(back)::bool THEN s.created_at END, CASE WHEN sqlc.arg(back)::bool THEN s.id END,
  s.created_at DESC, s.id DESC
LIMIT sqlc.arg(lim);

-- name: SwapRows :many
SELECT s.*, h.name AS hub_name, h.code AS hub_code, v.registration_plate AS vehicle_plate, vm.vehicle_type,
  du.phone AS driver_phone, rb.serial AS returned_serial, ib.serial AS issued_serial,
  r.status AS reservation_raw_status, r.expires_at AS reservation_expires_at, r.hold_amount_kobo AS reservation_hold,
  o.id AS override_id, a.owner_user_id
FROM mobility_swap s
JOIN mobility_hub h ON h.id = s.hub_id
JOIN mobility_vehicle v ON v.id = s.vehicle_id
JOIN mobility_vehiclemodel vm ON vm.id = v.vehicle_model_id
JOIN accounts_driver d ON d.id = s.driver_id
JOIN accounts_user du ON du.id = d.user_id
JOIN accounts_account a ON a.id = s.account_id
LEFT JOIN mobility_battery rb ON rb.id = s.returned_battery_id
LEFT JOIN mobility_battery ib ON ib.id = s.issued_battery_id
LEFT JOIN mobility_reservation r ON r.id = s.reservation_id
LEFT JOIN operations_override o ON o.swap_id = s.id
WHERE s.id = ANY(sqlc.arg(ids)::uuid[]);

-- name: SwapByClientEvent :one
SELECT * FROM mobility_swap WHERE client_event_id = $1;

-- name: SwapForUpdate :one
SELECT * FROM mobility_swap WHERE id = $1 FOR UPDATE;

-- name: OpenSwapForReservation :one
SELECT * FROM mobility_swap WHERE reservation_id = $1 AND status IN ('STARTED', 'RETURN_RECORDED', 'ISSUED')
ORDER BY started_at DESC NULLS FIRST LIMIT 1 FOR UPDATE;

-- name: ReservationHasCompletedSwap :one
SELECT EXISTS (SELECT 1 FROM mobility_swap WHERE reservation_id = $1 AND status = 'COMPLETED');

-- name: OpenSwapsForVehicle :many
SELECT id FROM mobility_swap WHERE vehicle_id = $1 AND status IN ('STARTED', 'RETURN_RECORDED', 'ISSUED')
ORDER BY started_at, created_at;

-- name: InsertSwap :exec
INSERT INTO mobility_swap (id, created_at, updated_at, returned_charge_pct, issued_charge_pct, payment_mode, amount_kobo,
  vat_kobo, mismatch_flag, status, client_event_id, account_id, agent_id, driver_id, hub_id, issued_battery_id,
  reservation_id, returned_battery_id, vehicle_id, source, completed_at, mismatch_reason, started_at, payment_id,
  subscription_id)
VALUES ($1, clock_timestamp(), clock_timestamp(), $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17,
  $18, $19, '', $20, $21, $22);

-- name: SaveSwap :exec
UPDATE mobility_swap SET returned_charge_pct = $2, issued_charge_pct = $3, payment_mode = $4, amount_kobo = $5,
  vat_kobo = $6, mismatch_flag = $7, status = $8, agent_id = $9, issued_battery_id = $10, returned_battery_id = $11,
  completed_at = $12, mismatch_reason = $13, payment_id = $14, subscription_id = $15, updated_at = now()
WHERE id = $1;

-- name: BatteryBySerialForUpdate :one
SELECT * FROM mobility_battery WHERE serial = $1 LIMIT 1 FOR UPDATE;

-- name: BatterySlot :one
SELECT * FROM mobility_hubslot WHERE battery_id = $1 LIMIT 1;

-- name: EmptySlot :one
SELECT * FROM mobility_hubslot WHERE hub_id = $1 AND battery_id IS NULL ORDER BY slot_no LIMIT 1;

-- name: SlotAtHubWithBattery :one
SELECT * FROM mobility_hubslot WHERE hub_id = $1 AND battery_id = $2 ORDER BY slot_no LIMIT 1;

-- name: SetSlot :exec
UPDATE mobility_hubslot SET battery_id = $2, state = $3, updated_at = now() WHERE id = $1;

-- name: SetVehicleBattery :exec
UPDATE mobility_vehicle SET current_battery_id = $2, updated_at = now() WHERE id = $1;

-- name: TouchHubSync :exec
UPDATE mobility_hub SET last_sync_at = now() WHERE id = $1;

-- name: PrevCompletedSwap :one
SELECT s.id, s.hub_id, s.completed_at, h.lat, h.lng, h.code FROM mobility_swap s JOIN mobility_hub h ON h.id = s.hub_id
WHERE s.vehicle_id = $1 AND s.status = 'COMPLETED' AND s.id <> sqlc.arg(exclude)::uuid
ORDER BY s.completed_at DESC NULLS FIRST LIMIT 1;

-- name: PaymentStatusForUpdate :one
SELECT * FROM finance_payment WHERE id = $1 FOR UPDATE;

-- name: SetHubStatus :exec
UPDATE mobility_hub SET status = $2, updated_at = now() WHERE id = $1;
