-- Telemetry: fleet summary, event feed, ingest (TelemetryService / TelemetryIotService).

-- name: TelemetryFleetVehicles :many
SELECT v.id, v.registration_plate, v.account_id, v.status, m.vehicle_type, m.make, m.model,
  a.display_name AS owner_name
FROM mobility_vehicle v
JOIN mobility_vehiclemodel m ON m.id = v.vehicle_model_id
JOIN accounts_account a ON a.id = v.account_id
WHERE v.status = 'ACTIVE'
  AND (sqlc.narg(search)::text IS NULL OR v.registration_plate ILIKE '%' || sqlc.narg(search) || '%'
       OR a.display_name ILIKE '%' || sqlc.narg(search) || '%')
ORDER BY v.registration_plate;

-- name: TelemetryLatestByVehicle :many
SELECT DISTINCT ON (vehicle_id) vehicle_id, recorded_at, battery_pct, speed_kmh, source
FROM mobility_telemetryevent WHERE vehicle_id = ANY(sqlc.arg(ids)::uuid[])
ORDER BY vehicle_id, recorded_at DESC;

-- name: TelemetryEventsPage :many
SELECT e.id FROM mobility_telemetryevent e
WHERE (sqlc.narg(vehicle)::uuid IS NULL OR e.vehicle_id = sqlc.narg(vehicle))
  AND (sqlc.narg(after_at)::timestamptz IS NULL
       OR (sqlc.arg(back)::bool AND (e.created_at, e.id) > (sqlc.narg(after_at), sqlc.arg(after_id)::uuid))
       OR (NOT sqlc.arg(back)::bool AND (e.created_at, e.id) < (sqlc.narg(after_at), sqlc.arg(after_id)::uuid)))
ORDER BY CASE WHEN sqlc.arg(back)::bool THEN e.created_at END, CASE WHEN sqlc.arg(back)::bool THEN e.id END,
  e.created_at DESC, e.id DESC
LIMIT sqlc.arg(lim);

-- name: TelemetryEventRows :many
SELECT e.*, v.registration_plate AS vehicle_reg FROM mobility_telemetryevent e
JOIN mobility_vehicle v ON v.id = e.vehicle_id
WHERE e.id = ANY(sqlc.arg(ids)::uuid[]);

-- name: InsertTelemetryEvent :exec
INSERT INTO mobility_telemetryevent (id, created_at, updated_at, recorded_at, battery_pct, lat, lng, speed_kmh,
  odometer_km, source, ingest_batch, raw, battery_id, vehicle_id)
VALUES ($1, clock_timestamp(), clock_timestamp(), $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12);

-- name: TelemetryVehicleByKey :one
SELECT * FROM mobility_vehicle WHERE iot_api_key_hash = sqlc.arg(digest)
  AND (sqlc.narg(hardware_id)::text IS NULL OR hardware_id = sqlc.narg(hardware_id))
ORDER BY id LIMIT 1;

-- name: ObserveBatteryCharge :exec
-- _maybe_update_battery_soc: older observations never overwrite newer ones.
UPDATE mobility_battery SET charge_pct = $2, charge_source = $3, charge_observed_at = $4, updated_at = now()
WHERE id = $1 AND (charge_observed_at IS NULL OR charge_observed_at <= $4);

-- name: TelemetryBatteryExists :one
SELECT EXISTS (SELECT 1 FROM mobility_battery WHERE id = $1);
