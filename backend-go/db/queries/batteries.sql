-- Batteries (BatteryViewSet, BatteryService, custody verbs, QR).

-- name: ListBatteryIDs :many
SELECT b.id FROM mobility_battery b
JOIN mobility_batterytype t ON t.id = b.battery_type_id
LEFT JOIN mobility_hub h ON h.id = b.current_hub_id
WHERE (sqlc.arg(all_rows)::bool OR b.current_hub_id = ANY(sqlc.arg(scope_ids)::uuid[])
       OR EXISTS (SELECT 1 FROM mobility_vehicle v WHERE v.current_battery_id = b.id))
  AND (sqlc.narg(status)::text IS NULL OR b.status = sqlc.narg(status))
  AND (sqlc.narg(battery_type)::uuid IS NULL OR b.battery_type_id = sqlc.narg(battery_type))
  AND (sqlc.narg(hub)::uuid IS NULL OR b.current_hub_id = sqlc.narg(hub))
  AND (sqlc.narg(q)::text IS NULL OR b.serial ILIKE '%' || sqlc.narg(q) || '%' OR t.name ILIKE '%' || sqlc.narg(q) || '%'
       OR h.code ILIKE '%' || sqlc.narg(q) || '%' OR h.name ILIKE '%' || sqlc.narg(q) || '%')
ORDER BY CASE WHEN sqlc.arg(ord)::text = 'serial' THEN b.serial END,
  CASE WHEN sqlc.arg(ord)::text = '-serial' THEN b.serial END DESC,
  CASE WHEN sqlc.arg(ord)::text = 'status' THEN b.status END,
  CASE WHEN sqlc.arg(ord)::text = '-status' THEN b.status END DESC,
  CASE WHEN sqlc.arg(ord)::text = 'charge_pct' THEN b.charge_pct END,
  CASE WHEN sqlc.arg(ord)::text = '-charge_pct' THEN b.charge_pct END DESC,
  CASE WHEN sqlc.arg(ord)::text = 'health_pct' THEN b.health_pct END,
  CASE WHEN sqlc.arg(ord)::text = '-health_pct' THEN b.health_pct END DESC,
  CASE WHEN sqlc.arg(ord)::text = 'created_at' THEN b.created_at END,
  b.created_at DESC
LIMIT sqlc.arg(lim) OFFSET sqlc.arg(off);

-- name: CountBatteries :one
SELECT count(*) FROM mobility_battery b
JOIN mobility_batterytype t ON t.id = b.battery_type_id
LEFT JOIN mobility_hub h ON h.id = b.current_hub_id
WHERE (sqlc.arg(all_rows)::bool OR b.current_hub_id = ANY(sqlc.arg(scope_ids)::uuid[])
       OR EXISTS (SELECT 1 FROM mobility_vehicle v WHERE v.current_battery_id = b.id))
  AND (sqlc.narg(status)::text IS NULL OR b.status = sqlc.narg(status))
  AND (sqlc.narg(battery_type)::uuid IS NULL OR b.battery_type_id = sqlc.narg(battery_type))
  AND (sqlc.narg(hub)::uuid IS NULL OR b.current_hub_id = sqlc.narg(hub))
  AND (sqlc.narg(q)::text IS NULL OR b.serial ILIKE '%' || sqlc.narg(q) || '%' OR t.name ILIKE '%' || sqlc.narg(q) || '%'
       OR h.code ILIKE '%' || sqlc.narg(q) || '%' OR h.name ILIKE '%' || sqlc.narg(q) || '%');

-- name: BatteryRows :many
SELECT b.*, t.name AS type_name, t.qr_scheme AS type_qr_scheme, h.code AS hub_code, h.name AS hub_name,
  COALESCE((SELECT v.id::text FROM mobility_vehicle v WHERE v.current_battery_id = b.id), '')::text AS vehicle_id
FROM mobility_battery b
JOIN mobility_batterytype t ON t.id = b.battery_type_id
LEFT JOIN mobility_hub h ON h.id = b.current_hub_id
WHERE b.id = ANY(sqlc.arg(ids)::uuid[]);

-- name: BatteryStatusCounts :many
SELECT b.status, count(*)::int AS n FROM mobility_battery b
WHERE sqlc.arg(all_rows)::bool OR b.current_hub_id = ANY(sqlc.arg(scope_ids)::uuid[])
   OR EXISTS (SELECT 1 FROM mobility_vehicle v WHERE v.current_battery_id = b.id)
GROUP BY b.status;

-- name: BatteryTypeCounts :many
SELECT t.name, count(b.id)::int AS n, count(b.id) FILTER (WHERE b.status = 'AVAILABLE')::int AS available
FROM mobility_battery b JOIN mobility_batterytype t ON t.id = b.battery_type_id
WHERE sqlc.arg(all_rows)::bool OR b.current_hub_id = ANY(sqlc.arg(scope_ids)::uuid[])
   OR EXISTS (SELECT 1 FROM mobility_vehicle v WHERE v.current_battery_id = b.id)
GROUP BY t.name ORDER BY t.name LIMIT 20;

-- name: AllBatteryTypes :many
SELECT * FROM mobility_batterytype ORDER BY name, created_at DESC;

-- name: BatteryEventsPage :many
-- Newest first by (occurred_at, id); after_* is the cursor position.
SELECT e.*, h.code AS hub_code, u.email AS actor_email, u.phone AS actor_phone
FROM mobility_batteryevent e
LEFT JOIN mobility_hub h ON h.id = e.hub_id
LEFT JOIN accounts_user u ON u.id = e.actor_id
WHERE e.battery_id = sqlc.arg(battery_id)
  AND (sqlc.narg(after_at)::timestamptz IS NULL
       OR (sqlc.arg(back)::bool AND (e.occurred_at, e.id) > (sqlc.narg(after_at), sqlc.arg(after_id)::uuid))
       OR (NOT sqlc.arg(back)::bool AND (e.occurred_at, e.id) < (sqlc.narg(after_at), sqlc.arg(after_id)::uuid)))
ORDER BY CASE WHEN sqlc.arg(back)::bool THEN e.occurred_at END, CASE WHEN sqlc.arg(back)::bool THEN e.id END,
  e.occurred_at DESC, e.id DESC
LIMIT sqlc.arg(lim);

-- name: BatteryForUpdate :one
SELECT * FROM mobility_battery WHERE id = $1 FOR UPDATE;

-- name: BatteryBySerial :one
SELECT b.id, b.serial, b.qr_secret, t.qr_scheme FROM mobility_battery b
JOIN mobility_batterytype t ON t.id = b.battery_type_id WHERE upper(b.serial) = upper($1) LIMIT 1;

-- name: SerialTaken :one
SELECT EXISTS (SELECT 1 FROM mobility_battery WHERE upper(serial) = upper(sqlc.arg(serial)::text)
  AND id <> sqlc.arg(exclude)::uuid);

-- name: InsertBattery :exec
INSERT INTO mobility_battery (id, created_at, updated_at, serial, status, charge_pct, health_pct, cycle_count,
  battery_type_id, current_hub_id, custodian_id, custodian_type, expected_return_by, issued_at, qr_secret,
  charge_source, manufactured_at, charge_observed_at)
VALUES ($1, now(), now(), $2, $3, $4, $5, $6, $7, $8, $9, $10, NULL, NULL, $11, $12, $13, NULL);

-- name: SaveBattery :exec
-- Full save (Django model.save()): every mutable column.
UPDATE mobility_battery SET serial = $2, status = $3, charge_pct = $4, health_pct = $5, cycle_count = $6,
  battery_type_id = $7, current_hub_id = $8, custodian_id = $9, custodian_type = $10, expected_return_by = $11,
  issued_at = $12, qr_secret = $13, charge_source = $14, manufactured_at = $15, updated_at = now()
WHERE id = $1;

-- name: ClearSlotOfBattery :exec
UPDATE mobility_hubslot SET battery_id = NULL, state = 'EMPTY', updated_at = now() WHERE battery_id = $1;

-- name: LockBatteryChain :exec
SELECT pg_advisory_xact_lock(sqlc.arg(key)::bigint);

-- name: BatteryChainTip :one
SELECT row_hash FROM mobility_batteryevent WHERE battery_id = $1
ORDER BY occurred_at DESC, id DESC LIMIT 1 FOR UPDATE;

-- name: InsertBatteryEvent :exec
INSERT INTO mobility_batteryevent (id, created_at, updated_at, event, from_custodian_type, from_custodian_id,
  to_custodian_type, to_custodian_id, charge_pct, meta, occurred_at, recorded_at, source, actor_id, battery_id,
  hub_id, swap_id, prev_hash, row_hash)
VALUES ($1, now(), now(), $2, $3, $4, $5, $6, $7, $8, $9, now(), $10, $11, $12, $13, $14, $15, $16);

-- name: HubExists :one
SELECT EXISTS (SELECT 1 FROM mobility_hub WHERE id = $1);
