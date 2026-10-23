-- Path B: petrol engine custody, retrofit wizard, e-boarder fleet.

-- name: EnginePage :many
SELECT e.id FROM mobility_petrolengine e JOIN accounts_account a ON a.id = e.account_id
WHERE (sqlc.arg(all_rows)::bool OR e.account_id = ANY(sqlc.arg(own)::uuid[]))
  AND (sqlc.narg(status)::text IS NULL OR e.status = sqlc.narg(status))
  AND (sqlc.narg(q)::text IS NULL OR e.tag ILIKE '%' || sqlc.narg(q) || '%' OR e.make ILIKE '%' || sqlc.narg(q) || '%'
       OR e.model ILIKE '%' || sqlc.narg(q) || '%' OR a.display_name ILIKE '%' || sqlc.narg(q) || '%'
       OR a.kura_id ILIKE '%' || sqlc.narg(q) || '%')
ORDER BY CASE WHEN sqlc.arg(ord)::text = 'tag' THEN e.tag END, CASE WHEN sqlc.arg(ord) = '-tag' THEN e.tag END DESC,
  CASE WHEN sqlc.arg(ord) = 'status' THEN e.status END, CASE WHEN sqlc.arg(ord) = '-status' THEN e.status END DESC,
  CASE WHEN sqlc.arg(ord) = 'created_at' THEN e.created_at END, e.created_at DESC, e.id DESC
LIMIT sqlc.arg(lim) OFFSET sqlc.arg(off);

-- name: EngineCount :one
SELECT count(*) FROM mobility_petrolengine e JOIN accounts_account a ON a.id = e.account_id
WHERE (sqlc.arg(all_rows)::bool OR e.account_id = ANY(sqlc.arg(own)::uuid[]))
  AND (sqlc.narg(status)::text IS NULL OR e.status = sqlc.narg(status))
  AND (sqlc.narg(q)::text IS NULL OR e.tag ILIKE '%' || sqlc.narg(q) || '%' OR e.make ILIKE '%' || sqlc.narg(q) || '%'
       OR e.model ILIKE '%' || sqlc.narg(q) || '%' OR a.display_name ILIKE '%' || sqlc.narg(q) || '%'
       OR a.kura_id ILIKE '%' || sqlc.narg(q) || '%');

-- name: EngineRows :many
SELECT e.*, a.display_name AS owner_name, a.kura_id AS owner_kura_id, a.owner_user_id,
  h.code AS hub_code, h.name AS hub_name, v.id AS vehicle_id, v.registration_plate AS vehicle_reg,
  r.id AS retrofit_id, r.status AS retrofit_status, r.eboarder_serial AS retrofit_serial
FROM mobility_petrolengine e
JOIN accounts_account a ON a.id = e.account_id
LEFT JOIN mobility_hub h ON h.id = e.storage_hub_id
LEFT JOIN mobility_vehicle v ON v.petrol_engine_id = e.id
LEFT JOIN mobility_retrofit r ON r.petrol_engine_id = e.id
WHERE e.id = ANY(sqlc.arg(ids)::uuid[]);

-- name: EngineForUpdate :one
SELECT * FROM mobility_petrolengine WHERE id = $1 FOR UPDATE;

-- name: EngineTagTaken :one
SELECT EXISTS (SELECT 1 FROM mobility_petrolengine WHERE tag = $1);

-- name: SetEngineReleaseRequested :exec
UPDATE mobility_petrolengine SET status = 'RELEASE_REQUESTED', raw = $2, updated_at = now() WHERE id = $1;

-- name: ReleaseEngine :exec
UPDATE mobility_petrolengine SET status = 'RELEASED', released_at = $2, release_photos = $3, release_signature = $4,
  release_by_id = $5, updated_at = now()
WHERE id = $1;

-- name: InsertEngine :exec
INSERT INTO mobility_petrolengine (id, created_at, updated_at, tag, make, model, hp, condition_grade, intake_photos,
  status, intake_signature, released_at, release_photos, raw, account_id, intake_agent_id, intake_witness_id,
  release_by_id, storage_hub_id, release_signature)
VALUES ($1, clock_timestamp(), clock_timestamp(), $2, $3, $4, $5, $6, $7, 'STORED', $8, NULL, '[]', $9, $10, $11, $12,
  NULL, $13, '');

-- name: RetrofitPage :many
SELECT r.id FROM mobility_retrofit r
JOIN accounts_account a ON a.id = r.account_id
JOIN mobility_vehicle v ON v.id = r.vehicle_id
LEFT JOIN mobility_petrolengine e ON e.id = r.petrol_engine_id
WHERE (sqlc.narg(status)::text IS NULL OR r.status = sqlc.narg(status))
  AND (NOT sqlc.arg(awaiting)::bool OR (r.petrol_engine_id IS NULL AND r.status = 'INTAKE'))
  AND (sqlc.narg(q)::text IS NULL OR r.eboarder_serial ILIKE '%' || sqlc.narg(q) || '%'
       OR v.registration_plate ILIKE '%' || sqlc.narg(q) || '%' OR a.display_name ILIKE '%' || sqlc.narg(q) || '%'
       OR e.tag ILIKE '%' || sqlc.narg(q) || '%')
ORDER BY CASE WHEN sqlc.arg(ord)::text = 'status' THEN r.status END,
  CASE WHEN sqlc.arg(ord) = '-status' THEN r.status END DESC,
  CASE WHEN sqlc.arg(ord) = 'created_at' THEN r.created_at END, r.created_at DESC, r.id DESC
LIMIT sqlc.arg(lim) OFFSET sqlc.arg(off);

-- name: RetrofitCount :one
SELECT count(*) FROM mobility_retrofit r
JOIN accounts_account a ON a.id = r.account_id
JOIN mobility_vehicle v ON v.id = r.vehicle_id
LEFT JOIN mobility_petrolengine e ON e.id = r.petrol_engine_id
WHERE (sqlc.narg(status)::text IS NULL OR r.status = sqlc.narg(status))
  AND (NOT sqlc.arg(awaiting)::bool OR (r.petrol_engine_id IS NULL AND r.status = 'INTAKE'))
  AND (sqlc.narg(q)::text IS NULL OR r.eboarder_serial ILIKE '%' || sqlc.narg(q) || '%'
       OR v.registration_plate ILIKE '%' || sqlc.narg(q) || '%' OR a.display_name ILIKE '%' || sqlc.narg(q) || '%'
       OR e.tag ILIKE '%' || sqlc.narg(q) || '%');

-- name: RetrofitRows :many
SELECT r.*, a.display_name AS owner_name, v.registration_plate AS vehicle_reg,
  e.tag AS engine_tag, e.status AS engine_status, e.make AS engine_make, e.model AS engine_model, e.hp AS engine_hp,
  h.code AS hub_code, h.name AS hub_name
FROM mobility_retrofit r
JOIN accounts_account a ON a.id = r.account_id
JOIN mobility_vehicle v ON v.id = r.vehicle_id
LEFT JOIN mobility_petrolengine e ON e.id = r.petrol_engine_id
LEFT JOIN mobility_hub h ON h.id = e.storage_hub_id
WHERE r.id = ANY(sqlc.arg(ids)::uuid[]);

-- name: RetrofitForUpdate :one
SELECT * FROM mobility_retrofit WHERE id = $1 FOR UPDATE;

-- name: InsertRetrofit :exec
INSERT INTO mobility_retrofit (id, created_at, updated_at, eboarder_serial, checklist, status, photos, activated_at, raw,
  account_id, agent_id, petrol_engine_id, vehicle_id, eboarder_id)
VALUES ($1, clock_timestamp(), clock_timestamp(), $2, $3, 'INTAKE', '[]', NULL, $4, $5, $6, NULL, $7, NULL);

-- name: SaveRetrofit :exec
UPDATE mobility_retrofit SET eboarder_serial = $2, checklist = $3, status = $4, photos = $5, activated_at = $6,
  raw = $7, agent_id = $8, petrol_engine_id = $9, eboarder_id = $10, updated_at = now()
WHERE id = $1;

-- name: SetVehicleEngineSwap :exec
UPDATE mobility_vehicle SET acquisition_path = 'ENGINE_SWAP',
  petrol_engine_id = COALESCE(sqlc.narg(engine)::uuid, petrol_engine_id), updated_at = now()
WHERE id = sqlc.arg(id);

-- name: EBoarderPage :many
SELECT b.id FROM mobility_eboarder b
WHERE (sqlc.narg(status)::text IS NULL OR b.status = sqlc.narg(status))
  AND (sqlc.narg(hub)::uuid IS NULL OR b.current_hub_id = sqlc.narg(hub))
  AND (sqlc.narg(q)::text IS NULL OR b.serial ILIKE '%' || sqlc.narg(q) || '%' OR b.make ILIKE '%' || sqlc.narg(q) || '%'
       OR b.model ILIKE '%' || sqlc.narg(q) || '%')
ORDER BY CASE WHEN sqlc.arg(ord)::text = 'serial' THEN b.serial END,
  CASE WHEN sqlc.arg(ord) = '-serial' THEN b.serial END DESC,
  CASE WHEN sqlc.arg(ord) = 'status' THEN b.status END, CASE WHEN sqlc.arg(ord) = '-status' THEN b.status END DESC,
  CASE WHEN sqlc.arg(ord) = 'created_at' THEN b.created_at END, b.created_at DESC, b.id DESC
LIMIT sqlc.arg(lim) OFFSET sqlc.arg(off);

-- name: EBoarderCount :one
SELECT count(*) FROM mobility_eboarder b
WHERE (sqlc.narg(status)::text IS NULL OR b.status = sqlc.narg(status))
  AND (sqlc.narg(hub)::uuid IS NULL OR b.current_hub_id = sqlc.narg(hub))
  AND (sqlc.narg(q)::text IS NULL OR b.serial ILIKE '%' || sqlc.narg(q) || '%' OR b.make ILIKE '%' || sqlc.narg(q) || '%'
       OR b.model ILIKE '%' || sqlc.narg(q) || '%');

-- name: EBoarderRows :many
SELECT b.*, t.name AS battery_type_name, h.code AS hub_code, h.name AS hub_name,
  v.registration_plate AS vehicle_reg, a.display_name AS owner_name
FROM mobility_eboarder b
JOIN mobility_batterytype t ON t.id = b.battery_type_id
LEFT JOIN mobility_hub h ON h.id = b.current_hub_id
LEFT JOIN mobility_vehicle v ON v.id = b.vehicle_id
LEFT JOIN accounts_account a ON a.id = b.account_id
WHERE b.id = ANY(sqlc.arg(ids)::uuid[]);

-- name: EBoarderStats :many
SELECT status, count(*)::int AS n FROM mobility_eboarder GROUP BY status;

-- name: EBoarderForUpdate :one
SELECT * FROM mobility_eboarder WHERE id = $1 FOR UPDATE;

-- name: EBoarderBySerialForUpdate :one
SELECT * FROM mobility_eboarder WHERE upper(serial) = upper($1) ORDER BY id LIMIT 1 FOR UPDATE;

-- name: VehicleHasOtherEBoarder :one
SELECT EXISTS (SELECT 1 FROM mobility_eboarder WHERE vehicle_id = $1 AND id <> $2);

-- name: InsertEBoarder :exec
INSERT INTO mobility_eboarder (id, created_at, updated_at, serial, make, model, rated_watts, petrol_hp_equivalent,
  nominal_voltage_v, shaft_length, status, issued_at, raw, account_id, battery_type_id, current_hub_id, vehicle_id)
VALUES ($1, clock_timestamp(), clock_timestamp(), $2, $3, $4, $5, $6, $7, $8, $9, NULL, $10, NULL, $11, $12, NULL);

-- name: SaveEBoarder :exec
UPDATE mobility_eboarder SET serial = $2, make = $3, model = $4, rated_watts = $5, petrol_hp_equivalent = $6,
  nominal_voltage_v = $7, shaft_length = $8, status = $9, issued_at = $10, raw = $11, account_id = $12,
  battery_type_id = $13, current_hub_id = $14, vehicle_id = $15, updated_at = now()
WHERE id = $1;
