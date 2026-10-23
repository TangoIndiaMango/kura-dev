"""Hubs: reads per role, filters, stats, discover, create / patch + audit."""
import re
import sys

from lib import DJ, GO, both, call, check, fresh, sql, staff_tokens, summary

ops = staff_tokens()
admin = staff_tokens("admin@yopmail.com", "adminpass123")
agent = staff_tokens("agent.yaba@yopmail.com", "agentpass123")
rider_login = {"phone": "+2348033330001", "pin": "1234"}
rider = (call(DJ, "POST", "/api/v1/auth/pin/login/", rider_login)[1]["access"],
         call(GO, "POST", "/api/v1/auth/pin/login/", rider_login)[1]["access"])
H = "/api/v1/mobility/hubs/"
CODES = {"go": "CT-GO-HUB", "django": "CT-DJ-HUB"}
sql("DELETE FROM mobility_hubslot WHERE hub_id IN (SELECT id FROM mobility_hub WHERE code LIKE 'CT-%');"
    "DELETE FROM mobility_hub WHERE code LIKE 'CT-%'")

for label, tok in [("ops", ops), ("admin", admin), ("hub agent", agent), ("rider", rider)]:
    both(f"list as {label}", "GET", H, tokens=tok)
    both(f"stats as {label}", "GET", H + "stats/", tokens=tok)
for q in ["?status=ONLINE", "?q=yaba", "?q=lag", "?ordering=-name", "?ordering=created_at", "?page_size=2&page=2",
          "?ordering=junk", "?status=NOPE"]:
    both(f"list {q}", "GET", H + q, tokens=ops)
_, hubs = call(DJ, "GET", H + "?page_size=50", token=ops[0])
call(GO, "GET", H + "?page_size=50", token=ops[1])
for hb in hubs["results"]:
    both(f"detail {hb['code']}", "GET", f"{H}{hb['id']}/", tokens=ops)
    both(f"slots {hb['code']}", "GET", f"{H}{hb['id']}/slots/", tokens=ops)
fresh()
for hb in hubs["results"]:
    for q in ["", "?start_date=2026-09-01&end_date=2026-10-22", "?end_date=2026-10-01"]:
        both(f"detail stats {hb['code']} {q or '(default)'}", "GET", f"{H}{hb['id']}/stats/{q}", tokens=admin)
hid = hubs["results"][0]["id"]
both("detail as agent (scoped)", "GET", f"{H}{hid}/", tokens=agent)
both("detail bad id", "GET", f"{H}nope/", tokens=ops)
both("detail unknown", "GET", f"{H}00000000-0000-0000-0000-000000000000/", tokens=ops)
for label, tok, q in [("ops", ops, ""), ("filtered", ops, "?status=ONLINE&ordering=-name"), ("agent", agent, "")]:
    d = call(DJ, "GET", H + "export/" + q, token=tok[0], raw=True)
    g = call(GO, "GET", H + "export/" + q, token=tok[1], raw=True)
    check(f"export {label}", (d[0], d[1].decode(), d[2].get("X-Export-Row-Count")),
          (g[0], g[1].decode(), g[2].get("X-Export-Row-Count")))

fresh()
btype = sql("SELECT id FROM mobility_batterytype ORDER BY created_at LIMIT 1")[0][0]
vehicle = sql("SELECT id FROM mobility_vehicle ORDER BY created_at LIMIT 1")[0][0]
for q in ["", "?lat=6.5&lng=3.37", "?lat=6.5&lng=3.37&radius_km=5", "?open_now=true",
          f"?battery_type={btype}", f"?vehicle={vehicle}&lat=6.45&lng=3.39",
          "?vehicle=00000000-0000-0000-0000-000000000000", "?lat=6.5"]:
    both(f"discover {q or '(default)'}", "GET", H + "discover/" + q, tokens=rider)

# Writes: one hub per backend, same steps.
both("create: missing code (raw detail)", "POST", H, {"name": "X", "address": "Y"}, admin)
both("create: blank code", "POST", H, {"code": " ", "name": "X", "address": "Y"}, admin)
both("create: bad fields", "POST", H, {"code": "CT-X", "name": "", "slot_count": 0, "solar_capacity_kw": "123.456",
                                       "status": "NOPE", "lat": "north"}, admin)
both("create: rider forbidden", "POST", H, {"code": "CT-X", "name": "X", "address": "Y"}, rider)
both("create: code taken", "POST", H, {"code": hubs["results"][0]["code"].lower(), "name": "X", "address": "Y"}, admin)
made = {}
for k, base, tok in (("django", DJ, admin[0]), ("go", GO, admin[1])):
    made[k] = call(base, "POST", H, {"code": f" {CODES[k].lower()} ", "name": " Contract Hub ", "address": " 1 Test Rd ",
                                     "lat": 6.4512, "lng": 3.3954, "slot_count": 4, "solar_capacity_kw": 7.5}, tok)
check("create", made["django"], made["go"], extra=("id", "code", "created_at", "updated_at"))
P = lambda k: f"{H}{made[k][1]['id']}/"  # noqa: E731


def step(name, body):
    out = {k: call(base, "PATCH", P(k), body, tok) for k, base, tok in
           (("django", DJ, admin[0]), ("go", GO, admin[1]))}
    check(name, out["django"], out["go"], extra=("id", "code", "created_at", "updated_at"))


step("patch: reduce slots", {"slot_count": 2})
step("patch: blank timezone", {"timezone": "  "})
step("patch: grow + rename", {"slot_count": 6, "name": "Contract Hub II", "solar_capacity_kw": "13.2",
                              "operating_hours": {"mon": [["07:00", "19:00"]], "sat": []}})
step("patch: tz + clear hours", {"timezone": " Africa/Accra ", "operating_hours": [], "status": "MAINTENANCE"})
step("patch: blank name", {"name": ""})
for k, other in (("go", "django"), ("django", "go")):
    p = P(k)
    check(f"{k} hub read by {other}", call(GO if k == "go" else DJ, "GET", p, token=admin[1 if k == "go" else 0]),
          call(DJ if k == "go" else GO, "GET", p, token=admin[0 if k == "go" else 1]),
          extra=())
    both(f"{k} slots", "GET", p + "slots/", tokens=admin)

VOL = [(re.compile(r"CT-(GO|DJ)-HUB"), "<code>")]
audit = {}
for k in made:
    rows = sql(f"SELECT action, before::text, after::text FROM audit_auditevent WHERE subject_id = "
               f"'{made[k][1]['id']}' ORDER BY created_at, id")
    out = []
    for r in rows:
        cells = []
        for c in r:
            for rx, sub in VOL:
                c = rx.sub(sub, c)
            cells.append(c)
        out.append(cells)
    audit[k] = out
check("audit trail", (200, audit["django"]), (200, audit["go"]))
print(f"compared {len(audit['go'])} audit rows")
assert len(audit["go"]) == 3, audit["go"]
sql("DELETE FROM mobility_hubslot WHERE hub_id IN (SELECT id FROM mobility_hub WHERE code LIKE 'CT-%');"
    "DELETE FROM mobility_hub WHERE code LIKE 'CT-%'")
sys.exit(1 if summary() else 0)
