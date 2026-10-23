"""Vehicles + vehicle models: reads per role, filters, stats, and the write /
action flow on a fresh rider per backend (audit compared)."""
import re
import sys

from lib import DJ, GO, both, call, check, fresh, new_rider, purge_phones, sql, staff_tokens, summary

ops = staff_tokens()
admin = staff_tokens("admin@yopmail.com", "adminpass123")
agent = staff_tokens("agent.yaba@yopmail.com", "agentpass123")


def pin(phone):
    b = {"phone": phone, "pin": "1234"}
    return (call(DJ, "POST", "/api/v1/auth/pin/login/", b)[1].get("access"),
            call(GO, "POST", "/api/v1/auth/pin/login/", b)[1].get("access"))


owner, fdriver = pin("+2348022220001"), pin("+2348011110002")
V, M = "/api/v1/mobility/vehicles/", "/api/v1/mobility/vehicle-models/"
PHONES = {"django": "+2348039990061", "go": "+2348039990062"}
BASE = {"django": DJ, "go": GO}
purge_phones(PHONES.values())
sql("DELETE FROM mobility_vehiclemodel WHERE make LIKE 'CT %'")

for label, tok in [("ops", ops), ("admin", admin), ("agent", agent), ("owner", owner), ("fleet driver", fdriver)]:
    both(f"list as {label}", "GET", V + "?page_size=50", tokens=tok)
    both(f"stats as {label}", "GET", V + "stats/", tokens=tok)
    both(f"models as {label}", "GET", V + "models/", tokens=tok)
acct = sql("SELECT id FROM accounts_account WHERE kura_id = 'KR-FLEET-VCU'")[0][0]
for q in ["?status=ACTIVE", f"?account={acct}", "?account=bad", "?q=fleet", "?q=honda", "?ordering=registration_plate",
          "?page_size=3&page=2"]:
    both(f"list {q}", "GET", V + q, tokens=ops)


def sorted_col(name, path, key, tok):
    """Single-column ordering: ties come back in plan order, compare the column."""
    d, g = call(DJ, "GET", path, token=tok[0]), call(GO, "GET", path, token=tok[1])
    check(name, (d[0], [r[key] for r in d[1]["results"]]), (g[0], [r[key] for r in g[1]["results"]]))


sorted_col("list ?ordering=-status", V + "?ordering=-status&page_size=50", "status", ops)
_, lst = call(DJ, "GET", V + "?page_size=50", token=ops[0])
call(GO, "GET", V + "?page_size=50", token=ops[1])
fresh()
for v in lst["results"]:
    both(f"detail {v['registration_plate']}", "GET", f"{V}{v['id']}/", tokens=ops)
    both(f"assignments {v['registration_plate']}", "GET", f"{V}{v['id']}/assignments/", tokens=ops)
    both(f"commands {v['registration_plate']}", "GET", f"{V}{v['id']}/commands/", tokens=ops)
fresh()
own_v = call(DJ, "GET", V, token=owner[0])[1]["results"][0]["id"]
call(GO, "GET", V, token=owner[1])
both("detail as owner", "GET", f"{V}{own_v}/", tokens=owner)
both("detail as fleet driver (not owner → 403)", "GET",
     f"{V}{call(DJ, 'GET', V, token=fdriver[0])[1]['results'][0]['id']}/", tokens=fdriver)
both("detail other as owner (404)", "GET", f"{V}{lst['results'][-1]['id']}/", tokens=owner)
for label, tok in [("ops", ops), ("owner", owner)]:
    d = call(DJ, "GET", V + "export/", token=tok[0], raw=True)
    g = call(GO, "GET", V + "export/", token=tok[1], raw=True)
    check(f"export as {label}", (d[0], d[1].decode()), (g[0], g[1].decode()))

# Vehicle models
for q in ["", "?vehicle_type=MOTORCYCLE", "?q=hon", "?battery_type=bad"]:
    both(f"models list {q or '(default)'}", "GET", M + q, tokens=ops)
sorted_col("models ?ordering=-make", M + "?ordering=-make", "make", ops)
both("models stats", "GET", M + "stats/", tokens=ops)
models = call(DJ, "GET", M, token=ops[0])[1]["results"]
for m in models:
    both(f"model detail {m['model']}", "GET", f"{M}{m['id']}/", tokens=ops)
btype = models[0]["battery_type"]
both("model create: empty", "POST", M, {}, admin)
both("model create: bad", "POST", M, {"make": "", "model": "x", "vehicle_type": "BOAT", "battery_type": "nope",
                                     "service_interval_km": 0}, admin)
both("model create: duplicate", "POST", M, {"make": models[0]["make"], "model": models[0]["model"],
                                           "vehicle_type": "x", "battery_type": btype}, admin)
mm = {}
for k, tok in (("django", admin[0]), ("go", admin[1])):
    mm[k] = call(BASE[k], "POST", M, {"make": f" CT {k} ", "model": " Volt ", "vehicle_type": "e-keke",
                                      "battery_type": btype, "service_interval_km": 500}, tok)
check("model create", (mm["django"][0], {**mm["django"][1], "make": "x"}), (mm["go"][0], {**mm["go"][1], "make": "x"}),
      extra=("id", "created_at", "updated_at"))
for name, body in [("model patch", {"model": "Volt 2", "service_interval_km": None, "service_interval_days": 30,
                                    "vehicle_type": "boat"}),
                   ("model patch: clash", {"make": models[0]["make"], "model": models[0]["model"]})]:
    out = {k: call(BASE[k], "PATCH", f"{M}{mm[k][1]['id']}/", body, tok) for k, tok in
           (("django", admin[0]), ("go", admin[1]))}
    strip = lambda x: {**x[1], "make": "x"} if "make" in x[1] else x[1]  # noqa: E731
    check(name, (out["django"][0], strip(out["django"])), (out["go"][0], strip(out["go"])),
          extra=("id", "created_at", "updated_at"))

# Vehicle writes on a fresh rider per backend.
fresh()
rider = {k: new_rider(BASE[k], PHONES[k]) for k in PHONES}
account = {k: sql(f"SELECT a.id FROM accounts_account a JOIN accounts_user u ON u.id = a.owner_user_id WHERE "
                  f"u.phone = '{PHONES[k]}'")[0][0] for k in PHONES}
driver = {k: sql(f"SELECT d.id FROM accounts_driver d JOIN accounts_user u ON u.id = d.user_id WHERE "
                 f"u.phone = '{PHONES[k]}'")[0][0] for k in PHONES}
model = models[0]["id"]
PLATE = {"django": "CTDJ001", "go": "CTGO001"}
SCRUB = ("id", "registration_plate", "account_id", "owner_name", "owner_kura_id", "created_at", "updated_at",
         "hardware_id", "assigned_driver_id", "assigned_driver_name", "vehicle_id", "qr", "expires_at", "api_key",
         "driver_id", "driver_name", "driver_phone", "starts_at", "ends_at", "account", "vin")
made = {}


def step(name, method, path, body=None, who="rider"):
    out = {}
    for k in ("django", "go"):
        tok = {"rider": rider[k], "admin": admin[0 if k == "django" else 1],
               "agent": agent[0 if k == "django" else 1]}[who]
        out[k] = call(BASE[k], method, path(k) if callable(path) else path, body(k) if callable(body) else body, tok)
    check(name, out["django"], out["go"], extra=SCRUB)
    return out


step("rider create: missing", "POST", V, {})
step("rider create: blank plate", "POST", V, {"registration_plate": "", "vehicle_model_id": model})
step("rider create: foreign account", "POST", V, {"account_id": acct, "vehicle_model_id": model,
                                                   "registration_plate": "CTX1"})
out = step("rider create (own account defaulted)", "POST", V,
           lambda k: {"vehicle_model_id": model, "registration_plate": f" {PLATE[k].lower()} ",
                      "hardware_id": f" hw-{k} ", "vin": " vin1 "})
made = {k: out[k][1]["id"] for k in out}
step("create: duplicate plate", "POST", V, lambda k: {"vehicle_model_id": model, "registration_plate": PLATE[k]})
step("create: duplicate hardware", "POST", V, lambda k: {"vehicle_model_id": model, "registration_plate": PLATE[k] + "B",
                                                          "hardware_id": f"HW-{k.upper()}"})
step("admin create second (promotes fleet)", "POST", V,
     lambda k: {"account_id": account[k], "vehicle_model_id": model, "registration_plate": PLATE[k] + "B"},
     who="admin")
P = lambda suffix="": (lambda k: f"{V}{made[k]}/{suffix}")  # noqa: E731
step("rider detail", "GET", P())
step("patch", "PATCH", P(), lambda k: {"vin": "abc", "hardware_id": f"hw-{k}-2", "status": "PENDING"}, who="admin")
step("patch: clear hardware", "PATCH", P(), {"hardware_id": None}, who="admin")
step("status", "POST", P("status/"), {"status": "SUSPENDED"}, who="admin")
step("status: bad", "POST", P("status/"), {"status": "NOPE"}, who="admin")
step("assign: unknown driver", "POST", P("assign-driver/"), {"driver_id": "00000000-0000-0000-0000-000000000000"},
     who="admin")
step("assign: other account's driver", "POST", P("assign-driver/"),
     {"driver_id": sql("SELECT id FROM accounts_driver ORDER BY created_at LIMIT 1")[0][0]}, who="admin")
step("assign", "POST", P("assign-driver/"), lambda k: {"driver_id": driver[k], "note": " day shift "}, who="admin")
step("reassign", "POST", P("assign-driver/"), lambda k: {"driver_id": driver[k]}, who="admin")
step("clear assignment", "POST", P("assign-driver/"), {"driver_id": None, "note": "off"}, who="admin")
step("assignments", "GET", P("assignments/"), who="admin")
step("command: bad", "POST", P("command/"), {"kind": "LAUNCH"}, who="admin")
step("command", "POST", P("command/"), {"kind": "REQUEST_STATE", "note": " ping "}, who="admin")
step("rotate iot key", "POST", P("rotate-iot-key/"), who="admin")
step("command after key (SENT)", "POST", P("command/"), {"kind": "DRAW_ATTENTION"}, who="admin")
step("commands", "GET", P("commands/"), who="admin")
qrs = step("qr", "GET", P("qr/"))
step("resolve", "POST", V + "resolve/", lambda k: {"token": qrs[k][1]["qr"]}, who="admin")
step("resolve tampered", "POST", V + "resolve/", lambda k: {"token": qrs[k][1]["qr"][:-4] + "beef"}, who="admin")
step("resolve malformed", "POST", V + "resolve/", {"token": "v1.x"}, who="admin")
step("resolve unknown", "POST", V + "resolve/", {"token": "v1.00000000-0000-0000-0000-000000000000.9999999999.ab"},
     who="admin")
step("rotate qr", "POST", P("rotate-qr/"), who="admin")
step("resolve old token after rotate", "POST", V + "resolve/", lambda k: {"token": qrs[k][1]["qr"]}, who="admin")

VOL = [(re.compile(r"CT(DJ|GO)001B?"), "<plate>"), (re.compile(r"[0-9a-f]{8}-[0-9a-f-]{27}"), "<uuid>"),
       (re.compile(r"HW-(DJANGO|GO)(-2)?", re.I), "<hw>"), (re.compile(r"CT (django|go)"), "<make>"),
       (re.compile(r"Rider 00\d\d"), "<name>")]


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


audit = {}
for k in made:
    second = call(BASE[k], "GET", f"{V}?account={account[k]}&ordering=registration_plate", token=admin[0 if k ==
                  "django" else 1])[1]["results"]
    ids = "', '".join([v["id"] for v in second] + [account[k], mm[k][1]["id"]])
    audit[k] = norm(sql(f"SELECT action, before::text, after::text, metadata::text FROM audit_auditevent WHERE "
                        f"subject_id IN ('{ids}') ORDER BY created_at, id"))
check("audit trail", (200, audit["django"]), (200, audit["go"]))
print(f"compared {len(audit['go'])} audit rows")
purge_phones(PHONES.values())
sql("DELETE FROM mobility_vehiclemodel WHERE make LIKE 'CT %'")
sys.exit(1 if summary() else 0)
