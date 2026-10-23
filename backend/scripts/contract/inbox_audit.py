"""Notifications inbox (filters, stats, read, read-all) and the audit feed
(subject-type ACL, filters, stats, detail)."""
import sys
import uuid

from lib import CUR, DJ, GO, both, call, check, follow, fresh, new_rider, purge_phones, sql, staff_tokens, summary

ops = staff_tokens()
admin = staff_tokens("admin@yopmail.com", "adminpass123")
agent = staff_tokens("agent.yaba@yopmail.com", "agentpass123")
BASE = {"django": DJ, "go": GO}
IX = {"django": 0, "go": 1}
PHONES = {"django": "+2348039990121", "go": "+2348039990122"}
N, A = "/api/v1/notifications/", "/api/v1/audit/"
purge_phones(PHONES.values())
fresh()

for label, tok in [("ops", ops), ("admin", admin), ("agent", agent)]:
    follow(f"inbox as {label}", N + "?page_size=4", tok, pages=2)
    both(f"inbox stats as {label}", "GET", N + "stats/", tokens=tok)
    follow(f"audit as {label}", A + "?page_size=5", tok, pages=2)
    both(f"audit stats as {label}", "GET", A + "stats/", tokens=tok)
for q in ["?unread=true", "?unread=False", "?severity=WARNING", "?source=Risk", "?channel=SMS", "?channel=NOPE",
          "?q=risk", "?search=case", "?start_date=2026-10-01", "?end_date=2026-10-22", "?start_date=bad"]:
    both(f"inbox {q}", "GET", N + q, tokens=admin, extra=CUR)
for q in ["?action=swap", "?subject_type=swap", "?subject_id=a,b", "?actor=ops@", "?q=hub", "?search=config",
          "?start_date=2026-10-01&end_date=2026-10-22", "?end_date=bad"]:
    both(f"audit {q}", "GET", A + q, tokens=admin, extra=CUR)
    both(f"audit {q} as agent", "GET", A + q, tokens=agent, extra=CUR)
for (aid,) in sql("SELECT id FROM audit_auditevent ORDER BY created_at DESC LIMIT 6"):
    both(f"audit {aid[-6:]}", "GET", f"{A}{aid}/", tokens=admin)
    both(f"audit {aid[-6:]} as agent", "GET", f"{A}{aid}/", tokens=agent)
both("audit unknown", "GET", f"{A}{uuid.uuid4()}/", tokens=admin)
rider = (call(DJ, "POST", "/api/v1/auth/pin/login/", {"phone": "+2348033330001", "pin": "1234"})[1]["access"],
         call(GO, "POST", "/api/v1/auth/pin/login/", {"phone": "+2348033330001", "pin": "1234"})[1]["access"])
both("audit as rider (403)", "GET", A, tokens=rider)

# Fresh riders with seeded IN_APP + SMS rows.
fresh()
tok = {k: new_rider(BASE[k], PHONES[k]) for k in BASE}
note = {}
for k in BASE:
    uid = sql(f"SELECT id FROM accounts_user WHERE phone = '{PHONES[k]}'")[0][0]
    note[k] = []
    for n, ch in enumerate(["IN_APP", "IN_APP", "SMS", "IN_APP"]):
        nid = str(uuid.uuid4())
        sql(f"""INSERT INTO notifications_notification (id, created_at, updated_at, channel, template_code, title, body,
            severity, source, status, params, link_path, dedupe_key, provider_ref, user_id) VALUES ('{nid}',
            now() - interval '{n} minute', now(), '{ch}', 't.{n}', 'CT title {n}', 'CT body {n}', 'INFO', 'Swaps',
            'SENT', '{{"n": {n}}}', '/x', '', '', '{uid}')""")
        note[k].append(nid)


def step(name, method, path, body=None, extra=()):
    out = {k: call(BASE[k], method, path(k) if callable(path) else path, body, tok[k]) for k in BASE}
    check(name, out["django"], out["go"], extra=("id", "at", "read_at", "updated_at") + tuple(extra))
    return out


step("inbox", "GET", N, extra=CUR)
step("stats", "GET", N + "stats/")
step("detail", "GET", lambda k: f"{N}{note[k][0]}/")
step("detail of SMS row (404)", "GET", lambda k: f"{N}{note[k][2]}/")
step("detail of another user (404)", "GET", lambda k: f"{N}{note['go' if k == 'django' else 'django'][0]}/")
step("read", "POST", lambda k: f"{N}{note[k][1]}/read/")
step("read again", "POST", lambda k: f"{N}{note[k][1]}/read/")
step("unread filter", "GET", N + "?unread=true", extra=CUR)
step("read-all (all channels)", "POST", N + "read-all/")
step("stats after", "GET", N + "stats/")
purge_phones(PHONES.values())
sys.exit(1 if summary() else 0)
