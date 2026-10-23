"""Support cases: scoped reads, filters, stats, export, and the open / note /
status / assign flow on a fresh rider per backend (events, notifications and
audit compared)."""
import sys
import uuid

from lib import (DJ, GO, both, call, check, follow, fresh, media_asset, new_rider, purge_phones, sql, staff_tokens,
                 summary)

ops = staff_tokens()
admin = staff_tokens("admin@yopmail.com", "adminpass123")
agent = staff_tokens("agent.yaba@yopmail.com", "agentpass123")


def pin(phone):
    b = {"phone": phone, "pin": "1234"}
    return (call(DJ, "POST", "/api/v1/auth/pin/login/", b)[1].get("access"),
            call(GO, "POST", "/api/v1/auth/pin/login/", b)[1].get("access"))


owner, other = pin("+2348022220001"), pin("+2348033330001")
C = "/api/v1/support/cases/"
BASE = {"django": DJ, "go": GO}
IX = {"django": 0, "go": 1}
PHONES = {"django": "+2348039990081", "go": "+2348039990082"}
CUR = ("next", "previous")
purge_phones(PHONES.values())
fresh()

for label, tok in [("ops", ops), ("admin", admin), ("agent", agent), ("owner", owner), ("rider", other)]:
    follow(f"cases as {label}", C + "?page_size=4", tok, pages=3)
acct = sql("SELECT id FROM accounts_account WHERE kura_id = 'KR-FLEET-VCU'")[0][0]
for q in ["?status=OPEN", "?kind=PAYMENT_DISPUTE", "?priority=HIGH", f"?account={acct}", "?account=bad",
          "?unassigned=true", "?unassigned=False", "?unassigned=maybe", "?sla=breached", "?sla=at_risk", "?sla=x",
          "?q=CS-", "?q=fleet", "?start_date=2026-01-01&end_date=2030-12-31", "?end_date=bad"]:
    both(f"cases {q}", "GET", C + q, tokens=ops, extra=CUR)


def stats(name, q, tok):
    d, g = call(DJ, "GET", C + "stats/" + q, token=tok[0]), call(GO, "GET", C + "stats/" + q, token=tok[1])
    for body in (d[1], g[1]):
        if isinstance(body, dict) and "period" in body:
            body["period"]["by_kind"].sort(key=lambda x: (-x["count"], x["kind"]))
    check(name, d, g)


for q in ["", "?start_date=2026-10-01", "?start_date=2026-10-01&end_date=2026-10-31"]:
    stats(f"stats {q or '(all)'}", q, ops)
stats("stats as rider (403)", "", other)
for q in ["", "?status=OPEN", "?export=pdf", "?export=xls"]:
    d = call(DJ, "GET", C + "export/" + q, token=ops[0], raw=True)
    g = call(GO, "GET", C + "export/" + q, token=ops[1], raw=True)
    body = lambda x: (x[1][:4] if "pdf" in q else x[1].decode(errors="replace")) if x[0] == 200 else (  # noqa: E731
        __import__("json").loads(x[1]))
    check(f"export {q or '(csv)'}", (d[0], body(d)), (g[0], body(g)))
for (cid,) in sql("SELECT id FROM support_supportcase ORDER BY created_at LIMIT 6"):
    both(f"case {cid[-6:]}", "GET", f"{C}{cid}/", tokens=ops)
    both(f"case {cid[-6:]} as rider", "GET", f"{C}{cid}/", tokens=other)
both("case unknown", "GET", f"{C}{uuid.uuid4()}/", tokens=ops)

# Writes on a fresh rider per backend.
fresh()
rider = {k: new_rider(BASE[k], PHONES[k]) for k in PHONES}
account = {k: sql(f"SELECT a.id FROM accounts_account a JOIN accounts_user u ON u.id = a.owner_user_id WHERE "
                  f"u.phone = '{PHONES[k]}'")[0][0] for k in PHONES}
ops_id = sql("SELECT id FROM accounts_user WHERE email = 'ops@yopmail.com'")[0][0]
asset = {k: media_asset(PHONES[k]) for k in PHONES}
foreign_pay = sql(f"SELECT id FROM finance_payment WHERE account_id <> '{account['django']}' LIMIT 1")[0][0]
SCRUB = ("id", "code", "account_id", "account_kura_id", "account_display_name", "created_at", "updated_at", "sla_due_at",
         "opened_by_id", "actor_id", "actor_name", "attachment_id", "attachment_url", "body")


def step(name, method, path, body=None, who="rider", extra=()):
    out = {}
    for k in BASE:
        tok = rider[k] if who == "rider" else {"admin": admin, "ops": ops, "other": other}[who][IX[k]]
        out[k] = call(BASE[k], method, path(k) if callable(path) else path, body(k) if callable(body) else body, tok)
    check(name, out["django"], out["go"], extra=SCRUB + tuple(extra))
    return out


step("open: empty", "POST", C, {})
step("open: bad", "POST", C, {"subject": "x" * 201, "kind": "RANT", "priority": "NOW", "account_id": None,
                              "driver_id": "x"})
step("open: blank subject", "POST", C, {"subject": "   "})
step("open: foreign account (403)", "POST", C, {"subject": "Help", "account_id": acct})
step("open: unknown account", "POST", C, {"subject": "Help", "account_id": str(uuid.uuid4())})
step("open: unknown payment", "POST", C, {"subject": "Help", "payment_id": str(uuid.uuid4())})
step("open: foreign payment", "POST", C, {"subject": "Help", "payment_id": foreign_pay})
step("open: foreign asset", "POST", C, lambda k: {"subject": "Help", "attachment_asset_id": asset[
    "go" if k == "django" else "django"]})
step("open: driver of another account", "POST", C, {"subject": "Help", "driver_id": str(uuid.uuid4())})
mine = step("open (own account, photo, no text)", "POST", C, lambda k: {
    "subject": "  Battery died  ", "kind": "GENERAL", "attachment_asset_id": asset[k]})
case = {k: mine[k][1]["id"] for k in BASE}
staff = step("open as admin with assignee", "POST", C, lambda k: {
    "subject": "Refund", "account_id": account[k], "kind": "PAYMENT_DISPUTE", "priority": "URGENT",
    "body": " Charged twice ", "assigned_to_id": ops_id}, who="admin")
scase = {k: staff[k][1]["id"] for k in BASE}
step("open as admin: unknown assignee", "POST", C, lambda k: {"subject": "x", "account_id": account[k],
                                                              "assigned_to_id": str(uuid.uuid4())}, who="admin")
P = lambda which, suffix="": (lambda k: f"{C}{which[k]}/{suffix}")  # noqa: E731
step("list as rider", "GET", C, extra=CUR + ("next",))
step("detail as rider", "GET", P(case))
step("detail as other rider (404)", "GET", P(case), who="other")
step("note: empty", "POST", P(case, "notes/"), {})
step("note: bad asset", "POST", P(case, "notes/"), {"attachment_asset_id": str(uuid.uuid4())})
step("note by rider (pages staff)", "POST", P(case, "notes/"), {"body": " still dead "})
step("note by ops (pages rider)", "POST", P(case, "notes/"), {"body": "Swap at Yaba"}, who="ops")
step("status: bad", "POST", P(case, "status/"), {"status": "DONE"}, who="ops")
step("status: rider forbidden", "POST", P(case, "status/"), {"status": "CLOSED"})
step("status: resolved with note", "POST", P(case, "status/"), {"status": "RESOLVED", "note": " fixed "}, who="ops")
step("status: closed", "POST", P(case, "status/"), {"status": "CLOSED"}, who="ops")
step("assign: missing", "POST", P(scase, "assign/"), {}, who="ops")
step("assign: unknown user", "POST", P(scase, "assign/"), {"assigned_to_id": str(uuid.uuid4())}, who="ops")
step("assign: unknown case", "POST", f"{C}{uuid.uuid4()}/assign/", {"assigned_to_id": ops_id}, who="ops")
step("unassign", "POST", P(scase, "assign/"), {"assigned_to_id": None}, who="ops")
step("assign", "POST", P(case, "assign/"), {"assigned_to_id": ops_id}, who="admin")
step("detail after flow", "GET", P(scase), who="ops")

norm = lambda rows: [tuple(r) for r in rows]  # noqa: E731
for name, q in [
    ("cases", "SELECT kind, priority, status, subject, assigned_to_id IS NOT NULL, payment_id IS NOT NULL, "
              "round(extract(epoch FROM sla_due_at - created_at) / 3600) FROM support_supportcase WHERE account_id = '{a}' "
              "ORDER BY created_at"),
    ("case events", "SELECT e.kind, e.body, e.attachment_id IS NOT NULL FROM support_caseevent e JOIN support_supportcase "
                    "c ON c.id = e.case_id WHERE c.account_id = '{a}' ORDER BY c.created_at, e.created_at"),
    ("notifications", "SELECT regexp_replace(n.title, 'CS-[0-9]+', 'CS-x') AS t, regexp_replace(n.body, 'Rider 008[12]', "
                      "'Rider') AS b, n.template_code, n.channel, split_part(n.link_path, '/', 2) FROM "
                      "notifications_notification n WHERE n.link_path LIKE ANY (SELECT '%' || id || '%' FROM "
                      "support_supportcase WHERE account_id = '{a}') ORDER BY t, b, n.user_id"),
    ("audit", "SELECT action, metadata - 'account_id' - 'event_id' FROM audit_auditevent WHERE subject_id IN "
              "(SELECT id::text FROM support_supportcase WHERE account_id = '{a}') ORDER BY created_at"),
]:
    check(f"db: {name}", (200, norm(sql(q.format(a=account["django"])))), (200, norm(sql(q.format(a=account["go"])))))

sql("DELETE FROM notifications_notification WHERE link_path LIKE ANY (SELECT '%' || id || '%' FROM support_supportcase "
    f"WHERE account_id IN ('{account['django']}', '{account['go']}'))")
purge_phones(PHONES.values())
sys.exit(1 if summary() else 0)
