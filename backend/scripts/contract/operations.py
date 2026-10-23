"""Operations: shifts (open / close / lodge), cash deposits (float limit,
SWAP + FUND, receipts, dispute flag), overrides, alerts + rules, inventory
counts, command centre. Writes run on a CT hub + fresh rider per backend."""
import os
import subprocess
import sys
import uuid

from lib import (CUR, DJ, GO, both, call, check, follow, fresh, new_rider, purge_phones, sql, staff_tokens,
                 summary)

ops = staff_tokens()
admin = staff_tokens("admin@yopmail.com", "adminpass123")
agent = staff_tokens("agent.yaba@yopmail.com", "agentpass123")


def pin(phone):
    b = {"phone": phone, "pin": "1234"}
    return (call(DJ, "POST", "/api/v1/auth/pin/login/", b)[1].get("access"),
            call(GO, "POST", "/api/v1/auth/pin/login/", b)[1].get("access"))


owner, other = pin("+2348022220001"), pin("+2348033330001")
O = "/api/v1/operations/"
BASE = {"django": DJ, "go": GO}
IX = {"django": 0, "go": 1}
PHONES = {"django": "+2348039990091", "go": "+2348039990092"}
HUBS = {"django": "CT-OPS-DJ", "go": "CT-OPS-GO"}
RUN = uuid.uuid4().hex[:6]
from lib import DJANGO_DIR as BACKEND  # noqa: E402


def mint_grant(email):
    """issue_pin_grant via Django (staff have no PIN to verify)."""
    code = ("from accounts.models import User; from accounts.services.auth import issue_pin_grant; "
            f"print(issue_pin_grant(User.objects.get(email='{email}'))['pin_grant'])")
    out = subprocess.run(["uv", "run", "python", "manage.py", "shell", "-c", code], cwd=BACKEND, check=True,
                         capture_output=True, text=True).stdout.strip().splitlines()
    return out[-1]


def cleanup():
    hubs = "SELECT id FROM mobility_hub WHERE code LIKE 'CT-OPS-%'"
    sql(f"""DELETE FROM operations_inventorycount WHERE hub_id IN ({hubs});
      DELETE FROM notifications_notification WHERE link_path LIKE '/payments/cash/%' AND link_path IN
        (SELECT '/payments/cash/' || id FROM operations_shift WHERE hub_id IN ({hubs}));
      DELETE FROM risk_riskevent WHERE subject_type = 'shift' AND subject_id IN
        (SELECT id::text FROM operations_shift WHERE hub_id IN ({hubs}));
      DELETE FROM operations_alert WHERE hub_id IN ({hubs}) OR message LIKE 'CT %';
      DELETE FROM operations_override WHERE note LIKE '%CT override%';
      DELETE FROM operations_alertrule WHERE name LIKE 'CT %';
      DELETE FROM operations_cashdeposit WHERE hub_id IN ({hubs});
      DELETE FROM operations_shift WHERE hub_id IN ({hubs});
      DELETE FROM finance_payment WHERE hub_id IN ({hubs});
      DELETE FROM mobility_hub WHERE code LIKE 'CT-OPS-%'""")


cleanup()
purge_phones(PHONES.values())
for k, code in HUBS.items():
    sql(f"""INSERT INTO mobility_hub (id, created_at, updated_at, code, name, address, lat, lng, slot_count,
        solar_capacity_kw, status, operating_hours, timezone) SELECT gen_random_uuid(), now(), now(), '{code}',
        'CT ops hub', address, lat, lng, 0, solar_capacity_kw, status, operating_hours, timezone FROM mobility_hub
        WHERE code = 'HUB-YBA-01'""")
hub = {k: sql(f"SELECT id FROM mobility_hub WHERE code = '{HUBS[k]}'")[0][0] for k in HUBS}
fresh()

subprocess.run(["redis-cli", "-n", "0", "del", ":1:ops:command_centre:v3"], capture_output=True)
# ---- Reads ------------------------------------------------------------------
for label, tok in [("ops", ops), ("admin", admin), ("agent", agent), ("rider", other)]:
    both(f"shifts as {label}", "GET", O + "shifts/", tokens=tok)
    follow(f"deposits as {label}", O + "cash-deposits/?page_size=2", tok, pages=2)
    follow(f"alerts as {label}", O + "alerts/?page_size=3", tok, pages=2)
    both(f"alert rules as {label}", "GET", O + "alert-rules/", tokens=tok)
    both(f"overrides as {label}", "GET", O + "overrides/", tokens=tok)
    both(f"inventory as {label}", "GET", O + "inventory-counts/", tokens=tok)
    both(f"command centre as {label}", "GET", O + "command-centre/", tokens=tok, extra=("generated_at",))
both("deposits as owner", "GET", O + "cash-deposits/", tokens=owner, extra=CUR)
yba = sql("SELECT id FROM mobility_hub WHERE code = 'HUB-YBA-01'")[0][0]
for q in ["?status=OPEN", f"?hub={yba}", "?hub=bad", "?agent=bad", "?start_date=2026-01-01&end_date=2030-01-01",
          "?start_date=bad", "?page_size=1&page=2"]:
    both(f"shifts {q}", "GET", O + "shifts/" + q, tokens=ops)
for q in ["?status=SUCCESS", "?status=NOPE", "?hub=bad", f"?hub={yba}", f"?shift={uuid.uuid4()}", "?agent=bad",
          "?q=KR-"]:
    both(f"deposits {q}", "GET", O + "cash-deposits/" + q, tokens=ops, extra=CUR)
for q in ["?status=OPEN", "?severity=CRITICAL", "?kind=CASH_LIMIT", "?hub=bad", "?is_resolved=false",
          "?is_resolved=x", "?q=shift", "?start_date=2026-01-01", "?end_date=bad"]:
    both(f"alerts {q}", "GET", O + "alerts/" + q, tokens=ops, extra=CUR)
for q in ["?agent=bad", f"?agent={uuid.uuid4()}"]:
    both(f"overrides {q}", "GET", O + "overrides/" + q, tokens=ops)
both("inventory ?hub=bad", "GET", O + "inventory-counts/?hub=bad", tokens=ops)
for q in ["", "?start_date=2026-10-01&end_date=2026-10-31"]:
    d, g = call(DJ, "GET", O + "alerts/stats/" + q, token=ops[0]), call(GO, "GET", O + "alerts/stats/" + q, token=ops[1])
    for body in (d[1], g[1]):
        body["period"]["by_severity"].sort(key=lambda x: (-x["count"], x["severity"]))
    check(f"alert stats {q or '(all)'}", d, g)
for q in ["", "?export=pdf"]:
    d = call(DJ, "GET", O + "alerts/export/" + q, token=ops[0], raw=True)
    g = call(GO, "GET", O + "alerts/export/" + q, token=ops[1], raw=True)
    check(f"alert export {q or '(csv)'}", (d[0], d[1][:4] if q else d[1].decode()), (g[0], g[1][:4] if q else g[1].decode()))
both("activity", "GET", O + "activity/?limit=5", tokens=ops)
both("activity limit 0", "GET", O + "activity/?limit=0", tokens=ops)
for (sid,) in sql("SELECT id FROM operations_shift ORDER BY created_at LIMIT 3"):
    both(f"shift {sid[-6:]}", "GET", f"{O}shifts/{sid}/", tokens=ops)
for (did,) in sql("SELECT id FROM operations_cashdeposit ORDER BY created_at LIMIT 3"):
    both(f"deposit {did[-6:]}", "GET", f"{O}cash-deposits/{did}/", tokens=ops)
    both(f"deposit receipt {did[-6:]}", "GET", f"{O}cash-deposits/{did}/receipt/", tokens=ops)
    both(f"deposit receipt {did[-6:]} as other rider", "GET", f"{O}cash-deposits/{did}/receipt/", tokens=other)
for (aid,) in sql("SELECT id FROM operations_alert ORDER BY created_at LIMIT 3"):
    both(f"alert {aid[-6:]}", "GET", f"{O}alerts/{aid}/", tokens=ops)
for (rid,) in sql("SELECT id FROM operations_alertrule ORDER BY created_at LIMIT 3"):
    both(f"rule {rid[-6:]}", "GET", f"{O}alert-rules/{rid}/", tokens=ops)

# ---- Writes -------------------------------------------------------------------
fresh()
rider = {k: new_rider(BASE[k], PHONES[k]) for k in PHONES}
account = {k: sql(f"SELECT a.id FROM accounts_account a JOIN accounts_user u ON u.id = a.owner_user_id WHERE "
                  f"u.phone = '{PHONES[k]}'")[0][0] for k in PHONES}
SCRUB = ("id", "hub_id", "hub_code", "hub_name", "account_id", "account_kura_id", "shift_id", "payment_id",
         "receipt_code", "deposit_ids", "created_at", "updated_at", "opened_at", "closed_at", "lodged_at",
         "deposit_id", "agent_id", "agent_name", "operator_name", "operator_user_id", "issued_at", "issued_at_label",
         "integrity_hash", "signature", "case_id", "case_code", "acknowledged_at", "resolved_at", "subtitle",
         "acknowledged_by_id", "resolved_by_id", "message", "hub", "signed_by", "swap_id", "agent", "agent_email")
made = {}


def step(name, method, path, body=None, who=ops, extra=()):
    out = {}
    for k in BASE:
        tok = rider[k] if who == "rider" else who[IX[k]]
        out[k] = call(BASE[k], method, path(k) if callable(path) else path, body(k) if callable(body) else body, tok)
    check(name, out["django"], out["go"], extra=SCRUB + tuple(extra))
    return out


step("open shift: empty", "POST", O + "shifts/open/", {})
step("open shift: bad", "POST", O + "shifts/open/", {"hub_id": "x", "opening_cash_kobo": -1})
step("open shift: unknown hub", "POST", O + "shifts/open/", {"hub_id": str(uuid.uuid4())})
sh = step("open shift", "POST", O + "shifts/open/", lambda k: {"hub_id": hub[k], "opening_cash_kobo": 5000})
step("open shift again (same window)", "POST", O + "shifts/", lambda k: {"hub_id": hub[k]})
shift = {k: sh[k][1]["id"] for k in BASE}
D = O + "cash-deposits/"
step("deposit: empty", "POST", D, {})
step("deposit: bad", "POST", D, {"account_id": "x", "hub_id": 3, "amount_kobo": 0, "purpose": "TIP"})
step("deposit: unknown hub + account", "POST", D, {"account_id": str(uuid.uuid4()), "hub_id": str(uuid.uuid4()),
                                                  "amount_kobo": 100})
step("deposit: unknown shift", "POST", D, lambda k: {"account_id": account[k], "hub_id": hub[k], "amount_kobo": 100,
                                                     "shift_id": str(uuid.uuid4())})
step("deposit: over float limit", "POST", D, lambda k: {"account_id": account[k], "hub_id": hub[k],
                                                        "amount_kobo": 50_000_001})
step("deposit: rider forbidden", "POST", D, lambda k: {"account_id": account[k], "hub_id": hub[k], "amount_kobo": 100},
     who="rider")
dep = step("deposit SWAP", "POST", D, lambda k: {"account_id": account[k], "hub_id": hub[k], "amount_kobo": 150_000,
                                                 "psp_agent_ref": " ref-1 ", "idempotency_key": f"ct-cash-{k}"},
           extra=("idempotency_key",))
step("deposit SWAP replay", "POST", D, lambda k: {"account_id": account[k], "hub_id": hub[k], "amount_kobo": 150_000,
                                                  "idempotency_key": f"ct-cash-{k}"}, extra=("idempotency_key",))
fund = step("deposit FUND", "POST", D, lambda k: {"account_id": account[k], "hub_id": hub[k], "amount_kobo": 200_000,
                                                  "purpose": "FUND", "shift_id": shift[k]})
dep_id, fund_id = ({k: x[k][1]["id"] for k in BASE} for x in (dep, fund))
step("deposit detail", "GET", lambda k: f"{D}{dep_id[k]}/", extra=("idempotency_key",))
step("deposit list as owner", "GET", D, who="rider", extra=CUR)
step("receipt as owner", "GET", lambda k: f"{D}{dep_id[k]}/receipt/", who="rider")
step("receipt FUND as ops", "GET", lambda k: f"{D}{fund_id[k]}/receipt/")
out = {k: call(BASE[k], "GET", f"{D}{dep_id[k]}/receipt/?as=pdf", token=ops[IX[k]], raw=True) for k in BASE}
check("receipt pdf", (out["django"][0], out["django"][1][:5]), (out["go"][0], out["go"][1][:5]))
step("flag: short note", "POST", lambda k: f"{D}{dep_id[k]}/flag/", {"note": "short"}, who="rider")
step("flag", "POST", lambda k: f"{D}{dep_id[k]}/flag/", {"note": "I paid 1000 naira only", "claimed_amount_kobo": 100_000},
     who="rider")
S = lambda suffix="": (lambda k: f"{O}shifts/{shift[k]}/{suffix}")  # noqa: E731
step("lodge before close", "POST", S("lodge/"), {"lodge_ref": "CT-L1"})
step("close: bad", "POST", S("close/"), {"closing_cash_kobo": -5})
step("close with variance", "POST", S("close/"), {"closing_cash_kobo": 300_000})
step("close again", "POST", S("close/"), {"closing_cash_kobo": 1})
step("lodge: missing ref", "POST", S("lodge/"), {})
step("lodge: null amount", "POST", S("lodge/"), {"lodge_ref": "x", "amount_kobo": None})
step("lodge short", "POST", S("lodge/"), lambda k: {"lodge_ref": f"CT-L-{k}-{RUN}", "amount_kobo": 100_000},
     extra=("lodge_ref",))
step("lodge same ref", "POST", S("lodge/"), lambda k: {"lodge_ref": f"CT-L-{k}-{RUN}"}, extra=("lodge_ref",))
step("lodge other ref", "POST", S("lodge/"), {"lodge_ref": "CT-OTHER"})
step("shift detail after", "GET", S(), extra=("lodge_ref",))

# Overrides: Django as ops, Go as admin (the daily count is per agent).
staff = {"django": ops, "go": admin}
grant = {"django": mint_grant("ops@yopmail.com"), "go": mint_grant("admin@yopmail.com")}
OV = O + "overrides/"


def ov(name, body, extra=()):
    out = {k: call(BASE[k], "POST", OV, body(k) if callable(body) else body, staff[k][IX[k]]) for k in BASE}
    check(name, out["django"], out["go"], extra=SCRUB + tuple(extra))
    return out


ov("override: empty", {})
ov("override: bad grant", {"reason": "DISCRETION", "note": "CT override", "pin_grant": "nope"})
ov("override: unknown swap", {"reason": "X", "note": "y", "pin_grant": "z", "swap_id": str(uuid.uuid4())})
ov("override 1", lambda k: {"reason": "bay_triage", "note": " CT override one ", "pin_grant": grant[k]})
ov("override 2 (unknown reason folded)", lambda k: {"reason": "weird", "note": "CT override two", "pin_grant": grant[k]})
o3 = ov("override 3 (limit alert)", lambda k: {"reason": "discretion", "note": "CT override three", "pin_grant": grant[k]})
ovid = {k: o3[k][1]["id"] for k in BASE}
both_ov = {k: call(BASE[k], "PATCH", f"{OV}{ovid[k]}/", {"note": "ignored"}, ops[IX[k]]) for k in BASE}
check("override PATCH (read-only)", both_ov["django"], both_ov["go"], extra=SCRUB)
step("override detail", "GET", lambda k: f"{OV}{ovid[k]}/")

# Alerts triage on CT alerts.
alert = {}
for k in BASE:
    alert[k] = []
    for n in range(2):
        aid = str(uuid.uuid4())
        sql(f"""INSERT INTO operations_alert (id, created_at, updated_at, kind, severity, message, is_resolved, hub_id,
            delivery_channel, resolve_note, status) VALUES ('{aid}', now(), now(), 'HUB_OFFLINE', 'WARNING',
            'CT alert {n}', false, '{hub[k]}', 'IN_APP', '', 'OPEN')""")
        alert[k].append(aid)
A = lambda i, suffix: (lambda k: f"{O}alerts/{alert[k][i]}/{suffix}")  # noqa: E731
step("ack", "POST", A(0, "ack/"), {})
step("ack again", "POST", A(0, "ack/"), {})
step("ack: agent lacks manage", "POST", A(0, "ack/"), {}, who=agent)
step("resolve", "POST", A(0, "resolve/"), {"note": " fixed "})
step("resolve again", "POST", A(0, "resolve/"), {})
step("ack resolved", "POST", A(0, "ack/"), {})
step("escalate resolved", "POST", A(0, "escalate/"), {})
step("escalate", "POST", A(1, "escalate/"), {"note": "power"})
step("alert detail", "GET", A(1, ""))

R = O + "alert-rules/"
step("rule: empty", "POST", R, {})
step("rule: bad", "POST", R, {"name": "", "kind": "X", "severity": "LOW", "threshold": [1], "channels": "SMS",
                              "cooldown_minutes": 0, "status": "ON"})
step("rule: bad channels", "POST", R, {"name": "CT x", "kind": "OTHER", "channels": ["SMS", None, "x" * 41, {}]})
rl = step("rule create", "POST", R, {"name": " CT rule ", "kind": "LOW_INVENTORY", "threshold": {"ready_lt": 3},
                                     "channels": []})
rule = {k: rl[k][1]["id"] for k in BASE}
step("rule patch: bad", "PATCH", lambda k: f"{R}{rule[k]}/", {"cooldown_minutes": "x", "threshold": None})
step("rule patch", "PATCH", lambda k: f"{R}{rule[k]}/", {"status": "PAUSED", "severity": "CRITICAL",
                                                         "channels": ["IN_APP", " SMS "]})
step("rule unknown", "PATCH", f"{R}{uuid.uuid4()}/", {})

I = O + "inventory-counts/"
step("count: empty", "POST", I, {})
step("count: bad", "POST", I, {"hub_id": "x", "counted": [1]})
step("count: bad values", "POST", I, {"hub_id": str(uuid.uuid4()), "counted": {"a": None, "b": {}, "c": " "}})
step("count: unknown hub", "POST", I, {"hub_id": str(uuid.uuid4()), "counted": {}})
step("count", "POST", I, lambda k: {"hub_id": hub[k], "counted": {"bat-x": "ready", "B2": 5},
                                    "shift_id": str(uuid.uuid4()), "note": "eod"})
step("counts list ?hub", "GET", lambda k: f"{I}?hub={hub[k]}")

norm = lambda rows: [tuple(r) for r in rows]  # noqa: E731
for name, q in [
    ("shift", "SELECT status, opening_cash_kobo, closing_cash_kobo, expected_cash_kobo, variance_kobo, "
              "lodged_amount_kobo, lodged_at IS NOT NULL, auto_closed FROM operations_shift WHERE hub_id = '{h}'"),
    ("deposits", "SELECT amount_kobo, purpose, status, psp_agent_ref, idempotency_key IS NOT NULL FROM "
                 "operations_cashdeposit WHERE hub_id = '{h}' ORDER BY created_at"),
    ("payments", "SELECT channel, amount_kobo, vat_kobo, purpose, status FROM finance_payment WHERE hub_id = '{h}' "
                 "ORDER BY created_at"),
    ("alerts", "SELECT kind, severity, status, is_resolved, resolve_note, regexp_replace(message, "
               "'[0-9a-f-]{{36}}|CT-OPS-..|CT-L-(django|go)', 'x', 'g') FROM operations_alert WHERE hub_id = '{h}' ORDER BY kind, message"),
    ("audit", "SELECT action, before - 'hub_id', regexp_replace((after - 'hub_id' - 'shift_id' - 'payment_id' - 'float_outstanding_kobo')::text, 'CT-L-(django|go)', 'x'), "
              "metadata FROM audit_auditevent WHERE subject_id IN (SELECT id::text FROM operations_shift WHERE hub_id = '{h}' "
              "UNION SELECT id::text FROM operations_cashdeposit WHERE hub_id = '{h}' UNION SELECT id::text FROM "
              "operations_alert WHERE hub_id = '{h}' UNION SELECT id::text FROM operations_inventorycount WHERE "
              "hub_id = '{h}') ORDER BY created_at"),
]:
    check(f"db: {name}", (200, norm(sql(q.format(h=hub["django"])))), (200, norm(sql(q.format(h=hub["go"])))))
rows = {k: norm(sql(f"SELECT action, metadata - 'swap_id' FROM audit_auditevent WHERE subject_id IN "
                    f"(SELECT id::text FROM operations_override WHERE note LIKE '%CT override%' AND agent_id = "
                    f"(SELECT id FROM accounts_user WHERE email = '{'ops' if k == 'django' else 'admin'}@yopmail.com')) "
                    f"ORDER BY created_at")) for k in BASE}
check("db: override audit", (200, rows["django"]), (200, rows["go"]))

cleanup()
purge_phones(PHONES.values())
sys.exit(1 if summary() else 0)
