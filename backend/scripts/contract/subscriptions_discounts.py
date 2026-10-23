"""Discount campaigns (CRUD, maker-checker activate, redeem quote, redemptions)
and plan subscriptions (purchase, renew, switch preview/switch, auto-renew,
cancel) on a fresh funded rider per backend. Codes are throwaway CT* rows."""
import sys

from lib import DJ, GO, both, call, check, fresh, new_rider, purge_phones, sql, staff_tokens, summary

ops = staff_tokens()
admin = staff_tokens("admin@yopmail.com", "adminpass123")
rb = {"phone": "+2348033330001", "pin": "1234"}
other = (call(DJ, "POST", "/api/v1/auth/pin/login/", rb)[1]["access"],
         call(GO, "POST", "/api/v1/auth/pin/login/", rb)[1]["access"])
D, S, V = "/api/v1/mobility/discounts/", "/api/v1/mobility/subscriptions/", "/api/v1/mobility/vehicles/"
BASE = {"django": DJ, "go": GO}
PHONES = {"django": "+2348039990071", "go": "+2348039990072"}
IX = {"django": 0, "go": 1}


def cleanup():
    sql("""DELETE FROM mobility_discountredemption WHERE discount_id IN
             (SELECT id FROM mobility_discountcampaign WHERE code LIKE 'CT%');
           DELETE FROM mobility_discountcampaign WHERE code LIKE 'CT%'""")


purge_phones(PHONES.values())
cleanup()
fresh()

# ---- Discounts: reads ----------------------------------------------------
for label, tok in [("admin", admin), ("ops (no tariffs:manage)", ops), ("rider", other)]:
    both(f"discounts as {label}", "GET", D, tokens=tok)
for q in ["?status=ACTIVE", "?status=NOPE&audience=X", "?audience=FLEET", "?search=ride", "?search=%25",
          "?page_size=2&page=2"]:
    both(f"discounts {q}", "GET", D + q, tokens=admin)
for (did,) in sql("SELECT id FROM mobility_discountcampaign ORDER BY created_at LIMIT 6"):
    both(f"discount {did[-6:]}", "GET", f"{D}{did}/", tokens=admin)
    both(f"redemptions {did[-6:]}", "GET", f"{D}{did}/redemptions/?page_size=3", tokens=admin)
both("discount unknown", "GET", f"{D}00000000-0000-0000-0000-000000000000/", tokens=admin)
existing = sql("SELECT code FROM mobility_discountcampaign ORDER BY created_at LIMIT 1")

# ---- Discounts: writes ---------------------------------------------------
both("create: empty", "POST", D, {}, admin)
both("create: bad", "POST", D, {"name": "", "code": "x" * 41, "value_type": "HALF", "value": -1, "status": "LIVE",
                                "audience": "NOBODY", "channels": "", "max_per_account": "x",
                                "starts_at": "soon", "fleet_min_vehicles": 1.5}, admin)
both("create: nulls", "POST", D, {"name": None, "code": None, "value_type": "PERCENT", "value": 5,
                                  "periods": None, "channels": None, "max_redemptions": None}, admin)
both("create: ops forbidden", "POST", D, {"name": "x", "code": "CTOPS", "value_type": "PERCENT", "value": 5}, ops)
if existing:
    both("create: duplicate code", "POST", D, {"name": "x", "code": existing[0][0], "value_type": "PERCENT",
                                               "value": 5}, admin)
SCRUB = ("id", "code", "name", "created_at", "updated_at", "discount_id", "discount_code", "account_id",
         "vehicle_id", "payment_id", "account_name", "account_kura_id", "vehicle_plate", "kura_id",
         "account_display_name", "starts_at", "ends_at", "keeps_until", "queued_plan_id", "plan_id",
         "current_plan_id", "target_plan_id", "message", "subscription_id",
         "registration_plate", "owner_name", "owner_kura_id", "qr", "account")
CODES = {"django": {"pct": "CTDJPCT", "amt": "CTDJAMT"}, "go": {"pct": "CTGOPCT", "amt": "CTGOAMT"}}


def step(name, method, path, body=None, who="admin", extra=()):
    out = {}
    for k in BASE:
        tok = who[k] if isinstance(who, dict) else {"admin": admin, "ops": ops, "other": other}[who][IX[k]]
        out[k] = call(BASE[k], method, path(k) if callable(path) else path, body(k) if callable(body) else body, tok)
    check(name, out["django"], out["go"], extra=SCRUB + tuple(extra))
    return out


pct = step("create percent", "POST", D, lambda k: {
    "name": f" CT {k} ten ", "code": f" {CODES[k]['pct'].lower()} ", "value_type": "PERCENT", "value": 10,
    "periods": ["daily", "weekly", "monthly"], "max_per_account": 2, "summary": " ten off ",
    "starts_at": "2026-01-01T08:00:00", "ends_at": None})
amt = step("create amount", "POST", D, lambda k: {
    "name": f"CT {k} amt", "code": CODES[k]["amt"], "value_type": "AMOUNT", "value": 50000, "status": "PENDING",
    "periods": ["weekly", "swap"], "applies_to_all_plans": False, "plan_option_ids": ["weekly", "pps"],
    "audience": "FLEET", "fleet_min_vehicles": 1, "channels": "App · Hub", "max_redemptions": 5})
did = {"pct": {k: pct[k][1]["id"] for k in BASE}, "amt": {k: amt[k][1]["id"] for k in BASE}}
P = lambda which, suffix="": (lambda k: f"{D}{did[which][k]}/{suffix}")  # noqa: E731
step("patch: bad", "PATCH", P("pct"), {"value": "ten", "status": "LIVE", "name": ""})
step("patch: duplicate code", "PATCH", P("pct"), lambda k: {"code": CODES[k]["amt"]})
step("patch: unknown", "PATCH", f"{D}00000000-0000-0000-0000-000000000000/", {"name": "x"})
step("patch", "PATCH", P("pct"), {"summary": "Ten percent", "max_redemptions": 100, "status": "PENDING"})
step("detail after patch", "GET", P("pct"))
step("activate: ops lacks nothing (price:approve)", "POST", P("pct", "activate/"), who="ops")
step("activate again (409)", "POST", P("pct", "activate/"), who="ops")
step("activate: admin self (bypass)", "POST", P("amt", "activate/"))
step("list after writes", "GET", D + "?search=CT")

# ---- Riders, vehicles, wallets -------------------------------------------
rider = {k: new_rider(BASE[k], PHONES[k]) for k in PHONES}
account = {k: sql(f"SELECT a.id FROM accounts_account a JOIN accounts_user u ON u.id = a.owner_user_id WHERE "
                  f"u.phone = '{PHONES[k]}'")[0][0] for k in PHONES}
model = sql("SELECT id FROM mobility_vehiclemodel WHERE vehicle_type = 'MOTORCYCLE' ORDER BY created_at LIMIT 1")[0][0]
veh = {k: call(BASE[k], "POST", V, {"vehicle_model_id": model, "registration_plate": f"CTSUB{IX[k]}"},
               rider[k])[1]["id"] for k in BASE}
for k in BASE:
    call(BASE[k], "GET", "/api/v1/finance/wallets/mine/", token=rider[k])
    sql(f"UPDATE finance_wallet SET balance_kobo = 5000000 WHERE account_id = '{account[k]}'")
plan = {code: sql(f"SELECT id FROM mobility_plan WHERE code = '{code}'")[0][0]
        for code in ("PLAN-DAILY", "PLAN-WEEKLY-UNLTD", "PLAN-MONTHLY-FLEET", "PLAN-PAY-SWAP", "PLAN-BOAT-DAILY")}


# pin_grant is a stateless short-lived JWT: one per rider, reused (PIN verify is throttled).
GRANT = {k: call(BASE[k], "POST", "/api/v1/auth/pin/verify/", {"pin": "1234"}, rider[k])[1]["pin_grant"] for k in BASE}


def grant(k):
    return GRANT[k]


# Redeem quotes (sign-in only).
step("redeem: empty", "POST", D + "redeem/", {}, who=rider)
step("redeem: bad", "POST", D + "redeem/", {"code": "", "period": "", "list_price_kobo": 0, "channel": "Web",
                                            "plan": "nope"}, who=rider)
step("redeem: null price", "POST", D + "redeem/", {"code": "X", "period": "daily", "list_price_kobo": None}, who=rider)
step("redeem: unknown code", "POST", D + "redeem/", {"code": "nope", "period": "daily"}, who=rider)
step("redeem: percent (matrix price)", "POST", D + "redeem/", lambda k: {"code": CODES[k]["pct"].lower(),
                                                                        "period": "Daily"}, who=rider)
step("redeem: percent with plan", "POST", D + "redeem/", lambda k: {"code": CODES[k]["pct"], "period": "weekly",
                                                                    "plan": plan["PLAN-WEEKLY-UNLTD"]}, who=rider)
step("redeem: wrong period", "POST", D + "redeem/", lambda k: {"code": CODES[k]["pct"], "period": "swap"}, who=rider)
step("redeem: amount, plan option", "POST", D + "redeem/", lambda k: {"code": CODES[k]["amt"], "period": "weekly",
                                                                      "list_price_kobo": 650000}, who=rider)
step("redeem: amount, wrong channel", "POST", D + "redeem/", lambda k: {"code": CODES[k]["amt"], "period": "weekly",
                                                                        "channel": "USSD"}, who=rider)
step("redeem: amount, plan not allowed", "POST", D + "redeem/", lambda k: {
    "code": CODES[k]["amt"], "period": "weekly", "plan": plan["PLAN-DAILY"]}, who=rider)
step("redeem: boat vehicle type", "POST", D + "redeem/", lambda k: {"code": CODES[k]["pct"], "period": "month",
                                                                    "vehicle_type": "BOAT"}, who=rider)

# ---- Subscriptions ---------------------------------------------------------
step("purchase: empty", "POST", S, {}, who=rider)
step("purchase: bad", "POST", S, {"vehicle": "x", "plan": 5, "auto_renew": "maybe", "payment_mode": "CARD",
                                  "channel": "Web", "pin_grant": "", "discount_code": None}, who=rider)
step("purchase: bad pin grant", "POST", S, lambda k: {"vehicle": veh[k], "plan": plan["PLAN-WEEKLY-UNLTD"],
                                                      "pin_grant": "nope"}, who=rider)
step("purchase: other rider's grant", "POST", S, lambda k: {"vehicle": veh[k], "plan": plan["PLAN-WEEKLY-UNLTD"],
                                                            "pin_grant": grant(k)}, who={k: other[IX[k]] for k in BASE})
step("purchase: pay-per-swap row", "POST", S, lambda k: {"vehicle": veh[k], "plan": plan["PLAN-PAY-SWAP"],
                                                         "pin_grant": grant(k)}, who=rider)
step("purchase: code wrong period", "POST", S, lambda k: {"vehicle": veh[k], "plan": plan["PLAN-WEEKLY-UNLTD"],
                                                          "discount_code": CODES[k]["amt"] + "X",
                                                          "pin_grant": grant(k)}, who=rider)
buy = step("purchase weekly with code", "POST", S, lambda k: {
    "vehicle": veh[k], "plan": plan["PLAN-WEEKLY-UNLTD"], "discount_code": f" {CODES[k]['pct'].lower()} ",
    "idempotency_key": f"ct-buy-{k}", "pin_grant": grant(k), "auto_renew": None}, who=rider)
sid = {k: buy[k][1]["id"] for k in BASE}
SP = lambda suffix="": (lambda k: f"{S}{sid[k]}/{suffix}")  # noqa: E731
step("purchase: already active", "POST", S, lambda k: {"vehicle": veh[k], "plan": plan["PLAN-DAILY"],
                                                       "pin_grant": grant(k)}, who=rider)
step("list as rider", "GET", S, who=rider)
step("detail as rider", "GET", SP(), who=rider)
step("detail as other rider (404)", "GET", SP(), who="other")
step("detail as ops", "GET", SP(), who="ops")
step("redemptions after purchase", "GET", P("pct", "redemptions/"))
step("redemptions ?account=bad", "GET", P("pct", "redemptions/?account=bad"))
step("redemptions ?account", "GET", lambda k: f"{D}{did['pct'][k]}/redemptions/?account={account[k]}")
step("discount count after purchase", "GET", P("pct"))

# Switch preview / switch.
step("preview: empty", "POST", SP("switch-preview/"), {}, who=rider)
step("preview: same plan (clear queue)", "POST", SP("switch-preview/"), {"plan": plan["PLAN-WEEKLY-UNLTD"]}, who=rider)
step("preview: upgrade", "POST", SP("switch-preview/"), {"plan": plan["PLAN-MONTHLY-FLEET"]}, who=rider)
step("preview: upgrade with code", "POST", SP("switch-preview/"), lambda k: {
    "plan": plan["PLAN-MONTHLY-FLEET"], "discount_code": CODES[k]["pct"]}, who=rider)
step("preview: upgrade queued", "POST", SP("switch-preview/"), {"plan": plan["PLAN-MONTHLY-FLEET"],
                                                                "immediate": False}, who=rider)
step("preview: downgrade", "POST", SP("switch-preview/"), {"plan": plan["PLAN-DAILY"]}, who=rider)
step("preview: downgrade immediate (409)", "POST", SP("switch-preview/"), {"plan": plan["PLAN-DAILY"],
                                                                           "immediate": True}, who=rider)
step("preview: pay-per-swap", "POST", SP("switch-preview/"), {"plan": plan["PLAN-PAY-SWAP"]}, who=rider)
step("switch: queue downgrade", "POST", SP("switch/"), {"plan": plan["PLAN-DAILY"]}, who=rider)
step("detail queued", "GET", SP(), who=rider, extra=())
step("switch: clear queue", "POST", SP("switch/"), {"plan": plan["PLAN-WEEKLY-UNLTD"]}, who=rider)
step("switch: upgrade without pin", "POST", SP("switch/"), {"plan": plan["PLAN-MONTHLY-FLEET"]}, who=rider)

# Auto-renew / renew.
step("auto-renew: empty", "PATCH", SP("auto-renew/"), {}, who=rider)
step("auto-renew: null", "PATCH", SP("auto-renew/"), {"auto_renew": None}, who=rider)
step("auto-renew off (PATCH)", "PATCH", SP("auto-renew/"), {"auto_renew": "false"}, who=rider)
step("auto-renew on (POST)", "POST", SP("auto-renew/"), {"auto_renew": True}, who=rider)
step("auto-renew as other (404)", "POST", SP("auto-renew/"), {"auto_renew": True}, who="other")
step("renew: no pin", "POST", SP("renew/"), {}, who=rider)
step("renew", "POST", SP("renew/"), lambda k: {"pin_grant": grant(k), "idempotency_key": f"ct-renew-{k}"}, who=rider)
step("renew: replay key", "POST", SP("renew/"), lambda k: {"pin_grant": grant(k), "idempotency_key": f"ct-renew-{k}"},
     who=rider)
step("renew with code (per-account cap 2)", "POST", SP("renew/"), lambda k: {
    "pin_grant": grant(k), "discount_code": CODES[k]["pct"]}, who=rider)
step("renew with code again (exhausted)", "POST", SP("renew/"), lambda k: {
    "pin_grant": grant(k), "discount_code": CODES[k]["pct"]}, who=rider)

# Immediate upgrade (cancel + buy).
up = step("switch: upgrade now", "POST", SP("switch/"), lambda k: {"plan": plan["PLAN-MONTHLY-FLEET"],
                                                                   "pin_grant": grant(k)}, who=rider)
step("old subscription after upgrade", "GET", SP(), who=rider)
sid = {k: up[k][1]["id"] for k in BASE}
step("cancel", "POST", SP("cancel/"), {"reason": " changed mind "}, who=rider)
step("cancel again (409)", "POST", SP("cancel/"), {}, who=rider)
step("renew cancelled (409)", "POST", SP("renew/"), lambda k: {"pin_grant": grant(k)}, who=rider)
step("preview cancelled (409)", "POST", SP("switch-preview/"), {"plan": plan["PLAN-DAILY"]}, who=rider)
step("purchase: other vehicle type's plan (allowed)", "POST", S, lambda k: {"vehicle": veh[k], "plan": plan["PLAN-BOAT-DAILY"],
                                                           "pin_grant": grant(k)}, who=rider)
VR = lambda k: f"{V}{veh[k]}/retire/"  # noqa: E731
step("retire: note too long", "POST", VR, {"note": "x" * 501})
step("retire: rider forbidden", "POST", VR, {}, who=rider)
step("retire: unknown", "POST", f"{V}00000000-0000-0000-0000-000000000000/retire/", {})
step("retire (cancels active plan)", "POST", VR, {"note": "  scrapped  "})
step("retire again", "POST", VR, {})
step("list after flow", "GET", S, who=rider)
step("list ?status=CANCELLED", "GET", S + "?status=CANCELLED", who=rider)
step("list ?vehicle", "GET", lambda k: f"{S}?vehicle={veh[k]}&page_size=1", who=rider, extra=("next",))
step("ops list ?account", "GET", lambda k: f"{S}?account={account[k]}", who="ops")

# Staff reads on existing data.
fresh()
for label, tok in [("ops", ops), ("admin", admin), ("rider", other)]:
    both(f"subscriptions as {label}", "GET", S + "?page_size=50", tokens=tok)
for q in ["?status=ACTIVE", "?account=bad", "?plan=bad&vehicle=bad", f"?plan={plan['PLAN-DAILY']}", "?page_size=3&page=2"]:
    both(f"subscriptions {q}", "GET", S + q, tokens=ops)
for (x,) in sql("SELECT id FROM mobility_subscription ORDER BY created_at LIMIT 8"):
    both(f"subscription {x[-6:]}", "GET", f"{S}{x}/", tokens=ops)

# Side effects: wallet, payments, redemptions, audit trail.
norm = lambda rows: [tuple(r) for r in rows]  # noqa: E731
for name, q in [
    ("wallet balance", "SELECT balance_kobo, hold_kobo FROM finance_wallet WHERE account_id = '{a}'"),
    ("payments", "SELECT channel, purpose, status, amount_kobo, vat_kobo FROM finance_payment WHERE account_id = '{a}' "
                 "ORDER BY created_at"),
    ("redemptions", "SELECT list_price_kobo, discount_kobo, due_kobo, channel, period, payment_id IS NOT NULL, "
                    "subscription_id IS NOT NULL FROM mobility_discountredemption WHERE account_id = '{a}' ORDER BY created_at"),
    ("subscriptions", "SELECT status, swaps_used, auto_renew, list_price_kobo, discount_kobo, amount_kobo, left(discount_code, 2), "
                      "ends_at - starts_at FROM mobility_subscription WHERE account_id = '{a}' ORDER BY created_at"),
    ("audit", "SELECT action, subject_type, before - 'id' - 'ends_at', after - 'id' - 'payment_id' - 'subscription_id' - 'ends_at' "
              "- 'starts_at' - 'discount_code' - 'vehicle_id' - 'plan_id' - 'queued_plan_id' - 'account_id' - 'registration_plate' "
              "FROM audit_auditevent WHERE actor_id = (SELECT owner_user_id FROM accounts_account WHERE id = '{a}') "
              "AND subject_type IN ('subscription', 'payment', 'discount', 'vehicle') ORDER BY created_at"),
]:
    check(f"db: {name}", (200, norm(sql(q.format(a=account["django"])))), (200, norm(sql(q.format(a=account["go"])))))
rows = {k: norm(sql(f"SELECT a.action, a.actor_email, a.before - 'ends_at', a.after - 'ends_at', a.metadata "
                    f"FROM audit_auditevent a WHERE a.subject_id = '{veh[k]}' OR a.subject_id IN "
                    f"(SELECT id::text FROM mobility_subscription WHERE vehicle_id = '{veh[k]}') "
                    f"AND a.actor_email = 'admin@yopmail.com' ORDER BY a.created_at")) for k in BASE}
rows = {k: [r for r in v if r[1] == "admin@yopmail.com"] for k, v in rows.items()}
check("db: retire audit", (200, rows["django"]), (200, rows["go"]))
for key in ("discount.created", "discount.updated", "discount.activated"):
    rows = {k: norm(sql(f"SELECT subject_type, before - 'code', after - 'code' - 'approved_by_id' - 'created_by_id', metadata "
                        f"FROM audit_auditevent WHERE action = '{key}' AND subject_id IN "
                        f"('{did['pct'][k]}', '{did['amt'][k]}') ORDER BY created_at")) for k in BASE}
    check(f"db: {key}", (200, rows["django"]), (200, rows["go"]))

purge_phones(PHONES.values())
cleanup()
sys.exit(1 if summary() else 0)
