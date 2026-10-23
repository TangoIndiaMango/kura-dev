"""Path B: petrol engines (owner-scoped reads, release request → support
case + owner notice, release), retrofit wizard (create → engine intake →
install → checklist → activate, every guard) and the e-boarder fleet
(filters, stats, create / patch, issue on install). Each backend drives its
own vehicle + e-boarders; state is restored afterwards."""
import sys
import uuid

from lib import CUR, DJ, GO, both, call, check, fresh, sql, staff_tokens, summary

ops = staff_tokens()
admin = staff_tokens("admin@yopmail.com", "adminpass123")
agent = staff_tokens("agent.yaba@yopmail.com", "agentpass123")
BASE = {"django": DJ, "go": GO}
login = lambda phone: tuple(call(b, "POST", "/api/v1/auth/pin/login/", {"phone": phone, "pin": "1234"})[1]["access"]  # noqa: E731
                            for b in (DJ, GO))
owner, rider = login("+2348022220001"), login("+2348033330001")
M = "/api/v1/mobility/"
RUN = uuid.uuid4().hex[:6].upper()
MISSING = str(uuid.uuid4())
OPS_ID = sql("SELECT id FROM accounts_user WHERE email = 'ops@yopmail.com'")[0][0]
ADMIN_ID = sql("SELECT id FROM accounts_user WHERE email = 'admin@yopmail.com'")[0][0]
VOL = ("id", "created_at", "updated_at", "issued_at", "activated_at", "released_at", "vehicle_id", "vehicle_reg",
       "petrol_engine_id", "retrofit_id", "eboarder_id", "release_case_id", "release_case_code", "next", "previous")

fresh()
for label, tok in [("admin", admin), ("ops", ops), ("agent", agent), ("owner", owner), ("rider", rider)]:
    both(f"engines as {label}", "GET", M + "engines/", tokens=tok)
    both(f"retrofits as {label}", "GET", M + "retrofits/", tokens=tok)
    both(f"eboarders as {label}", "GET", M + "eboarders/", tokens=tok)
for q in ["?status=STORED", "?q=hon", "?ordering=tag", "?ordering=-tag", "?page_size=1&page=2", "?page=9"]:
    both(f"engines {q}", "GET", M + "engines/" + q, tokens=admin)
for q in ["?status=ACTIVATED", "?awaiting_intake=true", "?q=MK", "?ordering=status"]:
    both(f"retrofits {q}", "GET", M + "retrofits/" + q, tokens=admin)
for q in ["?status=IN_STOCK", "?q=aso", "?ordering=serial", "?hub=bad", f"?hub={uuid.uuid4()}"]:
    both(f"eboarders {q}", "GET", M + "eboarders/" + q, tokens=admin)
both("eboarder stats", "GET", M + "eboarders/stats/", tokens=admin)
for (eid,) in sql("SELECT id FROM mobility_petrolengine ORDER BY tag"):
    both(f"engine {eid[-6:]}", "GET", f"{M}engines/{eid}/", tokens=admin)
    both(f"engine {eid[-6:]} as rider", "GET", f"{M}engines/{eid}/", tokens=rider)
for (rid,) in sql("SELECT id FROM mobility_retrofit ORDER BY created_at"):
    both(f"retrofit {rid[-6:]}", "GET", f"{M}retrofits/{rid}/", tokens=admin)
for (bid,) in sql("SELECT id FROM mobility_eboarder ORDER BY serial"):
    both(f"eboarder {bid[-6:]}", "GET", f"{M}eboarders/{bid}/", tokens=admin)
for kind in ("engines", "retrofits", "eboarders"):
    both(f"{kind} unknown", "GET", f"{M}{kind}/{uuid.uuid4()}/", tokens=admin)

veh = {"django": sql("SELECT id, account_id FROM mobility_vehicle WHERE registration_plate = 'FLEET-NV-01'")[0],
       "go": sql("SELECT id, account_id FROM mobility_vehicle WHERE registration_plate = 'FLEET-NV-02'")[0]}
BT = sql("SELECT id FROM mobility_batterytype ORDER BY name LIMIT 1")[0][0]
HUB = sql("SELECT id FROM mobility_hub ORDER BY code LIMIT 1")[0][0]
TAG = {"django": "D" + RUN, "go": "G" + RUN}
TOK = {"django": admin[0], "go": admin[1]}
ids = {k: {} for k in BASE}


def step(name, method, path, body_for=lambda k: None, tok=TOK, keep=None, extra=(), status_only=False):
    out = {k: call(BASE[k], method, path(k) if callable(path) else path, body_for(k), tok[k]) for k in BASE}
    if status_only:
        check(name, (out["django"][0], {}), (out["go"][0], {}))
    else:
        check(name, out["django"], out["go"], extra=VOL + ("serial", "eboarder_serial", "tag", "petrol_engine_tag",
                                                           "subject_label", "label") + tuple(extra))
    if keep:
        for k in BASE:
            ids[k][keep] = (out[k][1] or {}).get("id")
    return out


fresh()
E = M + "eboarders/"
step("eboarder create: empty", "POST", E, lambda k: {})
step("eboarder create: bad", "POST", E, lambda k: {"serial": "", "model": "x" * 81, "rated_watts": 0,
                                                   "nominal_voltage_v": 5, "battery_type": "nope", "shaft_length": "MID",
                                                   "status": None, "current_hub": MISSING, "raw": [1]})
step("eboarder create: unknown battery type", "POST", E, lambda k: {"serial": "x", "model": "m", "rated_watts": 1,
                                                                    "battery_type": MISSING})
for n in (1, 2, 3):
    step(f"eboarder create {n}", "POST", E, lambda k, n=n: {
        "serial": f" ct-{k[0]}{RUN}-{n} ", "model": "E6", "rated_watts": 6500 if n == 1 else 6000, "battery_type": BT,
        "current_hub": HUB if n == 1 else None, "raw": {"n": n}, "make": "" if n == 2 else "Asobo X"}, keep=f"eb{n}")
step("eboarder create: duplicate serial", "POST", E, lambda k: {"serial": f"CT-{k[0]}{RUN}-1", "model": "E6",
                                                                "rated_watts": 1, "battery_type": BT})
step("eboarder patch", "PATCH", lambda k: f"{E}{ids[k]['eb3']}/", lambda k: {"status": "MAINTENANCE",
                                                                             "current_hub": HUB, "nominal_voltage_v": 72,
                                                                             "make": " Asobo "})
step("eboarder patch: hub null + back in stock", "PATCH", lambda k: f"{E}{ids[k]['eb3']}/",
     lambda k: {"current_hub": None, "status": "IN_STOCK", "petrol_hp_equivalent": "15"})
step("eboarder patch: dup serial", "PATCH", lambda k: f"{E}{ids[k]['eb3']}/", lambda k: {"serial": f"ct-{k[0]}{RUN}-1"})
step("eboarder patch: bad", "PATCH", lambda k: f"{E}{ids[k]['eb3']}/", lambda k: {"rated_watts": "x", "model": ""})

R = M + "retrofits/"
step("retrofit create: empty", "POST", R, lambda k: {})
step("retrofit create: wrong account", "POST", R, lambda k: {"account_id": veh["go" if k == "django" else "django"][1]
                                                             if False else sql("SELECT id FROM accounts_account WHERE "
                                                             "kura_id <> '' ORDER BY kura_id LIMIT 1")[0][0],
                                                             "vehicle_id": veh[k][0]})
for n in ("a", "b"):
    step(f"retrofit create {n}", "POST", R, lambda k: {"account_id": veh[k][1], "vehicle_id": veh[k][0],
                                                       "eboarder_serial": " pre ", "raw": {"src": "ct"}}, keep=n)
RA = lambda k: f"{R}{ids[k]['a']}/"  # noqa: E731
RB = lambda k: f"{R}{ids[k]['b']}/"  # noqa: E731
intake = lambda k, tag, **x: {"tag": tag, "witness_user_id": OPS_ID, "photo_asset_ids": ["https://placehold.co/600?text=Intake+hull", "abc/def.png"],  # noqa: E731
                              "signature_asset_id": "sig-1", "make": "Honda", "hp": "15", **x}
step("install before intake", "POST", lambda k: RA(k) + "install/", lambda k: {"eboarder_serial": "x"})
step("intake: bad", "POST", lambda k: RA(k) + "engine-intake/", lambda k: {"tag": "", "photo_asset_ids": [],
                                                                           "condition_grade": "MINT", "raw": "x"})
step("intake: bad photo items", "POST", lambda k: RA(k) + "engine-intake/",
     lambda k: intake(k, "T", photo_asset_ids=["", None, "x" * 256, "ok"]))
step("intake: self witness", "POST", lambda k: RA(k) + "engine-intake/", lambda k: intake(k, "T", witness_user_id=ADMIN_ID))
step("intake: unknown witness", "POST", lambda k: RA(k) + "engine-intake/",
     lambda k: intake(k, "T", witness_user_id=str(uuid.uuid4())))
step("intake: duplicate tag", "POST", lambda k: RA(k) + "engine-intake/",
     lambda k: intake(k, sql("SELECT tag FROM mobility_petrolengine ORDER BY tag LIMIT 1")[0][0].lower()))
step("intake a", "POST", lambda k: RA(k) + "engine-intake/", lambda k: intake(k, TAG[k].lower() + "a",
                                                                               storage_hub_id=HUB, condition_grade="FAIR"))
step("intake a again", "POST", lambda k: RA(k) + "engine-intake/", lambda k: intake(k, TAG[k] + "Z"))
step("intake b", "POST", lambda k: RB(k) + "engine-intake/", lambda k: intake(k, TAG[k] + "B", raw={"x": 1}))
step("install: nothing", "POST", lambda k: RA(k) + "install/", lambda k: {"eboarder_serial": " "})
step("checklist before install", "POST", lambda k: RA(k) + "checklist/", lambda k: {"checklist": {"hull": True}})
step("install a (eboarder id)", "POST", lambda k: RA(k) + "install/", lambda k: {"eboarder_id": ids[k]["eb1"],
                                                                                 "photo_asset_ids": ["p1"]})
step("install b: vehicle has eboarder", "POST", lambda k: RB(k) + "install/", lambda k: {"eboarder_serial": f"CT-{k[0]}{RUN}-2"})
step("install b: unknown serial", "POST", lambda k: RB(k) + "install/", lambda k: {"eboarder_serial": "no-such"})
step("checklist: bad", "POST", lambda k: RA(k) + "checklist/", lambda k: {"checklist": {"hull": "maybe", "x": None}})
step("checklist: unknown keys", "POST", lambda k: RA(k) + "checklist/", lambda k: {"checklist": {"zeta": True, "alpha": 1}})
step("checklist: not a dict", "POST", lambda k: RA(k) + "checklist/", lambda k: {"checklist": [1]})
step("activate before checks", "POST", lambda k: RA(k) + "activate/")
step("checklist a: all pass", "POST", lambda k: RA(k) + "checklist/", lambda k: {"checklist": {
    "hull": True, "mount": "yes", "throttle": 1, "kill": "true", "cable": True, "float": True}})
step("activate a", "POST", lambda k: RA(k) + "activate/")
step("activate a again", "POST", lambda k: RA(k) + "activate/")
step("checklist b: fail", "POST", lambda k: RB(k) + "checklist/", lambda k: {"checklist": {"hull": True},
                                                                             "failure_reason": " leak "})
step("activate b (failed)", "POST", lambda k: RB(k) + "activate/")

# Engine custody on retrofit a's engine.
eng = {k: sql(f"SELECT petrol_engine_id FROM mobility_retrofit WHERE id = '{ids[k]['a']}'")[0][0] for k in BASE}
EN = lambda k: f"{M}engines/{eng[k]}/"  # noqa: E731
step("engine detail", "GET", EN)
step("engine detail as owner", "GET", EN, tok={"django": owner[0], "go": owner[1]})
step("engine as other rider (404)", "GET", EN, tok={"django": rider[0], "go": rider[1]})
step("release before request", "POST", lambda k: EN(k) + "release/", lambda k: {"photo_asset_ids": ["r1"],
                                                                                "signature_asset_id": "s"})
step("release request: bad note", "POST", lambda k: EN(k) + "release-request/", lambda k: {"note": "x" * 501})
step("release request as other rider", "POST", lambda k: EN(k) + "release-request/", lambda k: {},
     tok={"django": rider[0], "go": rider[1]})
step("release request as owner", "POST", lambda k: EN(k) + "release-request/", lambda k: {"note": " please "},
     tok={"django": owner[0], "go": owner[1]})
step("release request again", "POST", lambda k: EN(k) + "release-request/", lambda k: {})
step("release as owner (403)", "POST", lambda k: EN(k) + "release/", lambda k: {}, tok={"django": owner[0], "go": owner[1]})
step("release: bad", "POST", lambda k: EN(k) + "release/", lambda k: {"photo_asset_ids": [], "signature_asset_id": " "})
step("release: not a list", "POST", lambda k: EN(k) + "release/", lambda k: {"photo_asset_ids": "r1", "signature_asset_id": "s"})
step("release", "POST", lambda k: EN(k) + "release/", lambda k: {"photo_asset_ids": ["r1", 7], "signature_asset_id": " s2 "})
step("eboarder 1 after install", "GET", lambda k: f"{E}{ids[k]['eb1']}/")
step("eboarder stats after", "GET", E + "stats/", status_only=True)

norm = lambda rows: [tuple(r) for r in rows]  # noqa: E731
for k in BASE:
    ids[k]["case"] = sql(f"SELECT raw->>'release_case_id' FROM mobility_petrolengine WHERE id = '{eng[k]}'")[0][0]
rows = {k: norm(sql(f"SELECT kind, priority, subject LIKE 'Engine release — %', status FROM support_supportcase "
                    f"WHERE id = '{ids[k]['case']}'")) for k in BASE}
check("db: release case", (200, rows["django"]), (200, rows["go"]))
rows = {k: norm(sql(f"SELECT acquisition_path, petrol_engine_id = '{eng[k]}' FROM mobility_vehicle WHERE id = '{veh[k][0]}'"))
        for k in BASE}
check("db: vehicle", (200, rows["django"]), (200, rows["go"]))
subjects = {k: "'" + "','".join([ids[k]["a"], ids[k]["b"], eng[k], ids[k]["eb1"], ids[k]["eb2"], ids[k]["eb3"]]) + "'"
            for k in BASE}
rows = {k: norm(sql(f"SELECT action, subject_type, before - 'vehicle_id' - 'serial', after - 'retrofit_id' - 'vehicle_id' - "
                    f"'account_id' - 'case_id' - 'case_code' - 'eboarder_id' - 'serial' - 'tag' - 'eboarder_serial' - "
                    f"'released_at' - 'activated_at' - 'battery_type_id' - 'current_hub_id' - 'release_by_id' "
                    f"FROM audit_auditevent WHERE subject_id IN ({subjects[k]}) ORDER BY created_at")) for k in BASE}
check("db: audit", (200, rows["django"]), (200, rows["go"]))
rows = {k: norm(sql("SELECT n.template_code, n.title, n.channel FROM notifications_notification n JOIN accounts_user u "
                    "ON u.id = n.user_id WHERE u.phone = '+2348022220001' AND n.template_code = "
                    f"'engine.release_requested' AND n.body LIKE '{TAG[k]}A%' ORDER BY n.channel")) for k in BASE}
check("db: owner notice", (200, rows["django"]), (200, rows["go"]))

for k in BASE:
    sql(f"UPDATE mobility_vehicle SET acquisition_path = 'EV_FIRST', petrol_engine_id = NULL WHERE id = '{veh[k][0]}'")
    sql(f"DELETE FROM mobility_retrofit WHERE id IN ('{ids[k]['a']}', '{ids[k]['b']}')")
    sql(f"DELETE FROM mobility_petrolengine WHERE tag LIKE '{TAG[k]}%'")
    sql(f"DELETE FROM mobility_eboarder WHERE serial LIKE 'CT-{k[0].upper()}{RUN}-%'")
sys.exit(1 if summary() else 0)
