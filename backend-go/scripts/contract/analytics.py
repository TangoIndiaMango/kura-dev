"""Analytics: dashboard tiles, hub demand forecast, revenue overview /
streams (date windows), government impact, cooperative rollups (chairman /
ops / forbidden) and the impact story CMS (validation, create, patch,
publish, audit)."""
import sys
import uuid

from lib import DJ, GO, both, call, check, fresh, sql, staff_tokens, summary

ops = staff_tokens()
admin = staff_tokens("admin@yopmail.com", "adminpass123")
agent = staff_tokens("agent.yaba@yopmail.com", "agentpass123")
BASE = {"django": DJ, "go": GO}
login = lambda phone: tuple(call(b, "POST", "/api/v1/auth/pin/login/", {"phone": phone, "pin": "1234"})[1]["access"]  # noqa: E731
                            for b in (DJ, GO))
owner, rider = login("+2348022220001"), login("+2348033330001")
A = "/api/v1/analytics/"
WHO = [("admin", admin), ("ops", ops), ("agent", agent), ("owner", owner), ("rider", rider)]

fresh()
for label, tok in WHO:
    both(f"dashboard as {label}", "GET", A + "dashboard/", tokens=tok)
    both(f"demand as {label}", "GET", A + "demand/hubs/", tokens=tok)
    both(f"revenue as {label}", "GET", A + "revenue/overview/", tokens=tok)
    both(f"impact as {label}", "GET", A + "impact/", tokens=tok)
    both(f"coop me as {label}", "GET", A + "cooperative/me/", tokens=tok)
    both(f"stories as {label}", "GET", A + "stories/", tokens=tok)
for q in ["?lookback_days=7", "?lookback_days=3", "?lookback_days=365", "?lookback_days=x", "?lookback_days=%2014"]:
    both(f"demand {q}", "GET", A + "demand/hubs/" + q, tokens=admin)
fresh()
for q in ["?start_date=2026-01-01", "?end_date=2026-10-01", "?start_date=2026-10-22&end_date=2026-01-01",
          "?start_date=2026-1-5&end_date=2026-12-31", "?start_date=bad", "?end_date=2026/01/01"]:
    both(f"revenue overview {q}", "GET", A + "revenue/overview/" + q, tokens=admin)
    both(f"revenue streams {q}", "GET", A + "revenue/streams/" + q, tokens=admin)
for q in ["", "?period=2026-09", "?period=1999-01", "?period=%202026-10%20"]:
    both(f"impact {q}", "GET", A + "impact/" + q, tokens=admin)
COOP = sql("SELECT id FROM accounts_cooperative ORDER BY name LIMIT 1")[0][0]
for label, tok in WHO:
    both(f"coop as {label}", "GET", f"{A}cooperative/{COOP}/", tokens=tok)
both("coop unknown", "GET", f"{A}cooperative/{uuid.uuid4()}/", tokens=admin)
for q in ["?status=PUBLISHED", "?q=lagos", "?ordering=-published_at", "?ordering=status", "?page_size=1"]:
    both(f"stories {q}", "GET", A + "stories/" + q, tokens=admin)
for (sid,) in sql("SELECT id FROM analytics_impactstory ORDER BY created_at"):
    both(f"story {sid[-6:]}", "GET", f"{A}stories/{sid}/", tokens=admin)
both("story unknown", "GET", f"{A}stories/{uuid.uuid4()}/", tokens=admin)

TOK = {"django": admin[0], "go": admin[1]}
ids = {}
VOL = ("id", "created_at", "updated_at", "published_at", "created_by_id")


def step(name, method, path, body=None, keep=False, tok=TOK):
    out = {k: call(BASE[k], method, path(k) if callable(path) else path, body, tok[k]) for k in BASE}
    check(name, out["django"], out["go"], extra=VOL)
    if keep:
        for k in BASE:
            ids[k] = out[k][1].get("id")
    return out


fresh()
S = A + "stories/"
step("story create: empty", "POST", S, {})
step("story create: blank title", "POST", S, {"title": " "})
step("story create: bad", "POST", S, {"title": "x" * 161, "status": "LIVE", "raw": [], "region": None})
step("story create: no title, other fields ok", "POST", S, {"region": "Lagos"})
step("story create as ops", "POST", S, {"title": "x"}, tok={"django": ops[0], "go": ops[1]})
step("story create", "POST", S, {"title": "  CT impact story  ", "region": " Lagos ", "partners": "LASG",
                                 "summary": " Body ", "metric_highlight": "50 swaps", "raw": {"a": 1}}, keep=True)
step("story patch", "PATCH", lambda k: f"{S}{ids[k]}/", {"title": "CT renamed", "status": "ARCHIVED", "raw": {"b": 2}})
step("story patch: bad", "PATCH", lambda k: f"{S}{ids[k]}/", {"title": "", "status": "nope"})
step("story publish", "POST", lambda k: f"{S}{ids[k]}/publish/")
step("story detail", "GET", lambda k: f"{S}{ids[k]}/")
norm = lambda rows: [tuple(r) for r in rows]  # noqa: E731
rows = {k: norm(sql(f"SELECT action, before, after FROM audit_auditevent WHERE subject_id = '{ids[k]}' "
                    "ORDER BY created_at")) for k in BASE}
check("db: audit", (200, rows["django"]), (200, rows["go"]))
for k in BASE:
    sql(f"DELETE FROM analytics_impactstory WHERE id = '{ids[k]}'")
sys.exit(1 if summary() else 0)
