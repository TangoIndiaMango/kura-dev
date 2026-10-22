-- Battery types (BatteryTypeViewSet).

-- name: ListBatteryTypes :many
SELECT * FROM mobility_batterytype
WHERE (sqlc.narg(status)::text IS NULL OR status = sqlc.narg(status))
  AND (sqlc.narg(vehicle_type)::text IS NULL OR vehicle_type = sqlc.narg(vehicle_type))
  AND (sqlc.narg(q)::text IS NULL OR name ILIKE '%' || sqlc.narg(q) || '%' OR manufacturer ILIKE '%' || sqlc.narg(q) || '%')
ORDER BY name, created_at DESC
LIMIT sqlc.arg(lim) OFFSET sqlc.arg(off);

-- name: CountBatteryTypes :one
SELECT count(*) FROM mobility_batterytype
WHERE (sqlc.narg(status)::text IS NULL OR status = sqlc.narg(status))
  AND (sqlc.narg(vehicle_type)::text IS NULL OR vehicle_type = sqlc.narg(vehicle_type))
  AND (sqlc.narg(q)::text IS NULL OR name ILIKE '%' || sqlc.narg(q) || '%' OR manufacturer ILIKE '%' || sqlc.narg(q) || '%');

-- name: BatteryTypeByID :one
SELECT * FROM mobility_batterytype WHERE id = $1;

-- name: BatteryTypeForUpdate :one
SELECT * FROM mobility_batterytype WHERE id = $1 FOR UPDATE;

-- name: InsertBatteryType :exec
INSERT INTO mobility_batterytype (id, created_at, updated_at, name, manufacturer, capacity_kwh, nominal_voltage,
  vehicle_type, qr_scheme, status, created_by_id, approved_by_id, usable_energy_wh, wh_per_km)
VALUES ($1, now(), now(), $2, $3, (sqlc.arg(capacity)::text)::numeric, $4, $5, $6, 'PENDING', $7, NULL, 2900, 50);

-- name: ActivateBatteryType :exec
UPDATE mobility_batterytype SET status = 'ACTIVE', approved_by_id = $2, updated_at = now() WHERE id = $1;
