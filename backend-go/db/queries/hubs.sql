-- Hubs (HubViewSet + hub selectors). Scope: all_rows or ids (hub_ids_for).

-- name: ListHubIDs :many
SELECT h.id FROM mobility_hub h
WHERE (sqlc.arg(all_rows)::bool OR h.id = ANY(sqlc.arg(scope_ids)::uuid[]))
  AND (sqlc.narg(status)::text IS NULL OR h.status = sqlc.narg(status))
  AND (sqlc.narg(q)::text IS NULL OR h.code ILIKE '%' || sqlc.narg(q) || '%'
       OR h.name ILIKE '%' || sqlc.narg(q) || '%' OR h.address ILIKE '%' || sqlc.narg(q) || '%')
-- hubs_with_slot_counts orders by code; ?ordering= over code / name / created_at.
ORDER BY CASE WHEN sqlc.arg(ord)::text = 'name' THEN h.name END,
  CASE WHEN sqlc.arg(ord)::text = '-name' THEN h.name END DESC,
  CASE WHEN sqlc.arg(ord)::text = 'created_at' THEN h.created_at END,
  CASE WHEN sqlc.arg(ord)::text = '-created_at' THEN h.created_at END DESC,
  CASE WHEN sqlc.arg(ord)::text = '-code' THEN h.code END DESC,
  h.code
LIMIT sqlc.arg(lim) OFFSET sqlc.arg(off);

-- name: CountHubs :one
SELECT count(*) FROM mobility_hub h
WHERE (sqlc.arg(all_rows)::bool OR h.id = ANY(sqlc.arg(scope_ids)::uuid[]))
  AND (sqlc.narg(status)::text IS NULL OR h.status = sqlc.narg(status))
  AND (sqlc.narg(q)::text IS NULL OR h.code ILIKE '%' || sqlc.narg(q) || '%'
       OR h.name ILIKE '%' || sqlc.narg(q) || '%' OR h.address ILIKE '%' || sqlc.narg(q) || '%');

-- name: HubRows :many
-- Hub columns plus slot state counts (hubs_with_slot_counts annotations).
SELECT h.id, h.created_at, h.updated_at, h.code, h.name, h.address, h.lat, h.lng, h.slot_count,
  h.solar_capacity_kw::text AS solar_capacity_kw, h.status, h.last_sync_at, h.timezone, h.operating_hours,
  count(s.id) FILTER (WHERE s.state = 'READY')::int AS ready_count,
  count(s.id) FILTER (WHERE s.state = 'CHARGING')::int AS charging_count,
  count(s.id) FILTER (WHERE s.state = 'EMPTY')::int AS empty_count,
  count(s.id) FILTER (WHERE s.state = 'FAULT')::int AS fault_count
FROM mobility_hub h LEFT JOIN mobility_hubslot s ON s.hub_id = h.id
WHERE h.id = ANY(sqlc.arg(ids)::uuid[])
GROUP BY h.id;

-- name: HubBatteryTypeNames :many
-- Pack types physically at the hub now (sorted, distinct).
SELECT DISTINCT t.name FROM mobility_battery b JOIN mobility_batterytype t ON t.id = b.battery_type_id
WHERE b.current_hub_id = sqlc.arg(hub_id)::uuid ORDER BY t.name;

-- name: HubSlotRows :many
SELECT s.id, s.slot_no, s.state, s.battery_id, b.serial AS battery_serial, b.charge_pct AS battery_charge_pct
FROM mobility_hubslot s LEFT JOIN mobility_battery b ON b.id = s.battery_id
WHERE s.hub_id = $1 ORDER BY s.slot_no;

-- name: HubStatusCounts :many
SELECT status, count(*)::int AS n FROM mobility_hub
WHERE sqlc.arg(all_rows)::bool OR id = ANY(sqlc.arg(scope_ids)::uuid[])
GROUP BY status;

-- name: HubInventory :one
SELECT count(s.id) FILTER (WHERE s.state = 'READY')::int AS ready,
  count(s.id) FILTER (WHERE s.state = 'CHARGING')::int AS charging
FROM mobility_hub h LEFT JOIN mobility_hubslot s ON s.hub_id = h.id
WHERE sqlc.arg(all_rows)::bool OR h.id = ANY(sqlc.arg(scope_ids)::uuid[]);

-- name: HubSwapTotals :one
SELECT count(*)::int AS swaps, COALESCE(sum(amount_kobo), 0)::bigint AS revenue
FROM mobility_swap
WHERE hub_id = $1 AND status = 'COMPLETED' AND completed_at >= sqlc.arg(from_at)::timestamptz
  AND completed_at < sqlc.arg(to_at)::timestamptz;

-- name: HubSwapDaily :many
-- Energy = charge handed over × the issued pack's rated capacity.
SELECT (s.completed_at AT TIME ZONE 'Africa/Lagos')::date AS day, count(*)::int AS swaps,
  COALESCE(sum((s.issued_charge_pct - s.returned_charge_pct) * t.capacity_kwh::float8 / 100.0), 0)::float8 AS energy,
  COALESCE(sum(s.amount_kobo), 0)::bigint AS revenue
FROM mobility_swap s
LEFT JOIN mobility_battery b ON b.id = s.issued_battery_id
LEFT JOIN mobility_batterytype t ON t.id = b.battery_type_id
WHERE s.hub_id = $1 AND s.status = 'COMPLETED' AND s.completed_at >= sqlc.arg(from_at)::timestamptz
  AND s.completed_at < sqlc.arg(to_at)::timestamptz
GROUP BY 1;

-- name: HubSlotStateCounts :one
SELECT count(*) FILTER (WHERE state = 'READY')::int AS ready,
  count(*) FILTER (WHERE state = 'CHARGING')::int AS charging,
  count(*) FILTER (WHERE state = 'EMPTY')::int AS empty,
  count(*) FILTER (WHERE state = 'FAULT')::int AS fault
FROM mobility_hubslot WHERE hub_id = $1;

-- name: HubCodeExists :one
SELECT EXISTS (SELECT 1 FROM mobility_hub WHERE code = $1);

-- name: InsertHub :exec
INSERT INTO mobility_hub (id, created_at, updated_at, code, name, address, lat, lng, slot_count,
  solar_capacity_kw, status, last_sync_at, timezone, operating_hours)
VALUES ($1, now(), now(), $2, $3, $4, $5, $6, $7, (sqlc.arg(solar)::text)::numeric, $8, NULL, 'Africa/Lagos', '{}'::jsonb);

-- name: HubForUpdate :one
SELECT id, code, name, address, lat, lng, slot_count, solar_capacity_kw::text AS solar_capacity_kw, status,
  timezone, operating_hours
FROM mobility_hub WHERE id = $1 FOR UPDATE;

-- name: UpdateHub :exec
UPDATE mobility_hub SET name = $2, address = $3, lat = $4, lng = $5, slot_count = $6,
  solar_capacity_kw = (sqlc.arg(solar)::text)::numeric, status = $7, timezone = $8, operating_hours = $9, updated_at = now()
WHERE id = $1;

-- name: HubSlotNumbers :many
SELECT slot_no FROM mobility_hubslot WHERE hub_id = $1;

-- name: InsertHubSlot :exec
INSERT INTO mobility_hubslot (id, created_at, updated_at, slot_no, state, battery_id, hub_id)
VALUES ($1, now(), now(), $2, 'EMPTY', NULL, $3);

-- name: DiscoverHubs :many
-- discover_hubs: ready slots overall and, when a pack type is given, of that type.
SELECT h.id, h.code, h.name, h.address, h.status, h.lat, h.lng, h.operating_hours,
  count(s.id) FILTER (WHERE s.state = 'READY')::int AS ready_count,
  count(s.id) FILTER (WHERE s.state = 'READY' AND b.battery_type_id = sqlc.narg(type_id))::int AS type_ready_count
FROM mobility_hub h
LEFT JOIN mobility_hubslot s ON s.hub_id = h.id
LEFT JOIN mobility_battery b ON b.id = s.battery_id
WHERE (sqlc.arg(open_now)::bool AND h.status = 'ONLINE')
   OR (NOT sqlc.arg(open_now)::bool AND h.status IN ('ONLINE', 'MAINTENANCE', 'CLOSED'))
GROUP BY h.id
HAVING sqlc.narg(type_id)::uuid IS NULL
   OR count(s.id) FILTER (WHERE s.state = 'READY' AND b.battery_type_id = sqlc.narg(type_id)) > 0
ORDER BY h.code
LIMIT sqlc.arg(lim);

-- name: VehicleBatteryType :one
SELECT m.battery_type_id FROM mobility_vehicle v JOIN mobility_vehiclemodel m ON m.id = v.vehicle_model_id
WHERE v.id = $1;
