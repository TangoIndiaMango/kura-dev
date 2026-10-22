"""Telemetry: fleet summary, event feed + detail, staff ingest (validation,
unknown vehicle / battery, SoC write-through, stale readings ignored) and
device-key batch ingest (auth, hardware id, limits). Each backend writes to
its own vehicle + battery; state is restored afterwards."""
import hashlib
import sys
import uuid

from lib import CUR, DJ, GO, both, call, check, fresh, sql, staff_tokens, summary

ops = staff_tokens()
admin = staff_tokens("admin@yopmail.com", "adminpass123")
agent = staff_tokens("agent.yaba@yopmail.com", "agentpass123")
BASE = {"django": DJ, "go": GO}
TOK = {"django": admin[0], "go": admin[1]}
T, D = "/api/v1/mobility/telemetry/", "/api/v1/telemetry/"
VOL = ("id", "created_at", "vehicle_id", "vehicle_reg", "battery_id", "subject_id", "subject_label", "hardware_id")

fresh()
for label, tok in [("admin", admin), ("ops", ops), ("agent", agent)]:
    both(f"fleet as {label}", "GET", T + "fleet/", tokens=tok)
    both(f"events as {label}", "GET", T + "events/?page_size=5", tokens=tok, extra=CUR)
for q in ["?search=LAG", "?search=%25", "?search=zzzz"]:
    both(f"fleet {q}", "GET", T + "fleet/" + q, tokens=admin)
for q in ["?vehicle_id=bad", f"?vehicle_id={uuid.uuid4()}"]:
    both(f"events {q}", "GET", T + "events/" + q, tokens=admin, extra=CUR)
for (eid,) in sql("SELECT id FROM mobility_telemetryevent ORDER BY created_at DESC LIMIT 3"):
    both(f"event {eid[-6:]}", "GET", f"{T}events/{eid}/", tokens=admin)
both("event unknown", "GET", f"{T}events/{uuid.uuid4()}/", tokens=admin)
both("event bad id", "GET", f"{T}events/nope/", tokens=admin)

# Two active vehicles (one per backend) and two batteries; snapshot to restore.
veh = sql("SELECT id, iot_api_key_hash, coalesce(hardware_id, '') FROM mobility_vehicle WHERE status = 'ACTIVE' "
          "ORDER BY registration_plate LIMIT 2")
bats = sql("SELECT id, charge_pct, charge_source, charge_observed_at FROM mobility_battery ORDER BY serial LIMIT 2")
V = {"django": veh[0][0], "go": veh[1][0]}
B = {"django": bats[0][0], "go": bats[1][0]}
KEY = {"django": "ct-dj-" + uuid.uuid4().hex, "go": "ct-go-" + uuid.uuid4().hex}
HW = {"django": "CT-HW-" + uuid.uuid4().hex[:8], "go": "CT-HW-" + uuid.uuid4().hex[:8]}
for k in BASE:
    sql(f"UPDATE mobility_vehicle SET iot_api_key_hash = '{hashlib.sha256(KEY[k].encode()).hexdigest()}', "
        f"hardware_id = '{HW[k]}' WHERE id = '{V[k]}'")
    sql(f"UPDATE mobility_battery SET charge_observed_at = '2026-10-20T10:00:00+01:00' WHERE id = '{B[k]}'")


def step(name, method, path, body_for, headers_for=None, tok=TOK, extra=()):
    out = {}
    for k in BASE:
        h = headers_for(k) if headers_for else None
        out[k] = call(BASE[k], method, path, body_for(k), tok[k] if tok else None, headers=h)
    check(name, out["django"], out["go"], extra=VOL + ("ingest_batch",) + tuple(extra))
    return out


fresh()
I = T + "events/ingest/"
step("ingest: empty", "POST", I, lambda k: {})
step("ingest: bad fields", "POST", I, lambda k: {"vehicle_id": "x", "battery_pct": 101, "lat": "n", "source": "gps",
                                                "raw": [1], "recorded_at": "yesterday", "ingest_batch": "x" * 65})
step("ingest: nulls", "POST", I, lambda k: {"vehicle_id": None, "battery_pct": None, "raw": None, "lat": None,
                                           "source": None, "recorded_at": None})
step("ingest: unknown vehicle", "POST", I, lambda k: {"vehicle_id": str(uuid.uuid4())})
step("ingest: heartbeat", "POST", I, lambda k: {"vehicle_id": V[k], "lat": 6.5, "lng": 3.3, "speed_kmh": 0,
                                               "recorded_at": "2026-10-22T09:00:00", "ingest_batch": " b1 "})
step("ingest: SoC to battery", "POST", I, lambda k: {"vehicle_id": V[k], "battery_id": B[k], "battery_pct": 42,
                                                    "source": "iot", "raw": {"x": 1, "provider": "spoof"},
                                                    "recorded_at": "2026-10-22T10:00:00+01:00"})
step("ingest: stale SoC ignored", "POST", I, lambda k: {"vehicle_id": V[k], "battery_id": B[k], "battery_pct": 90,
                                                       "recorded_at": "2026-10-01T10:00:00Z"})
step("ingest: unknown battery", "POST", I, lambda k: {"vehicle_id": V[k], "battery_id": str(uuid.uuid4()),
                                                     "battery_pct": 5}, extra=("recorded_at",))
step("ingest as rider (403)", "POST", I, lambda k: {"vehicle_id": V[k]}, tok={
    k: call(BASE[k], "POST", "/api/v1/auth/pin/login/", {"phone": "+2348033330001", "pin": "1234"})[1]["access"]
    for k in BASE})
rows = {k: [tuple(r) for r in sql(f"SELECT charge_pct, charge_source, charge_observed_at FROM mobility_battery "
                                  f"WHERE id = '{B[k]}'")] for k in BASE}
check("db: battery SoC", (200, rows["django"]), (200, rows["go"]))

dev = lambda k, **h: {"X-Kura-Device-Key": KEY[k], **h}  # noqa: E731
fresh()
step("device: no key", "POST", D + "ingest", lambda k: {"battery_pct": 3}, tok=None)
step("device: bad key", "POST", D + "ingest/", lambda k: {}, lambda k: {"X-Kura-Device-Key": "nope"}, tok=None)
step("device: wrong hardware id", "POST", D + "ingest", lambda k: {"hardware_id": "other"}, dev, tok=None)
step("device: single reading", "POST", D + "ingest", lambda k: {"hardware_id": HW[k], "battery_pct": 55,
                                                               "lat": 6.4, "raw": {"fw": "1.2"}}, dev, tok=None,
     extra=("recorded_at",))
step("device: batch", "POST", D + "ingest/", lambda k: {"ingest_batch": "ct-batch", "events": [
    {"battery_pct": 60, "recorded_at": "2026-10-22T11:00:00+01:00"}, {"speed_kmh": 12.5, "raw": {"a": [1]}}]},
     dev, tok=None, extra=("recorded_at",))
step("device: empty batch (after auth)", "POST", D + "ingest", lambda k: {"events": []}, dev, tok=None)
step("device: empty batch, bad key", "POST", D + "ingest", lambda k: {"events": []}, tok=None)
step("device: too many", "POST", D + "ingest", lambda k: {"events": [{}] * 101}, dev, tok=None)
step("device: bad events", "POST", D + "ingest", lambda k: {"events": [{}, "x", {"battery_pct": -1, "raw": 3}]},
     dev, tok=None)
step("device: events not a list", "POST", D + "ingest", lambda k: {"events": {"a": 1}}, dev, tok=None)
step("device: events null", "POST", D + "ingest", lambda k: {"events": None}, dev, tok=None)
step("device: not an object", "POST", D + "ingest", lambda k: [1], dev, tok=None)

norm = lambda rows: [tuple(r) for r in rows]  # noqa: E731
rows = {k: norm(sql(f"SELECT battery_pct, lat, lng, speed_kmh, source, regexp_replace(ingest_batch, '[0-9.]+$', 'N'), "
                    f"raw - 'hardware_id', raw ? 'hardware_id', battery_id IS NOT NULL, CASE WHEN recorded_at > now() - interval '10 minutes' THEN 'now' "
                    f"ELSE recorded_at::text END "
                    f"FROM mobility_telemetryevent WHERE vehicle_id = '{V[k]}' AND created_at > now() - interval "
                    f"'10 minutes' ORDER BY created_at")) for k in BASE}
check("db: events", (200, rows["django"]), (200, rows["go"]))
rows = {k: norm(sql(f"SELECT a.action, a.after - 'vehicle_id' - 'battery_id', a.actor_email FROM audit_auditevent a "
                    f"JOIN mobility_telemetryevent e ON e.id::text = a.subject_id WHERE e.vehicle_id = '{V[k]}' AND "
                    f"a.created_at > now() - interval '10 minutes' ORDER BY a.created_at")) for k in BASE}
check("db: audit", (200, rows["django"]), (200, rows["go"]))
both("fleet after", "GET", T + "fleet/", tokens=admin, extra=("last_recorded_at", "battery_pct", "speed_kmh",
                                                                  "source", "telemetry_status", "live", "offline",
                                                                  "stationary"))

for k, (vid, h, hw) in zip(BASE, veh):
    sql(f"DELETE FROM mobility_telemetryevent WHERE vehicle_id = '{vid}' AND created_at > now() - interval '10 minutes'")
    sql(f"UPDATE mobility_vehicle SET iot_api_key_hash = '{h}', hardware_id = {repr(hw) if hw else 'NULL'} "
        f"WHERE id = '{vid}'")
for bid, pct, src, at in bats:
    sql(f"UPDATE mobility_battery SET charge_pct = {pct}, charge_source = '{src}', charge_observed_at = "
        f"{repr(at) if at else 'NULL'} WHERE id = '{bid}'")
sys.exit(1 if summary() else 0)
