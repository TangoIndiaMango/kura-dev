-- Vehicles + vehicle models (VehicleViewSet, VehicleModelViewSet).
-- Scope (vehicles_for): all | hub ids (vehicle_q_for_hubs) | own accounts.

-- name: ListVehicleIDs :many
SELECT v.id FROM mobility_vehicle v
JOIN mobility_vehiclemodel m ON m.id = v.vehicle_model_id
JOIN accounts_account a ON a.id = v.account_id
WHERE (sqlc.arg(all_rows)::bool
   OR v.account_id = ANY(sqlc.arg(own_accounts)::uuid[])
   OR (cardinality(sqlc.arg(hub_ids)::uuid[]) > 0 AND (
        EXISTS (SELECT 1 FROM mobility_battery b WHERE b.id = v.current_battery_id AND b.current_hub_id = ANY(sqlc.arg(hub_ids)::uuid[]))
     OR v.id IN (SELECT s.vehicle_id FROM mobility_swap s WHERE s.hub_id = ANY(sqlc.arg(hub_ids)::uuid[]))
     OR v.id IN (SELECT r.vehicle_id FROM mobility_reservation r WHERE r.hub_id = ANY(sqlc.arg(hub_ids)::uuid[]) AND r.vehicle_id IS NOT NULL)
     OR v.account_id = ANY(sqlc.arg(touching)::uuid[]))))
  AND (sqlc.narg(account)::uuid IS NULL OR v.account_id = sqlc.narg(account))
  AND (sqlc.narg(status)::text IS NULL OR v.status = sqlc.narg(status))
  AND (sqlc.narg(q)::text IS NULL OR v.registration_plate ILIKE '%' || sqlc.narg(q) || '%'
       OR v.hardware_id ILIKE '%' || sqlc.narg(q) || '%' OR v.vin ILIKE '%' || sqlc.narg(q) || '%'
       OR a.display_name ILIKE '%' || sqlc.narg(q) || '%' OR a.kura_id ILIKE '%' || sqlc.narg(q) || '%'
       OR m.make ILIKE '%' || sqlc.narg(q) || '%' OR m.model ILIKE '%' || sqlc.narg(q) || '%')
ORDER BY CASE WHEN sqlc.arg(ord)::text = 'registration_plate' THEN v.registration_plate END,
  CASE WHEN sqlc.arg(ord)::text = '-registration_plate' THEN v.registration_plate END DESC,
  CASE WHEN sqlc.arg(ord)::text = 'status' THEN v.status END,
  CASE WHEN sqlc.arg(ord)::text = '-status' THEN v.status END DESC,
  CASE WHEN sqlc.arg(ord)::text = 'created_at' THEN v.created_at END,
  v.created_at DESC
LIMIT sqlc.arg(lim) OFFSET sqlc.arg(off);

-- name: CountVehicles :one
SELECT count(*) FROM mobility_vehicle v
JOIN mobility_vehiclemodel m ON m.id = v.vehicle_model_id
JOIN accounts_account a ON a.id = v.account_id
WHERE (sqlc.arg(all_rows)::bool
   OR v.account_id = ANY(sqlc.arg(own_accounts)::uuid[])
   OR (cardinality(sqlc.arg(hub_ids)::uuid[]) > 0 AND (
        EXISTS (SELECT 1 FROM mobility_battery b WHERE b.id = v.current_battery_id AND b.current_hub_id = ANY(sqlc.arg(hub_ids)::uuid[]))
     OR v.id IN (SELECT s.vehicle_id FROM mobility_swap s WHERE s.hub_id = ANY(sqlc.arg(hub_ids)::uuid[]))
     OR v.id IN (SELECT r.vehicle_id FROM mobility_reservation r WHERE r.hub_id = ANY(sqlc.arg(hub_ids)::uuid[]) AND r.vehicle_id IS NOT NULL)
     OR v.account_id = ANY(sqlc.arg(touching)::uuid[]))))
  AND (sqlc.narg(account)::uuid IS NULL OR v.account_id = sqlc.narg(account))
  AND (sqlc.narg(status)::text IS NULL OR v.status = sqlc.narg(status))
  AND (sqlc.narg(q)::text IS NULL OR v.registration_plate ILIKE '%' || sqlc.narg(q) || '%'
       OR v.hardware_id ILIKE '%' || sqlc.narg(q) || '%' OR v.vin ILIKE '%' || sqlc.narg(q) || '%'
       OR a.display_name ILIKE '%' || sqlc.narg(q) || '%' OR a.kura_id ILIKE '%' || sqlc.narg(q) || '%'
       OR m.make ILIKE '%' || sqlc.narg(q) || '%' OR m.model ILIKE '%' || sqlc.narg(q) || '%');

-- name: VehicleRows :many
SELECT v.id, v.created_at, v.updated_at, v.registration_plate, v.status, v.account_id, v.current_battery_id,
  v.vehicle_model_id, v.hardware_id, v.vin, v.acquisition_path, v.petrol_engine_id, v.assigned_driver_id,
  v.qr_secret, v.iot_api_key_hash,
  m.make, m.model, m.vehicle_type, t.name AS battery_type_name,
  a.display_name AS owner_name, a.kura_id AS owner_kura_id, a.owner_user_id,
  b.serial AS battery_serial, b.charge_pct AS battery_charge, b.charge_source AS battery_charge_source,
  b.charge_observed_at AS battery_charge_at, b.health_pct AS battery_health,
  bt.usable_energy_wh AS battery_usable_wh, bt.wh_per_km AS battery_wh_per_km,
  du.first_name AS driver_first, du.last_name AS driver_last, du.phone AS driver_phone
FROM mobility_vehicle v
JOIN mobility_vehiclemodel m ON m.id = v.vehicle_model_id
JOIN mobility_batterytype t ON t.id = m.battery_type_id
JOIN accounts_account a ON a.id = v.account_id
LEFT JOIN mobility_battery b ON b.id = v.current_battery_id
LEFT JOIN mobility_batterytype bt ON bt.id = b.battery_type_id
LEFT JOIN accounts_driver d ON d.id = v.assigned_driver_id
LEFT JOIN accounts_user du ON du.id = d.user_id
WHERE v.id = ANY(sqlc.arg(ids)::uuid[]);

-- name: VehicleStatusCounts :many
SELECT status, count(*)::int AS n FROM mobility_vehicle GROUP BY status;

-- name: VehicleTypeCounts :many
SELECT m.vehicle_type, count(*)::int AS n FROM mobility_vehicle v
JOIN mobility_vehiclemodel m ON m.id = v.vehicle_model_id
GROUP BY m.vehicle_type ORDER BY 2 DESC;

-- name: VehicleForUpdate :one
SELECT * FROM mobility_vehicle WHERE id = $1 FOR UPDATE;

-- name: PlateTaken :one
SELECT EXISTS (SELECT 1 FROM mobility_vehicle WHERE registration_plate = $1 AND id <> sqlc.arg(exclude)::uuid);

-- name: HardwareTaken :one
SELECT EXISTS (SELECT 1 FROM mobility_vehicle WHERE hardware_id = $1 AND id <> sqlc.arg(exclude)::uuid);

-- name: InsertVehicle :exec
INSERT INTO mobility_vehicle (id, created_at, updated_at, registration_plate, status, account_id, current_battery_id,
  vehicle_model_id, qr_secret, hardware_id, vin, acquisition_path, petrol_engine_id, iot_api_key_hash,
  assigned_driver_id)
VALUES ($1, clock_timestamp(), clock_timestamp(), $2, $3, $4, NULL, $5, '', $6, $7, 'EV_FIRST', NULL, '', NULL);

-- name: SaveVehicle :exec
UPDATE mobility_vehicle SET registration_plate = $2, status = $3, account_id = $4, vehicle_model_id = $5,
  hardware_id = $6, vin = $7, assigned_driver_id = $8, qr_secret = $9, iot_api_key_hash = $10, updated_at = now()
WHERE id = $1;

-- name: AccountVehicleTotal :one
SELECT count(*)::int FROM mobility_vehicle WHERE account_id = $1;

-- name: CloseOpenAssignments :exec
UPDATE mobility_vehicleassignment SET ends_at = $2, updated_at = now() WHERE vehicle_id = $1 AND ends_at IS NULL;

-- name: InsertAssignment :exec
INSERT INTO mobility_vehicleassignment (id, created_at, updated_at, starts_at, ends_at, note, driver_id, vehicle_id)
VALUES ($1, clock_timestamp(), clock_timestamp(), $2, NULL, $3, $4, $5);

-- name: DriverRowByID :one
SELECT * FROM accounts_driver WHERE id = $1;

-- name: VehicleAssignments :many
SELECT a.id, a.driver_id, a.starts_at, a.ends_at, a.note, u.first_name, u.last_name, u.phone
FROM mobility_vehicleassignment a JOIN accounts_driver d ON d.id = a.driver_id JOIN accounts_user u ON u.id = d.user_id
WHERE a.vehicle_id = $1 ORDER BY a.starts_at DESC, a.id DESC LIMIT 50;

-- name: VehicleCommands :many
SELECT id, kind, status, note, error, created_at, acked_at FROM mobility_vehiclecommand
WHERE vehicle_id = $1 ORDER BY created_at DESC LIMIT 40;

-- name: InsertVehicleCommand :exec
INSERT INTO mobility_vehiclecommand (id, created_at, updated_at, kind, status, note, error, acked_at,
  requested_by_id, vehicle_id)
VALUES ($1, clock_timestamp(), clock_timestamp(), $2, $3, $4, '', NULL, $5, $6);

-- name: VehicleByIDPlain :one
SELECT * FROM mobility_vehicle WHERE id = $1;

-- name: ListVehicleModels :many
SELECT m.*, t.name AS battery_type_name FROM mobility_vehiclemodel m
JOIN mobility_batterytype t ON t.id = m.battery_type_id
WHERE (sqlc.narg(vehicle_type)::text IS NULL OR m.vehicle_type = sqlc.narg(vehicle_type))
  AND (sqlc.narg(battery_type)::uuid IS NULL OR m.battery_type_id = sqlc.narg(battery_type))
  AND (sqlc.narg(q)::text IS NULL OR m.make ILIKE '%' || sqlc.narg(q) || '%' OR m.model ILIKE '%' || sqlc.narg(q) || '%')
ORDER BY CASE WHEN sqlc.arg(ord)::text = '-make' THEN m.make END DESC,
  CASE WHEN sqlc.arg(ord)::text = 'model' THEN m.model END,
  CASE WHEN sqlc.arg(ord)::text = '-model' THEN m.model END DESC,
  CASE WHEN sqlc.arg(ord)::text = 'vehicle_type' THEN m.vehicle_type END,
  CASE WHEN sqlc.arg(ord)::text = '-vehicle_type' THEN m.vehicle_type END DESC,
  CASE WHEN sqlc.arg(ord)::text = 'created_at' THEN m.created_at END,
  CASE WHEN sqlc.arg(ord)::text = '-created_at' THEN m.created_at END DESC,
  m.make, m.model
LIMIT sqlc.arg(lim) OFFSET sqlc.arg(off);

-- name: CountVehicleModels :one
SELECT count(*) FROM mobility_vehiclemodel m
WHERE (sqlc.narg(vehicle_type)::text IS NULL OR m.vehicle_type = sqlc.narg(vehicle_type))
  AND (sqlc.narg(battery_type)::uuid IS NULL OR m.battery_type_id = sqlc.narg(battery_type))
  AND (sqlc.narg(q)::text IS NULL OR m.make ILIKE '%' || sqlc.narg(q) || '%' OR m.model ILIKE '%' || sqlc.narg(q) || '%');

-- name: VehicleModelByID :one
SELECT m.*, t.name AS battery_type_name FROM mobility_vehiclemodel m
JOIN mobility_batterytype t ON t.id = m.battery_type_id WHERE m.id = $1;

-- name: VehicleModelForUpdate :one
SELECT * FROM mobility_vehiclemodel WHERE id = $1 FOR UPDATE;

-- name: InsertVehicleModel :exec
INSERT INTO mobility_vehiclemodel (id, created_at, updated_at, make, model, vehicle_type, battery_type_id,
  service_interval_km, service_interval_days)
VALUES ($1, clock_timestamp(), clock_timestamp(), $2, $3, $4, $5, $6, $7);

-- name: SaveVehicleModel :exec
UPDATE mobility_vehiclemodel SET make = $2, model = $3, vehicle_type = $4, battery_type_id = $5,
  service_interval_km = $6, service_interval_days = $7, updated_at = now() WHERE id = $1;

-- name: VehicleModelTypeCounts :many
SELECT vehicle_type, count(*)::int AS n FROM mobility_vehiclemodel GROUP BY vehicle_type;
