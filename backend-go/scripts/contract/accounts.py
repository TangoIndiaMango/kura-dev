"""Accounts CRM reads (AccountViewSet) per role: list, filters, detail, kyc, stats, export."""
import sys

from lib import DJ, GO, both, call, check, staff_tokens, summary

ops = staff_tokens()
admin = staff_tokens("admin@yopmail.com", "adminpass123")
agent = staff_tokens("agent.yaba@yopmail.com", "agentpass123")
owner_login = {"phone": "+2348022220001", "pin": "1234"}
owner = (call(DJ, "POST", "/api/v1/auth/pin/login/", owner_login)[1]["access"],
         call(GO, "POST", "/api/v1/auth/pin/login/", owner_login)[1]["access"])

A = "/api/v1/accounts/"
for label, tok in [("ops", ops), ("admin", admin), ("hub agent", agent), ("fleet owner", owner)]:
    both(f"list as {label}", "GET", A + "?page_size=50", tokens=tok)
for q in ["?page=2&page_size=5", "?q=kur", "?search=080", "?q=lag", "?status=ACTIVE", "?kyc_status=VERIFIED",
          "?kind=FLEET", "?start_date=2026-01-01&end_date=2026-12-31", "?created_after=2026-05-01T00:00:00",
          "?created_before=2026-05-01", "?ordering=display_name", "?ordering=-display_name,created_at",
          "?ordering=bogus", "?start_date=nope", "?created_after=nope", "?page=99"]:
    both(f"list {q}", "GET", A + q, tokens=ops)

_, lst = call(DJ, "GET", A + "?page_size=100", token=ops[0])
for acct in lst["results"]:
    both(f"detail {acct['kura_id']}", "GET", f"{A}{acct['id']}/", tokens=ops)
    both(f"kyc {acct['kura_id']}", "GET", f"{A}{acct['id']}/kyc/", tokens=ops)
own = call(DJ, "GET", A, token=owner[0])[1]["results"][0]["id"]
both("detail as owner", "GET", f"{A}{own}/", tokens=owner)
both("kyc as owner", "GET", f"{A}{own}/kyc/", tokens=owner)
other = next(a["id"] for a in lst["results"] if a["id"] != own)
both("detail other as owner (404)", "GET", f"{A}{other}/", tokens=owner)
both("detail as hub agent", "GET", f"{A}{own}/", tokens=agent)
both("detail bad id", "GET", f"{A}not-a-uuid/", tokens=ops)
both("detail unknown", "GET", f"{A}00000000-0000-0000-0000-000000000000/", tokens=ops)
both("detail anon", "GET", f"{A}{own}/")

for q in ["", "?start_date=2026-01-01&end_date=2026-12-31", "?start_date=2026-06-01", "?end_date=bad"]:
    both(f"stats {q or '(default)'}", "GET", A + "stats/" + q, tokens=ops)
both("stats as owner", "GET", A + "stats/", tokens=owner)

for label, tok, q in [("ops", ops, ""), ("ops filtered", ops, "?kyc_status=VERIFIED"), ("owner", owner, ""),
                      ("agent", agent, "")]:
    d = call(DJ, "GET", A + "export/" + q, token=tok[0], raw=True)
    g = call(GO, "GET", A + "export/" + q, token=tok[1], raw=True)
    check(f"export csv {label}", (d[0], {"csv": d[1].decode(), "n": d[2].get("X-Export-Row-Count"),
                                         "cd": d[2].get("Content-Disposition")}),
          (g[0], {"csv": g[1].decode(), "n": g[2].get("X-Export-Row-Count"), "cd": g[2].get("Content-Disposition")}))
# Detail stats (+ money breakdown) for every account with swaps, over several windows.
busy = [a["id"] for a in lst["results"]]
for q in ["", "?start_date=2026-09-01&end_date=2026-10-22", "?start_date=2026-01-01&end_date=2026-10-22",
          "?start_date=2026-10-20&end_date=2026-10-01", "?start_date=bad&end_date=2026-10-15", "?end_date=2026-9-30"]:
    for aid in busy:
        both(f"detail stats {aid[-6:]} {q or '(default)'}", "GET", f"{A}{aid}/stats/{q}", tokens=ops)
both("detail stats as owner", "GET", f"{A}{own}/stats/", tokens=owner)
both("detail stats other as owner", "GET", f"{A}{other}/stats/", tokens=owner)

# Owner fleet spend.
F = "/api/v1/accounts/me/fleet-spend/"
for q in ["", "?start_date=2026-09-01&end_date=2026-10-22", "?start_date=2026-10-15"]:
    both(f"fleet spend {q or '(default)'}", "GET", F + q, tokens=owner)
both("fleet spend as staff (403)", "GET", F, tokens=ops)
both("fleet spend anon", "GET", F)
sys.exit(1 if summary() else 0)
