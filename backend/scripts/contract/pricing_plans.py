"""Pricing (hold policy, tariff matrices) and the plan catalogue. Writes use a
throwaway vehicle type so live tariffs are never touched."""
import re
import sys

from lib import DJ, GO, both, call, check, fresh, sql, staff_tokens, summary

ops = staff_tokens()
admin = staff_tokens("admin@yopmail.com", "adminpass123")
rb = {"phone": "+2348033330001", "pin": "1234"}
rider = (call(DJ, "POST", "/api/v1/auth/pin/login/", rb)[1]["access"],
         call(GO, "POST", "/api/v1/auth/pin/login/", rb)[1]["access"])
H, M, PL = "/api/v1/mobility/pricing/hold-policy/", "/api/v1/mobility/pricing/matrices/", "/api/v1/mobility/plans/"
BASE = {"django": DJ, "go": GO}


def cleanup():
    sql("DELETE FROM mobility_pricematrix WHERE vehicle_type LIKE 'CT_%'; DELETE FROM mobility_plan WHERE code LIKE 'CT-%'")


cleanup()
orig = sql("SELECT default_hold_minutes, max_extend_minutes FROM mobility_bayholdpolicy ORDER BY id LIMIT 1")[0]
for label, tok in [("rider", rider), ("ops", ops)]:
    both(f"hold policy as {label}", "GET", H, tokens=tok)
both("hold put: rider forbidden", "PUT", H, {"default_hold_minutes": 10, "max_extend_minutes": 10}, rider)
both("hold put: invalid", "PUT", H, {"default_hold_minutes": 4, "max_extend_minutes": 61}, admin)
d = call(DJ, "PUT", H, {"default_hold_minutes": 20, "max_extend_minutes": 10}, admin[0])
g = call(GO, "PUT", H, {"default_hold_minutes": 21, "max_extend_minutes": 11}, admin[1])
check("hold put", (d[0], sorted(d[1])), (g[0], sorted(g[1])))
both("hold policy after", "GET", H, tokens=rider)
call(DJ, "PUT", H, {"default_hold_minutes": int(orig[0]), "max_extend_minutes": int(orig[1])}, admin[0])

for label, tok in [("ops", ops), ("admin", admin), ("rider", rider)]:
    both(f"matrices as {label}", "GET", M, tokens=tok)
for q in ["?status=ACTIVE", "?status=NOPE", "?vehicle_type=BOAT", "?ordering=vehicle_type", "?page_size=2&page=2"]:
    both(f"matrices {q}", "GET", M + q, tokens=admin)
for (mid,) in sql("SELECT id FROM mobility_pricematrix ORDER BY created_at LIMIT 8"):
    both(f"matrix {mid[-6:]}", "GET", f"{M}{mid}/", tokens=admin)
both("matrix create: empty", "POST", M, {}, admin)
both("matrix create: bad", "POST", M, {"vehicle_type": "", "daily_kobo": 0, "weekly_kobo": "x", "monthly_kobo": 1,
                                      "pay_per_swap_kobo": 1, "effective_from": "soon"}, admin)
SCRUB = ("id", "created_at", "updated_at", "created_by_id", "approved_by_id")
mk = lambda tok, frm="2030-01-01": {k: call(BASE[k], "POST", M, {  # noqa: E731
    "vehicle_type": f" ct {k} type ", "daily_kobo": 100, "weekly_kobo": 600, "monthly_kobo": 2000,
    "pay_per_swap_kobo": 50, "effective_from": frm}, tok[0 if k == "django" else 1]) for k in BASE}


def pair(name, out):
    norm = {k: (o[0], {**o[1], "vehicle_type": "x"} if isinstance(o[1], dict) and "vehicle_type" in o[1] else o[1])
            for k, o in out.items()}
    check(name, norm["django"], norm["go"], extra=SCRUB)


pair("matrix create: ops lacks tariffs:manage", mk(ops))
ops_made = mk(admin)
pair("matrix create (admin)", ops_made)
act = lambda path, body, tok: {k: call(BASE[k], "POST", path(k), body, tok[0 if k == "django" else 1])  # noqa: E731
                               for k in BASE}
P = lambda made, suffix: (lambda k: f"{M}{made[k][1]['id']}/{suffix}")  # noqa: E731
pair("schedule: past date", act(P(ops_made, "schedule/"), {"effective_from": "2020-01-01"}, admin))
pair("schedule with notice", act(P(ops_made, "schedule/"), {"send_customer_notice": True}, admin))
pair("schedule twice", act(P(ops_made, "schedule/"), {}, admin))
pair("rider cannot activate", act(P(ops_made, "activate/"), None, rider))
pair("ops (checker) activates admin's matrix", act(P(ops_made, "activate/"), None, ops))
pair("activate active", act(P(ops_made, "activate/"), None, admin))
pair("reject active", act(P(ops_made, "reject/"), {"reason": "late"}, admin))
second = mk(admin, "2031-01-01")
pair("admin create", second)
pair("admin self-activates (bypass)", act(P(second, "activate/"), None, admin))
third = mk(admin, "2032-01-01")
pair("reject pending", act(P(third, "reject/"), {"reason": " too high "}, admin))
for k in BASE:
    pair(f"{k}: superseded check", {kk: call(BASE[kk], "GET", f"{M}{ops_made[k][1]['id']}/", None,
                                             admin[0 if kk == "django" else 1]) for kk in BASE})

# Plans
fresh()
for label, tok in [("rider", rider), ("ops", ops)]:
    both(f"plans as {label}", "GET", PL, tokens=tok)
for q in ["?is_active=all", "?is_active=false", "?is_active=true", "?is_active=yes", "?is_active=", "?vehicle_type=BOAT",
          "?period=day", "?period=year", "?status=ACTIVE", "?page_size=4&page=2"]:
    both(f"plans {q}", "GET", PL + q, tokens=rider)
d = call(DJ, "GET", PL + "?ordering=-price_kobo&is_active=all&page_size=50", token=rider[0])
g = call(GO, "GET", PL + "?ordering=-price_kobo&is_active=all&page_size=50", token=rider[1])
check("plans ordering -price_kobo (ties by column)", (d[0], [p["price_kobo"] for p in d[1]["results"]]),
      (g[0], [p["price_kobo"] for p in g[1]["results"]]))
for (pid,) in sql("SELECT id FROM mobility_plan ORDER BY code LIMIT 14"):
    both(f"plan {pid[-6:]}", "GET", f"{PL}{pid}/", tokens=rider)
both("plan create: rider forbidden", "POST", PL, {"name": "x"}, rider)
both("plan create: no code", "POST", PL, {"name": "x"}, admin)
both("plan create: no type", "POST", PL, {"name": "x", "code": "ct-x"}, admin)
both("plan create: bad period", "POST", PL, {"name": "x", "code": "ct-x", "vehicle_type": "b", "period": "year"}, admin)
both("plan create: no price", "POST", PL, {"name": "x", "code": "ct-x", "vehicle_type": "b", "period": "day"}, admin)
both("plan create: code taken", "POST", PL, {"name": "x", "code": "plan-daily", "vehicle_type": "b", "period": "day",
                                            "price_kobo": 1}, admin)
pm = {k: call(BASE[k], "POST", PL, {"name": " CT Plan ", "code": f" ct-{k}-plan ", "vehicle_type": "e keke",
                                    "period": "week", "duration_days": 7, "swap_allowance": 9, "price_kobo": 1234,
                                    "description": "trial", "auto_renew_default": True}, admin[0 if k == "django" else 1])
      for k in BASE}
PSCRUB = ("id", "code", "created_at")
check("plan create", pm["django"], pm["go"], extra=PSCRUB)
PP = lambda suffix="": (lambda k: f"{PL}{pm[k][1]['id']}/{suffix}")  # noqa: E731
for name, method, path, body in [("plan patch", "PATCH", PP(), {"name": " CT Plan 2 ", "price_kobo": 999,
                                                                "duration_days": None}),
                                 ("plan patch no-op", "PATCH", PP(), {"name": "CT Plan 2"}),
                                 ("plan deactivate", "POST", PP("deactivate/"), None),
                                 ("plan deactivate again", "POST", PP("deactivate/"), None),
                                 ("plan activate", "POST", PP("activate/"), None)]:
    out = {k: call(BASE[k], method, path(k), body, admin[0 if k == "django" else 1]) for k in BASE}
    check(name, out["django"], out["go"], extra=PSCRUB)

VOL = [(re.compile(r"CT_(DJANGO|GO)_TYPE|ct (django|go) type", re.I), "<t>"), (re.compile(r"CT-(DJANGO|GO)-PLAN"), "<c>"),
       (re.compile(r"[0-9a-f]{8}-[0-9a-f-]{27}"), "<uuid>")]


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
for k in BASE:
    ids = [o[k][1]["id"] for o in (ops_made, second, third, pm)]
    audit[k] = norm(sql("SELECT action, before::text, after::text, metadata::text FROM audit_auditevent WHERE "
                        "subject_id IN ('" + "', '".join(ids) + "') ORDER BY created_at, id"))
check("audit trail", (200, audit["django"]), (200, audit["go"]))
print(f"compared {len(audit['go'])} audit rows")
cleanup()
sys.exit(1 if summary() else 0)
