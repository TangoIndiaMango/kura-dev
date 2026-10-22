"""Risk rules + events: reads, filters, stats, export, manual flag, review and
SWAP_VELOCITY grants. Writes use CT-marked rows that are removed after."""
import sys
import uuid

from lib import DJ, GO, both, call, check, follow, fresh, sql, staff_tokens, summary

ops = staff_tokens()
admin = staff_tokens("admin@yopmail.com", "adminpass123")
agent = staff_tokens("agent.yaba@yopmail.com", "agentpass123")
rb = {"phone": "+2348033330001", "pin": "1234"}
rider = (call(DJ, "POST", "/api/v1/auth/pin/login/", rb)[1]["access"],
         call(GO, "POST", "/api/v1/auth/pin/login/", rb)[1]["access"])
R, E = "/api/v1/risk/rules/", "/api/v1/risk/events/"
BASE = {"django": DJ, "go": GO}
IX = {"django": 0, "go": 1}
CUR = ("next", "previous")
acct = sql("SELECT id FROM accounts_account WHERE kura_id = 'KR-FLEET-VCU'")[0][0]


def cleanup():
    sql("""DELETE FROM risk_riskvelocitygrant WHERE note LIKE 'CT %';
           DELETE FROM risk_riskvelocitygrant WHERE risk_event_id IN (SELECT id FROM risk_riskevent WHERE context->>'ct' = '1'
             OR context->>'note' LIKE 'CT %');
           DELETE FROM notifications_notification WHERE link_path IN (SELECT '/risk/' || id FROM risk_riskevent
             WHERE context->>'ct' = '1' OR context->>'note' LIKE 'CT %');
           DELETE FROM risk_riskevent WHERE context->>'ct' = '1' OR context->>'note' LIKE 'CT %'""")


cleanup()
fresh()
for label, tok in [("ops", ops), ("admin", admin), ("agent", agent), ("rider", rider)]:
    both(f"rules as {label}", "GET", R, tokens=tok)
    both(f"events as {label}", "GET", E, tokens=tok, extra=CUR)
both("rules page 2", "GET", R + "?page_size=5&page=2", tokens=admin)
rules = call(DJ, "GET", R + "?page_size=50", token=admin[0])[1]["results"]
for x in rules:
    both(f"rule {x['code']}", "GET", f"{R}{x['id']}/", tokens=admin)
both("rule unknown", "GET", f"{R}{uuid.uuid4()}/", tokens=admin)

# Rule updates: one throwaway edit per backend on the same row, restored after.
target = next(x for x in rules if x["code"] == "NOSHOW_RATE")
RP = f"{R}{target['id']}/"
both("rule PUT: empty", "PUT", RP, {}, admin)
both("rule PUT: unknown 404 first", "PUT", f"{R}{uuid.uuid4()}/", {}, admin)
both("rule PATCH: bad", "PATCH", RP, {"name": "", "severity": "HUGE", "action": "NUKE", "enabled": "maybe",
                                      "params": None}, admin)
both("rule PATCH: ops", "PATCH", RP, {"enabled": False}, ops)
for k in BASE:
    pass
d = call(DJ, "PATCH", RP, {"params": {"window": 7}, "enabled": False, "name": " No-show (CT) "}, admin[0])
g = call(GO, "PATCH", RP, {"params": {"window": 7}, "enabled": False, "name": " No-show (CT) "}, admin[1])
check("rule PATCH", d, g)
d = call(DJ, "PUT", RP, {"name": target["name"], "severity": "LOW"}, admin[0])
g = call(GO, "PUT", RP, {"name": target["name"], "severity": "LOW"}, admin[1])
check("rule PUT", d, g)
sql(f"UPDATE risk_riskrule SET name = '{target['name']}', severity = '{target['severity']}', "
    f"action = '{target['action']}', enabled = true, params = '{{}}' WHERE id = '{target['id']}'")

# Event reads.
for q in ["?status=OPEN", "?severity=HIGH", "?rule=SWAP_VELOCITY", f"?account={acct}", "?account=bad",
          "?subject_type=vehicle", "?q=velocity", "?q=KR-", "?start_date=2026-01-01&end_date=2030-01-01",
          "?start_date=bad", "?page_size=3"]:
    both(f"events {q}", "GET", E + q, tokens=ops, extra=CUR)
follow("events walk", E + "?page_size=4", ops, pages=4)
follow("events walk ?status=OPEN", E + "?page_size=3&status=OPEN", ops, pages=3)
for q in ["", "?start_date=2026-10-01", "?start_date=2026-10-01&end_date=2026-10-31", "?end_date=nope"]:
    d, g = call(DJ, "GET", E + "stats/" + q, token=ops[0]), call(GO, "GET", E + "stats/" + q, token=ops[1])
    for body in (d[1], g[1]):
        if isinstance(body, dict) and "period" in body:
            body["period"]["by_rule"].sort(key=lambda x: (-x["count"], x["rule"]))
            body["by_severity"].sort(key=lambda x: (-x["count"], x["severity"]))
    check(f"stats {q or '(all)'}", d, g)
for q in ["", "?status=OPEN", "?export=pdf&status=OPEN", "?export=xls"]:
    d = call(DJ, "GET", E + "export/" + q, token=ops[0], raw=True)
    g = call(GO, "GET", E + "export/" + q, token=ops[1], raw=True)
    body = lambda x: (x[1][:4] if "pdf" in q else x[1].decode(errors="replace")) if x[0] == 200 else (  # noqa: E731
        __import__("json").loads(x[1]))
    check(f"export {q or '(csv)'}", (d[0], body(d)), (g[0], body(g)))
fresh()
evs = call(DJ, "GET", E + "?page_size=8", token=ops[0])[1]["results"]
for e in evs:
    both(f"event {e['rule_code']} {e['id'][-6:]}", "GET", f"{E}{e['id']}/", tokens=ops)
both("event unknown", "GET", f"{E}{uuid.uuid4()}/", tokens=ops)

# Manual flag + review.
SCRUB = ("id", "created_at", "updated_at", "flagged_by", "subject_id", "risk_event_id", "expires_at")
both("flag: empty", "POST", E, {}, admin)
both("flag: bad", "POST", E, {"account_id": "x", "severity": "HUGE", "rule_code": ""}, admin)
both("flag: unknown account", "POST", E, {"account_id": str(uuid.uuid4())}, admin)
both("flag: unknown rule", "POST", E, {"account_id": acct, "rule_code": "NOPE"}, admin)
both("flag: rider forbidden", "POST", E, {"account_id": acct}, rider)
out = {k: call(BASE[k], "POST", E, {"account_id": acct, "severity": "LOW", "note": f" CT flag {k} "}, admin[IX[k]])
       for k in BASE}
for o in out.values():
    o[1].get("context", {}).pop("note", None)
check("flag", out["django"], out["go"], extra=SCRUB)
flag = {k: out[k][1]["id"] for k in BASE}
out = {k: call(BASE[k], "POST", E, {"account_id": acct, "rule_code": "SWAP_VELOCITY", "note": f"CT velo {k}"},
               admin[IX[k]]) for k in BASE}
velo_acct = {k: out[k][1]["id"] for k in BASE}


def step(name, path, body, tok=admin, extra=()):
    out = {k: call(BASE[k], "POST", path(k), body, tok[IX[k]]) for k in BASE}
    for o in out.values():
        if isinstance(o[1], dict):
            o[1].get("context", {}).pop("note", None)
    check(name, out["django"], out["go"], extra=SCRUB + tuple(extra))
    return out


step("review: bad", lambda k: f"{E}{flag[k]}/review/", {"status": "OPEN", "ttl_hours": 0, "max_uses": 9})
step("review: ops can review", lambda k: f"{E}{flag[k]}/review/", {"status": "ESCALATED", "note": " look "}, ops)
step("review: ok (no grant for MANUAL_FLAG)", lambda k: f"{E}{flag[k]}/review/", {"status": "REVIEWED_OK"})
step("review: velocity on account subject", lambda k: f"{E}{velo_acct[k]}/review/",
     {"status": "REVIEWED_OK", "note": "CT grant"})
step("review: velocity without note", lambda k: f"{E}{velo_acct[k]}/review/", {"status": "REVIEWED_OK"})
step("review: unknown", lambda k: f"{E}{uuid.uuid4()}/review/", {"status": "REVIEWED_OK"})

# SWAP_VELOCITY on a vehicle subject → grant on REVIEWED_OK.
veh = sql("SELECT id FROM mobility_vehicle ORDER BY created_at LIMIT 2")
vev = {}
for k, (vid,) in zip(BASE, veh):
    rid = str(uuid.uuid4())
    sql(f"""INSERT INTO risk_riskevent (id, created_at, updated_at, subject_type, subject_id, severity, score, context,
        action_taken, status, review_note, account_id, rule_id) SELECT '{rid}', now(), now(), 'vehicle', '{vid}', 'HIGH', 0,
        '{{"ct": "1", "reason": "MAX_SWAPS_PER_VEHICLE_DAY"}}', 'BLOCK', 'OPEN', '', NULL, id FROM risk_riskrule
        WHERE code = 'SWAP_VELOCITY'""")
    vev[k] = rid
step("review velocity: grant", lambda k: f"{E}{vev[k]}/review/",
     {"status": "REVIEWED_OK", "note": "CT ok once", "ttl_hours": 2, "max_uses": 3}, extra=("subject_id",))
both("detail with grant", "GET", f"{E}{vev['django']}/", tokens=ops)
step("review velocity: allow_swap false", lambda k: f"{E}{vev[k]}/review/",
     {"status": "REVIEWED_OK", "note": "CT no grant", "allow_swap": False})
rows = {k: sql(f"SELECT max_uses, uses_remaining, status, note, round(extract(epoch FROM expires_at - created_at)) "
               f"FROM risk_riskvelocitygrant WHERE risk_event_id = '{vev[k]}' ORDER BY created_at") for k in BASE}
check("db: grants", (200, rows["django"]), (200, rows["go"]))
for key in ("risk_event.opened", "risk_event.reviewed", "risk.velocity_grant.created"):
    rows = {k: sql(f"SELECT action, subject_type, CASE WHEN action LIKE 'risk.velocity%' THEN '' ELSE subject_label END, metadata - 'risk_event_id' - 'velocity_grant_id' "
                   f"- 'subject_id' - 'vehicle_id' - 'expires_at' FROM audit_auditevent WHERE action = '{key}' AND "
                   f"(subject_id IN ('{flag[k]}', '{velo_acct[k]}', '{vev[k]}') OR metadata->>'risk_event_id' = '{vev[k]}') "
                   f"ORDER BY created_at") for k in BASE}
    check(f"db: audit {key}", (200, rows["django"]), (200, rows["go"]))
rows = {k: sql(f"SELECT title, body, severity, template_code FROM notifications_notification WHERE link_path = "
               f"'/risk/{velo_acct[k]}' OR link_path = '/risk/{vev[k]}' ORDER BY title, user_id") for k in BASE}
check("db: reviewer notifications", (200, [r for r in rows["django"]]), (200, [r for r in rows["go"]]))

cleanup()
sys.exit(1 if summary() else 0)
