"""Batteries: reads, filters, stats, events, QR, and the full custody
lifecycle on one test battery per backend (audit + custody chain compared,
chain hashes re-verified the way Django computes them)."""
import hashlib
import json
import re
import sys

from lib import DJ, GO, both, call, check, fresh, sql, staff_tokens, summary

ops = staff_tokens()
admin = staff_tokens("admin@yopmail.com", "adminpass123")
agent = staff_tokens("agent.yaba@yopmail.com", "agentpass123")
B = "/api/v1/mobility/batteries/"
CURSOR = ("next", "previous")


def cleanup():
    sql("""CREATE TEMP TABLE cb AS SELECT id FROM mobility_battery WHERE serial LIKE 'CT-%';
      DELETE FROM notifications_notification WHERE EXISTS (SELECT 1 FROM cb WHERE link_path LIKE '%' || cb.id || '%');
      DELETE FROM mobility_batteryevent WHERE battery_id IN (SELECT id FROM cb);
      UPDATE mobility_hubslot SET battery_id = NULL WHERE battery_id IN (SELECT id FROM cb);
      DELETE FROM mobility_battery WHERE id IN (SELECT id FROM cb);""")


cleanup()
for label, tok in [("ops", ops), ("admin", admin), ("agent", agent)]:
    both(f"list as {label}", "GET", B, tokens=tok)
    both(f"stats as {label}", "GET", B + "stats/", tokens=tok)
types = sql("SELECT id FROM mobility_batterytype ORDER BY created_at LIMIT 1")[0][0]
hub, hub2 = [r[0] for r in sql("SELECT id FROM mobility_hub ORDER BY code LIMIT 2")]
for q in ["?status=AVAILABLE", "?status=NOPE", f"?battery_type={types}", "?battery_type=bad",
          "?battery_type=00000000-0000-0000-0000-000000000000", f"?current_hub={hub}", "?q=yba", "?q=bat",
          "?ordering=serial", "?page_size=5&page=3"]:
    both(f"list {q}", "GET", B + q, tokens=ops)
# Ties in a single-column ordering come back in plan order on both sides, so
# compare the sorted column only.
for col in ("-charge_pct", "health_pct", "status"):
    d = call(DJ, "GET", f"{B}?ordering={col}&page_size=100", token=ops[0])
    g = call(GO, "GET", f"{B}?ordering={col}&page_size=100", token=ops[1])
    key = col.lstrip("-")
    check(f"ordering {col}", (d[0], [r[key] for r in d[1]["results"]]), (g[0], [r[key] for r in g[1]["results"]]))
both("types", "GET", B + "types/", tokens=ops)
_, lst = call(DJ, "GET", B + "?page_size=100", token=ops[0])
call(GO, "GET", B + "?page_size=100", token=ops[1])
fresh()
for bat in lst["results"][:40]:
    both(f"detail {bat['serial']}", "GET", f"{B}{bat['id']}/", tokens=ops)
fresh()
for bat in lst["results"][:40]:
    both(f"events {bat['serial']}", "GET", f"{B}{bat['id']}/events/?page_size=3", tokens=admin, extra=CURSOR)
fresh()
for label, tok, q in [("ops", ops, ""), ("filtered", ops, "?status=CHARGING&ordering=serial")]:
    d = call(DJ, "GET", B + "export/" + q, token=tok[0], raw=True)
    g = call(GO, "GET", B + "export/" + q, token=tok[1], raw=True)
    check(f"export {label}", (d[0], d[1].decode()), (g[0], g[1].decode()))
for bat in lst["results"][:5]:
    d, g = both(f"label {bat['serial']}", "GET", f"{B}{bat['id']}/label/", tokens=admin)
    both(f"resolve signed {bat['serial']}", "POST", B + "resolve/", {"token": d[1]["payload"]}, ops)
both("resolve bare serial (SIGNED type)", "POST", B + "resolve/", {"token": lst["results"][0]["serial"]}, ops)
both("resolve tampered", "POST", B + "resolve/", {"token": "kura:bat:v1." + lst["results"][0]["serial"] + ".deadbeef"}, ops)
both("resolve malformed", "POST", B + "resolve/", {"token": "kura:bat:v1.nosig"}, ops)
both("resolve unknown", "POST", B + "resolve/", {"token": "NOPE-123"}, ops)
both("resolve empty", "POST", B + "resolve/", {}, ops)

# Lifecycle on one battery per backend.
fresh()
SER = {"django": "CT-DJ-BAT", "go": "CT-GO-BAT"}
BASE = {"django": DJ, "go": GO}
TOK = {"django": admin[0], "go": admin[1]}
SCRUB = ("id", "serial", "created_at", "updated_at", "custodian_id", "payload", "occurred_at", "recorded_at",
         "prev_hash", "row_hash")
made = {}


def step(name, method, path, body=None):
    out = {k: call(BASE[k], method, path(k) if callable(path) else path,
                   body(k) if callable(body) else body, TOK[k]) for k in ("django", "go")}
    check(name, out["django"], out["go"], extra=SCRUB)
    return out


step("create: missing serial (raw detail)", "POST", B, {"battery_type_id": types})
step("create: bad fields", "POST", B, {"serial": "", "charge_pct": 101, "status": "NOPE", "manufactured_at": "x"})
step("create: unknown type", "POST", B, lambda k: {"serial": SER[k], "battery_type_id": hub})
step("create: unknown hub", "POST", B, lambda k: {"serial": SER[k], "battery_type_id": types, "current_hub_id": types})
step("create: issued not allowed", "POST", B, lambda k: {"serial": SER[k], "battery_type_id": types, "status": "ISSUED"})
step("create: serial taken", "POST", B, {"serial": lst["results"][0]["serial"].lower(), "battery_type_id": types})
out = step("create", "POST", B, lambda k: {"serial": f" {SER[k]} ", "battery_type_id": types, "current_hub_id": hub,
                                           "charge_pct": 80, "health_pct": 90, "cycle_count": 3,
                                           "manufactured_at": "2025-01-02", "charge_source": "BMS"})
made = {k: out[k][1]["id"] for k in out}
P = lambda suffix="": (lambda k: f"{B}{made[k]}/{suffix}")  # noqa: E731
step("patch: hub move refused", "PATCH", P(), {"current_hub_id": None})
step("patch: status refused", "PATCH", P(), {"status": "CHARGING"})
step("patch: specs", "PATCH", P(), {"charge_pct": 55, "cycle_count": 9, "manufactured_at": None, "charge_source": "TELEMETRY"})
step("patch: serial clash", "PATCH", P(), {"serial": lst["results"][0]["serial"]})
step("status: swap-only", "POST", P("status/"), {"status": "ISSUED"})
step("status: returned unsupported", "POST", P("status/"), {"status": "RETURNED"})
step("status: charging", "POST", P("status/"), {"status": "CHARGING", "note": "on charger"})
step("status: unavailable", "POST", P("status/"), {"status": "UNAVAILABLE"})
step("status: hub move", "POST", P("status/"), {"status": "AVAILABLE", "current_hub_id": hub2})
step("transfer: missing hub", "POST", P("transfer/"), {"destination": "workshop"})
step("transfer: bad dest", "POST", P("transfer/"), {"destination": "moon"})
step("transfer: workshop", "POST", P("transfer/"), {"destination": "workshop", "hub_id": hub, "note": "check cells"})
step("found", "POST", P("found/"), {"note": "cells ok"})
step("transfer: transit", "POST", P("transfer/"), {"destination": "transit"})
step("fault", "POST", P("fault/"), {})
step("status: lost", "POST", P("status/"), {"status": "LOST", "note": "missing"})
step("status: lost again", "POST", P("status/"), {"status": "LOST"})
step("fault from lost", "POST", P("fault/"), {})
step("label", "GET", P("label/"))
step("retire", "POST", P("retire/"), {"note": "end of life"})
step("retire again", "POST", P("retire/"), {})
step("patch retired", "PATCH", P(), {"charge_pct": 1})
r = step("rotate qr", "POST", P("rotate-qr/"))
check("rotated payload differs from serial", (200, r["django"][1]["payload"] != SER["django"]),
      (200, r["go"][1]["payload"] != SER["go"]))
step("events", "GET", P("events/?page_size=50"))

VOL = [(re.compile(r"CT-(GO|DJ)-BAT"), "<serial>"), (re.compile(r"[0-9a-f]{8}-[0-9a-f-]{27}"), "<uuid>")]


def norm(rows):
    out = []
    for row in rows:
        cells = []
        for c in row:
            for rx, sub in VOL:
                c = rx.sub(sub, c)
            cells.append(c)
        out.append(cells)
    return out


audit = {k: norm(sql(f"SELECT action, before::text, after::text, metadata::text FROM audit_auditevent WHERE "
                     f"subject_id = '{made[k]}' ORDER BY created_at, id")) for k in made}
check("audit trail", (200, audit["django"]), (200, audit["go"]))
chain = {k: norm(sql(f"SELECT event, from_custodian_type, to_custodian_type, charge_pct::text, meta::text, source, "
                     f"(hub_id IS NULL)::text FROM mobility_batteryevent WHERE battery_id = '{made[k]}' "
                     f"ORDER BY occurred_at, id")) for k in made}
check("custody chain", (200, chain["django"]), (200, chain["go"]))
notes = {k: norm(sql(f"SELECT title, body, template_code, severity, dedupe_key FROM notifications_notification "
                     f"WHERE link_path = '/batteries/{made[k]}' ORDER BY created_at, id")) for k in made}
check("notifications", (200, notes["django"]), (200, notes["go"]))


def verify_chain(battery_id):
    """Recompute every row hash exactly as record_battery_event does."""
    rows = sql(f"""SELECT event, from_custodian_type, from_custodian_id, to_custodian_type, to_custodian_id,
        charge_pct, meta::text, prev_hash, to_char(occurred_at AT TIME ZONE 'UTC',
        'YYYY-MM-DD"T"HH24:MI:SS.US'), source, row_hash FROM mobility_batteryevent
        WHERE battery_id = '{battery_id}' ORDER BY occurred_at, id""")
    prev, ok = "", True
    for ev, fct, fci, tct, tci, charge, meta, prev_hash, occ, source, row_hash in rows:
        occ = occ.rstrip("0").rstrip(".") if occ.endswith(".000000") else occ
        body = {"battery_id": battery_id, "event": ev, "from_custodian_type": fct, "from_custodian_id": fci or None,
                "to_custodian_type": tct, "to_custodian_id": tci or None, "charge_pct": int(charge),
                "meta": json.loads(meta), "prev_hash": prev, "occurred_at": occ + "+00:00", "source": source}
        h = hashlib.sha256(json.dumps(body, sort_keys=True, default=str, separators=(",", ":")).encode()).hexdigest()
        ok = ok and prev_hash == prev and h == row_hash
        prev = row_hash
    return ok, len(rows)


for k in made:
    ok, n = verify_chain(made[k])
    check(f"{k} chain verifies ({n} events)", (200, True), (200, ok))
print(f"compared {len(audit['go'])} audit rows, {len(chain['go'])} custody events, {len(notes['go'])} notifications")
cleanup()
sys.exit(1 if summary() else 0)
