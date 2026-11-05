-- Bays and batteries drifted apart: packs added or transferred never entered
-- a bay, manual status changes left the bay's state behind, and some hubs had
-- no bay rows at all. Line them up once; the app keeps them in step from now
-- on (mobility.syncSlot). Data only — nothing to undo.

-- +goose Up
-- 1. Every hub has a row for each of its bays.
INSERT INTO public.mobility_hubslot (id, created_at, updated_at, slot_no, state, battery_id, hub_id)
SELECT gen_random_uuid(), now(), now(), n, 'EMPTY', NULL, h.id
FROM public.mobility_hub h, generate_series(1, h.slot_count) AS n
WHERE NOT EXISTS (SELECT 1 FROM public.mobility_hubslot s WHERE s.hub_id = h.id AND s.slot_no = n);

-- 2. A bay whose pack has left (on a vehicle, workshop, lost, retired, set aside) is empty.
UPDATE public.mobility_hubslot s SET battery_id = NULL, state = 'EMPTY', updated_at = now()
FROM public.mobility_battery b
WHERE b.id = s.battery_id
  AND (b.custodian_type <> 'HUB_SLOT' OR b.status IN ('ISSUED', 'LOST', 'RETIRED', 'UNAVAILABLE'));

-- 3. Each bay shows its pack's real state.
UPDATE public.mobility_hubslot s SET updated_at = now(), state = CASE
    WHEN b.status IN ('AVAILABLE', 'RESERVED') THEN 'READY'
    WHEN b.status = 'FAULTED' THEN 'FAULT'
    ELSE 'CHARGING' END
FROM public.mobility_battery b
WHERE b.id = s.battery_id AND s.state <> CASE
    WHEN b.status IN ('AVAILABLE', 'RESERVED') THEN 'READY'
    WHEN b.status = 'FAULTED' THEN 'FAULT'
    ELSE 'CHARGING' END;

-- 4. A pack recorded as "in a bay" that no bay holds is at its hub, waiting to be received.
UPDATE public.mobility_battery b
SET custodian_type = 'TRANSIT', custodian_id = b.current_hub_id, updated_at = now()
WHERE b.custodian_type = 'HUB_SLOT'
  AND NOT EXISTS (SELECT 1 FROM public.mobility_hubslot s WHERE s.battery_id = b.id);

-- +goose Down
SELECT 1;
