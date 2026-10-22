"""Reservations + swaps (the bay): hold → lookup → start → return → issue →
complete, walk-ins, the legacy one-shot, abort, reverse, extend / cancel,
velocity block + exception, identity mismatch, rider PIN, hub status.
Each backend gets its own CT hub (slots + packs) and a fresh rider."""
import os
import subprocess
import sys
import uuid

from lib import CUR, DJ, GO, call, check, fresh, new_rider, purge_phones, sql, staff_tokens, summary

ops = staff_tokens()
admin = staff_tokens("admin@yopmail.com", "adminpass123")
BASE = {"django": DJ, "go": GO}
IX = {"django": 0, "go": 1}
K = {"django": "DJ", "go": "GO"}
PHONES = {"django": "+2348039990111", "go": "+2348039990112"}
R, S, V = "/api/v1/mobility/reservations/", "/api/v1/mobility/swaps/", "/api/v1/mobility/vehicles/"
BACKEND = os.path.join(os.path.dirname(__file__), "..", "..", "..", "backend")
MODEL = sql("SELECT id, battery_type_id FROM mobility_vehiclemodel WHERE vehicle_type = 'MOTORCYCLE' ORDER BY created_at LIMIT 1")[0]


def cleanup():
    hubs = "SELECT id FROM mobility_hub WHERE code LIKE 'CT-BAY-%'"
    bats = "SELECT id FROM mobility_battery WHERE serial LIKE 'CT-BAY-%'"
    sql(f"""DELETE FROM operations_override WHERE swap_id IN (SELECT id FROM mobility_swap WHERE hub_id IN ({hubs}));
      DELETE FROM mobility_batteryevent WHERE battery_id IN ({bats}) OR hub_id IN ({hubs});
      UPDATE mobility_vehicle SET current_battery_id = NULL WHERE current_battery_id IN ({bats});
      DELETE FROM mobility_discountredemption WHERE subscription_id IS NULL AND payment_id IN
        (SELECT id FROM finance_payment WHERE hub_id IN ({hubs}));
      DELETE FROM mobility_swap WHERE hub_id IN ({hubs});
      DELETE FROM mobility_reservation WHERE hub_id IN ({hubs});
      DELETE FROM operations_cashdeposit WHERE hub_id IN ({hubs});
      DELETE FROM operations_shift WHERE hub_id IN ({hubs});
      DELETE FROM finance_payment WHERE hub_id IN ({hubs});
      DELETE FROM mobility_hubslot WHERE hub_id IN ({hubs});
      DELETE FROM risk_riskvelocitygrant WHERE risk_event_id IN (SELECT id FROM risk_riskevent WHERE subject_id IN
        (SELECT v.id::text FROM mobility_vehicle v JOIN accounts_account a ON a.id = v.account_id JOIN accounts_user u
         ON u.id = a.owner_user_id WHERE u.phone IN ('{PHONES['django']}', '{PHONES['go']}')));
      DELETE FROM risk_riskevent WHERE subject_id IN (SELECT v.id::text FROM mobility_vehicle v JOIN accounts_account a
        ON a.id = v.account_id JOIN accounts_user u ON u.id = a.owner_user_id WHERE u.phone IN
        ('{PHONES['django']}', '{PHONES['go']}'));
      DELETE FROM mobility_battery WHERE serial LIKE 'CT-BAY-%';
      DELETE FROM mobility_hub WHERE code LIKE 'CT-BAY-%'""")


def purge():
    pa = ("SELECT a.id FROM accounts_account a JOIN accounts_user u ON u.id = a.owner_user_id WHERE u.phone IN "
          f"('{PHONES['django']}', '{PHONES['go']}')")
    sql(f"""DELETE FROM operations_override WHERE swap_id IN (SELECT id FROM mobility_swap WHERE account_id IN ({pa}));
      DELETE FROM mobility_swap WHERE account_id IN ({pa});
      DELETE FROM mobility_reservation WHERE account_id IN ({pa});
      DELETE FROM operations_cashdeposit WHERE account_id IN ({pa});
      DELETE FROM support_caseevent WHERE case_id IN (SELECT id FROM support_supportcase WHERE account_id IN ({pa}));
      DELETE FROM support_supportcase WHERE account_id IN ({pa})""")
    purge_phones(PHONES.values())


def mint_grant(email):
    code = ("from accounts.models import User; from accounts.services.auth import issue_pin_grant; "
            f"print(issue_pin_grant(User.objects.get(email='{email}'))['pin_grant'])")
    out = subprocess.run(["uv", "run", "python", "manage.py", "shell", "-c", code], cwd=BACKEND, check=True,
                         capture_output=True, text=True).stdout.strip().splitlines()
    return out[-1]


cleanup()
purge()
hub, slots = {}, {}
for k in BASE:
    code = f"CT-BAY-{K[k]}"
    sql(f"""INSERT INTO mobility_hub (id, created_at, updated_at, code, name, address, lat, lng, slot_count,
        solar_capacity_kw, status, operating_hours, timezone) SELECT gen_random_uuid(), now(), now(), '{code}',
        'CT bay {K[k]}', address, lat, lng, 6, solar_capacity_kw, 'ONLINE', '{{}}', timezone FROM mobility_hub
        WHERE code = 'HUB-YBA-01'""")
    hub[k] = sql(f"SELECT id FROM mobility_hub WHERE code = '{code}'")[0][0]
    for n in range(1, 7):
        bid, sid = str(uuid.uuid4()), str(uuid.uuid4())
        filled = n <= 5
        sql(f"""INSERT INTO mobility_hubslot (id, created_at, updated_at, slot_no, state, battery_id, hub_id)
            VALUES ('{sid}', now(), now(), {n}, '{"READY" if filled else "EMPTY"}', NULL, '{hub[k]}')""")
        if filled:
            sql(f"""INSERT INTO mobility_battery (id, created_at, updated_at, serial, status, charge_pct, health_pct,
                cycle_count, battery_type_id, current_hub_id, custodian_id, custodian_type, qr_secret, charge_source)
                VALUES ('{bid}', now() + interval '{n} second', now(), 'CT-BAY-{K[k]}-{n}', 'AVAILABLE', 100, 100, 0,
                '{MODEL[1]}', '{hub[k]}', '{sid}', 'HUB_SLOT', '', 'MANUAL');
                UPDATE mobility_hubslot SET battery_id = '{bid}' WHERE id = '{sid}'""")
fresh()
rider = {k: new_rider(BASE[k], PHONES[k]) for k in BASE}
account = {k: sql(f"SELECT a.id FROM accounts_account a JOIN accounts_user u ON u.id = a.owner_user_id WHERE "
                  f"u.phone = '{PHONES[k]}'")[0][0] for k in BASE}
driver = {k: sql(f"SELECT d.id FROM accounts_driver d JOIN accounts_user u ON u.id = d.user_id WHERE "
                 f"u.phone = '{PHONES[k]}'")[0][0] for k in BASE}
veh = {k: {} for k in BASE}
for k in BASE:
    for name in ("A", "B", "C", "D"):
        body = {"vehicle_model_id": MODEL[0], "registration_plate": f"CTB{K[k]}{name}"}
        if name != "A":
            body["account_id"] = account[k]
        out = call(BASE[k], "POST", V, body, admin[IX[k]] if name != "A" else rider[k])
        assert out[0] == 201, out
        veh[k][name] = out[1]["id"]
    call(BASE[k], "GET", "/api/v1/finance/wallets/mine/", token=rider[k])
    sql(f"UPDATE finance_wallet SET balance_kobo = 1000000 WHERE account_id = '{account[k]}'")
    sql(f"UPDATE accounts_account SET kyc_status = 'VERIFIED' WHERE id = '{account[k]}'")
GRANT = {k: call(BASE[k], "POST", "/api/v1/auth/pin/verify/", {"pin": "1234"}, rider[k])[1]["pin_grant"] for k in BASE}
SCRUB = ("id", "account", "vehicle", "driver", "hub", "battery", "code", "qr", "expires_at", "created_at", "updated_at",
         "hub_name", "hub_code", "vehicle_plate", "driver_name", "driver_phone", "client_event_id", "started_at",
         "completed_at", "reservation", "payment", "payment_id", "subscription", "returned_serial", "issued_serial",
         "agent", "reservation_expires_at", "override_id", "risk_event_id", "case_id", "case_code", "registration",
         "pin_grant", "retry_after_seconds", "elapsed_seconds", "vehicle_id", "swap_id", "reservation_hub_id",
         "presented_hub_id", "reservation_hub_code", "name", "triage_reason", "message", "last_sync_at")


def step(name, method, path, body=None, who="rider", extra=()):
    out = {}
    for k in BASE:
        tok = rider[k] if who == "rider" else who[IX[k]]
        out[k] = call(BASE[k], method, path(k) if callable(path) else path, body(k) if callable(body) else body, tok)
    check(name, out["django"], out["go"], extra=SCRUB + tuple(extra))
    return out


def ids(out, key="id"):
    return {k: out[k][1][key] for k in BASE}


# --- Reads -------------------------------------------------------------------
for label, tok in [("ops", ops), ("admin", admin)]:
    for path in (R, S):
        d, g = call(DJ, "GET", path, token=tok[0]), call(GO, "GET", path, token=tok[1])
        check(f"{path.split('/')[-2]} as {label}", d, g, extra=CUR + SCRUB)
for q in ["?status=ACTIVE", "?status=expired", "?payment_mode=WALLET", "?hub=bad", "?code=KB-0000",
          "?start_date=2026-01-01"]:
    d, g = call(DJ, "GET", R + q, token=ops[0]), call(GO, "GET", R + q, token=ops[1])
    check(f"reservations {q}", d, g, extra=CUR + SCRUB)
for q in ["?status=COMPLETED", "?payment_mode=CASH", "?battery=bad", "?agent=bad", "?end_date=2030-01-01"]:
    d, g = call(DJ, "GET", S + q, token=ops[0]), call(GO, "GET", S + q, token=ops[1])
    check(f"swaps {q}", d, g, extra=CUR + SCRUB)
for (sid,) in sql("SELECT id FROM mobility_swap ORDER BY created_at LIMIT 5"):
    step(f"swap {sid[-6:]} as ops", "GET", f"{S}{sid}/", who=ops)

# --- Reservation hold → bay session (vehicle A) --------------------------------
# Django 500s on an unknown vehicle (.get()); Go answers 404.
_d = call(DJ, "POST", R, {"vehicle": str(uuid.uuid4()), "hub": hub["django"]}, rider["django"])
_g = call(GO, "POST", R, {"vehicle": str(uuid.uuid4()), "hub": hub["go"]}, rider["go"])
check("reserve: unknown vehicle (django 500 → go 404)", (_d[0], None), (500 if _g[0] == 404 else _g[0], None))
step("reserve: bad discount", "POST", R, lambda k: {"vehicle": veh[k]["A"], "hub": hub[k], "discount_code": "NOPE"})
res = step("reserve A (wallet hold)", "POST", R, lambda k: {"vehicle": veh[k]["A"], "hub": hub[k]})
rid = ids(res)
step("reserve A again (same hold)", "POST", R, lambda k: {"vehicle": veh[k]["A"], "hub": hub[k]})
step("list mine", "GET", R, extra=CUR)
step("detail", "GET", lambda k: f"{R}{rid[k]}/")
step("lookup: empty", "POST", R + "lookup/", {}, who=ops)
step("lookup: unknown code", "POST", R + "lookup/", {"code": "KB-XXXX"}, who=ops)
step("lookup by code", "POST", R + "lookup/", lambda k: {"code": res[k][1]["code"].lower()}, who=ops)
step("lookup by QR", "POST", R + "lookup/", lambda k: {"token": res[k][1]["qr"], "hub_id": hub[k]}, who=ops)
step("lookup: wrong hub", "POST", R + "lookup/", lambda k: {"token": res[k][1]["qr"], "hub_id": str(uuid.uuid4())},
     who=ops)
step("lookup: bad token", "POST", R + "lookup/", {"token": "v1.x.1.y"}, who=ops)
step("extend: bad", "POST", lambda k: f"{R}{rid[k]}/extend/", {"minutes": 99}, who=ops)
step("extend", "POST", lambda k: f"{R}{rid[k]}/extend/", {"minutes": 5, "reason": "traffic"}, who=ops)
step("extend: rider lacks override", "POST", lambda k: f"{R}{rid[k]}/extend/", {"minutes": 5})
step("start: empty", "POST", S + "start/", {}, who=ops)
step("start: no vehicle", "POST", S + "start/", lambda k: {"hub_id": hub[k], "client_event_id": "x"}, who=ops)
step("start: walk-in missing ids", "POST", S + "start/", lambda k: {"hub_id": hub[k], "client_event_id": f"ct-w-{k}",
                                                                     "vehicle_id": veh[k]["B"]}, who=ops)
st = step("start with reservation", "POST", S + "start/", lambda k: {"hub_id": hub[k], "client_event_id": f"ct-a-{k}",
                                                                     "reservation_id": rid[k]}, who=ops)
sw = ids(st)
step("start replay (same client id)", "POST", S + "start/", lambda k: {"hub_id": hub[k], "client_event_id": f"ct-a-{k}",
                                                                       "reservation_id": rid[k]}, who=ops)
step("return on first swap", "POST", lambda k: f"{S}{sw[k]}/return/", lambda k: {"battery_serial": f"CT-BAY-{K[k]}-2"},
     who=ops)
step("complete before issue", "POST", lambda k: f"{S}{sw[k]}/complete/", {}, who=ops)
step("issue: unknown", "POST", lambda k: f"{S}{sw[k]}/issue/", {"battery_serial": "NOPE"}, who=ops)
step("issue: reserved for another", "POST", lambda k: f"{S}{sw[k]}/issue/",
     lambda k: {"battery_serial": f"CT-BAY-{K[k]}-1" if False else f"CT-BAY-{K[k]}-1"}, who=ops)
step("issue own reserved pack", "POST", lambda k: f"{S}{sw[k]}/issue/", lambda k: {"battery_serial": f"CT-BAY-{K[k]}-1",
                                                                                   "charge_pct": 97}, who=ops)
step("complete: code on a fixed hold", "POST", lambda k: f"{S}{sw[k]}/complete/", {"discount_code": "X"}, who=ops)
# Django echoes the stale (pre-save) reservation status here; Go the saved USED.
step("complete (captures hold)", "POST", lambda k: f"{S}{sw[k]}/complete/", {}, who=ops, extra=("reservation_status",))
step("complete again", "POST", lambda k: f"{S}{sw[k]}/complete/", {}, who=ops)
step("detail as rider", "GET", lambda k: f"{S}{sw[k]}/")
step("reservation after", "GET", lambda k: f"{R}{rid[k]}/")
step("velocity status (blocked)", "GET", lambda k: f"{S}velocity-status/?vehicle_id={veh[k]['A']}", who=ops)
step("start again → throttled", "POST", S + "start/", lambda k: {"hub_id": hub[k], "client_event_id": f"ct-a2-{k}",
                                                                   "vehicle_id": veh[k]["A"], "driver_id": driver[k],
                                                                   "account_id": account[k]}, who=ops)
step("request exception: empty", "POST", S + "request-velocity-exception/", {}, who=ops)
step("request exception", "POST", S + "request-velocity-exception/",
     lambda k: {"vehicle_id": veh[k]["A"], "note": " rider stranded ", "hub_id": hub[k]}, who=ops)
step("velocity status (requested)", "GET", lambda k: f"{S}velocity-status/?vehicle_id={veh[k]['A']}", who=ops)
step("velocity status: bad", "GET", f"{S}velocity-status/?vehicle_id=x", who=ops)
step("reverse: no reason", "POST", lambda k: f"{S}{sw[k]}/reverse/", {}, who=admin)
step("reverse", "POST", lambda k: f"{S}{sw[k]}/reverse/", {"reason": "wrong pack"}, who=admin)
step("reverse again", "POST", lambda k: f"{S}{sw[k]}/reverse/", {"reason": "x"}, who=admin)

# --- Walk-in (vehicle B) with rider PIN + override ----------------------------
ogrant = {"django": mint_grant("ops@yopmail.com"), "go": mint_grant("ops@yopmail.com")}
st = step("walk-in start", "POST", S + "start/", lambda k: {"hub_id": hub[k], "client_event_id": f"ct-b-{k}",
                                                             "vehicle_id": veh[k]["B"], "driver_id": driver[k],
                                                             "account_id": account[k]}, who=ops)
wb = ids(st)
step("walk-in issue (first swap)", "POST", lambda k: f"{S}{wb[k]}/issue/", lambda k: {"battery_serial": f"CT-BAY-{K[k]}-3"},
     who=ops)
step("walk-in complete: no PIN", "POST", lambda k: f"{S}{wb[k]}/complete/", {}, who=ops)
step("verify rider PIN: bad", "POST", S + "verify-rider-pin/", lambda k: {"account_id": account[k], "pin": "0000"}, who=ops)
pin = step("verify rider PIN", "POST", S + "verify-rider-pin/", lambda k: {"account_id": account[k], "pin": "1234"}, who=ops)
step("walk-in complete (PIN + override)", "POST", lambda k: f"{S}{wb[k]}/complete/",
     lambda k: {"rider_pin_grant": pin[k][1]["pin_grant"], "amount_kobo": 1,
                "override": {"reason": "bay_triage", "note": "CT override walk-in", "agent_pin_grant": ogrant[k]}},
     who=ops)

# --- Hold C: cancel / abort paths --------------------------------------------
rc = ids(step("reserve C", "POST", R, lambda k: {"vehicle": veh[k]["C"], "hub": hub[k]}))
sc = ids(step("start C", "POST", S + "start/", lambda k: {"hub_id": hub[k], "client_event_id": f"ct-c-{k}",
                                                           "reservation_id": rc[k]}, who=ops))
step("issue C", "POST", lambda k: f"{S}{sc[k]}/issue/", lambda k: {"battery_serial": f"CT-BAY-{K[k]}-4"}, who=ops)
step("cancel C (aborts session)", "POST", lambda k: f"{R}{rc[k]}/cancel/", {})
step("swap C after cancel", "GET", lambda k: f"{S}{sc[k]}/", who=ops)
step("abort aborted", "POST", lambda k: f"{S}{sc[k]}/abort/", {}, who=ops)
step("cancel cancelled", "POST", lambda k: f"{R}{rc[k]}/cancel/", {})

# --- Legacy one-shot (vehicle D, cash) ---------------------------------------
step("legacy: empty", "POST", S + "complete/", {}, who=ops)
step("legacy: unknown issued", "POST", S + "complete/", lambda k: {"hub_id": hub[k], "vehicle_id": veh[k]["D"],
                                                                    "driver_id": driver[k], "account_id": account[k],
                                                                    "issued_battery_serial": "NOPE"}, who=ops)
step("legacy cash", "POST", S + "complete/", lambda k: {"hub_id": hub[k], "vehicle_id": veh[k]["D"], "driver_id": driver[k],
                                                         "account_id": account[k], "issued_battery_serial": f"CT-BAY-{K[k]}-5",
                                                         "payment_mode": "CASH", "amount_kobo": 50000}, who=ops)
step("identity mismatch", "POST", S + "identity-mismatch/", lambda k: {"account_id": account[k], "reason": " face differs ",
                                                                         "hub_id": hub[k]}, who=ops)
step("hub status: bad", "POST", lambda k: f"/api/v1/mobility/hubs/{hub[k]}/status/", {"status": "GONE"}, who=admin)
rh = ids(step("reserve before closing", "POST", R, lambda k: {"vehicle": veh[k]["C"], "hub": hub[k]}))
step("hub → MAINTENANCE (cancels holds)", "POST", lambda k: f"/api/v1/mobility/hubs/{hub[k]}/status/",
     {"status": "MAINTENANCE", "note": "pump"}, who=admin)
step("reservation after hub down", "GET", lambda k: f"{R}{rh[k]}/")
step("reserve at closed hub", "POST", R, lambda k: {"vehicle": veh[k]["C"], "hub": hub[k]})

norm = lambda rows: [tuple(r) for r in rows]  # noqa: E731
for name, q in [
    ("swaps", "SELECT status, payment_mode, amount_kobo, vat_kobo, mismatch_flag, source, issued_charge_pct, "
              "returned_charge_pct, payment_id IS NOT NULL FROM mobility_swap WHERE hub_id = '{h}' ORDER BY created_at"),
    ("reservations", "SELECT status, payment_mode, hold_amount_kobo, source, list_price_kobo FROM mobility_reservation "
                     "WHERE hub_id = '{h}' ORDER BY created_at"),
    ("packs", "SELECT b.serial, b.status, b.charge_pct, b.custodian_type, b.cycle_count, b.current_hub_id IS NOT NULL, "
              "s.slot_no FROM mobility_battery b LEFT JOIN mobility_hubslot s ON s.battery_id = b.id WHERE b.current_hub_id = "
              "'{h}' OR b.serial LIKE 'CT-BAY-%' AND b.id IN (SELECT battery_id FROM mobility_batteryevent WHERE hub_id = '{h}') "
              "ORDER BY b.serial"),
    ("battery events", "SELECT b.serial, e.event, e.from_custodian_type, e.to_custodian_type, e.charge_pct, e.meta, e.source "
                       "FROM mobility_batteryevent e JOIN mobility_battery b ON b.id = e.battery_id WHERE e.hub_id = '{h}' "
                       "ORDER BY b.serial, e.occurred_at"),
    ("payments", "SELECT channel, purpose, amount_kobo, vat_kobo, status FROM finance_payment WHERE hub_id = '{h}' "
                 "ORDER BY created_at"),
    ("audit", "SELECT action, metadata - 'hub' - 'vehicle' - 'client_event_id' - 'serial' - 'issued' - 'returned' - 'code' "
              "- 'reason' - 'case_id' - 'case_code' - 'risk_event_id' - 'hub_id' FROM audit_auditevent WHERE subject_id IN "
              "(SELECT id::text FROM mobility_swap WHERE hub_id = '{h}' UNION SELECT id::text FROM mobility_reservation "
              "WHERE hub_id = '{h}' UNION SELECT '{h}') ORDER BY created_at"),
]:
    d = norm(sql(q.format(h=hub["django"]).replace("CT-BAY-DJ", "X")))
    g = norm(sql(q.format(h=hub["go"]).replace("CT-BAY-GO", "X")))
    d = [tuple(str(x).replace("CT-BAY-DJ", "CT-BAY-X") for x in r) for r in d]
    g = [tuple(str(x).replace("CT-BAY-GO", "CT-BAY-X") for x in r) for r in g]
    check(f"db: {name}", (200, d), (200, g))
for name, q in [
    ("wallet", "SELECT balance_kobo, hold_kobo FROM finance_wallet WHERE account_id = '{a}'"),
    ("notifications", "SELECT title, template_code, channel FROM notifications_notification WHERE user_id = (SELECT "
                      "owner_user_id FROM accounts_account WHERE id = '{a}') ORDER BY title, channel"),
]:
    check(f"db: {name}", (200, norm(sql(q.format(a=account["django"])))), (200, norm(sql(q.format(a=account["go"])))))

cleanup()
purge()
sys.exit(1 if summary() else 0)
