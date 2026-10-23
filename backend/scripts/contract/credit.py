"""Credit: eligibility, score override, apply / approve / decline, loans +
repay, offers (create / patch / assign / accept, /offers alias) and saved
segments. Credit + offers are switched on with a CT config row (removed)."""
import json
import sys
import uuid

from lib import CUR, DJ, GO, both, call, check, fresh, new_rider, purge_phones, sql, staff_tokens, summary

ops = staff_tokens()
admin = staff_tokens("admin@yopmail.com", "adminpass123")
agent = staff_tokens("agent.yaba@yopmail.com", "agentpass123")
BASE = {"django": DJ, "go": GO}
IX = {"django": 0, "go": 1}
PHONES = {"django": "+2348039990101", "go": "+2348039990102"}
CR = "/api/v1/credit/"


def cleanup():
    sql("""DELETE FROM credit_offerassignment WHERE offer_id IN (SELECT id FROM credit_productoffer WHERE name LIKE 'CT %');
      DELETE FROM credit_productoffer WHERE name LIKE 'CT %';
      DELETE FROM credit_segment WHERE name LIKE 'CT %';
      DELETE FROM core_configversion WHERE note LIKE 'CT %'""")


def purge():
    pa = ("SELECT a.id FROM accounts_account a JOIN accounts_user u ON u.id = a.owner_user_id WHERE u.phone IN "
          f"('{PHONES['django']}', '{PHONES['go']}')")
    sql(f"""DELETE FROM credit_offerassignment WHERE account_id IN ({pa});
      DELETE FROM credit_loanrepayment WHERE loan_id IN (SELECT id FROM credit_loan WHERE account_id IN ({pa}));
      DELETE FROM credit_loan WHERE account_id IN ({pa});
      DELETE FROM credit_creditapplication WHERE account_id IN ({pa});
      DELETE FROM credit_creditline WHERE account_id IN ({pa});
      DELETE FROM credit_creditscore WHERE account_id IN ({pa})""")
    purge_phones(PHONES.values())


cleanup()
purge()
fresh()
rider = {k: new_rider(BASE[k], PHONES[k]) for k in PHONES}
account = {k: sql(f"SELECT a.id FROM accounts_account a JOIN accounts_user u ON u.id = a.owner_user_id WHERE "
                  f"u.phone = '{PHONES[k]}'")[0][0] for k in PHONES}
SCRUB = ("id", "account_id", "application_id", "loan_id", "created_at", "updated_at", "starts_at", "due_at",
         "offer_id", "assignment_ids", "sample_account_ids", "computed_at", "last_evaluated_at")


def step(name, method, path, body=None, who="rider", extra=()):
    out = {}
    for k in BASE:
        tok = rider[k] if who == "rider" else who[IX[k]]
        out[k] = call(BASE[k], method, path(k) if callable(path) else path, body(k) if callable(body) else body, tok)
    check(name, out["django"], out["go"], extra=SCRUB + tuple(extra))
    return out


GRANT = {k: call(BASE[k], "POST", "/api/v1/auth/pin/verify/", {"pin": "1234"}, rider[k])[1]["pin_grant"] for k in BASE}
step("eligibility (fresh rider)", "GET", CR + "eligibility/")
step("eligibility as ops (no account)", "GET", CR + "eligibility/", who=ops)
step("apply: empty", "POST", CR + "applications/", {})
step("apply: credit disabled", "POST", CR + "applications/", lambda k: {"amount_kobo": 600000, "tenor_days": 7,
                                                                        "idempotency_key": f"ct-{k}", "pin_grant": GRANT[k]})
step("offer create: offers disabled", "POST", "/api/v1/offers/", {"name": "CT x", "offer_type": "CREDIT"}, who=admin)
for label, tok in [("ops", ops), ("admin", admin), ("agent", agent)]:
    both(f"applications as {label}", "GET", CR + "applications/", tokens=tok, extra=CUR)
    both(f"loans as {label}", "GET", CR + "loans/", tokens=tok, extra=CUR)
    both(f"scores as {label}", "GET", CR + "scores/", tokens=tok, extra=CUR)
    both(f"offers as {label}", "GET", "/api/v1/offers/", tokens=tok)
    both(f"segments as {label}", "GET", "/api/v1/segments/", tokens=tok)
both("scores ?account=bad", "GET", CR + "scores/?account=bad", tokens=admin)

# Switch credit + offers on (lenient thresholds), verify KYC, score the riders.
for ns, value in [("credit", {"enabled": True, "min_active_days": 0, "min_on_time_pct": 0, "min_trusted_device_days": 0}),
                  ("offers", {"enabled": True})]:
    sql(f"""INSERT INTO core_configversion (id, created_at, updated_at, namespace, key, value, status, effective_from, note)
        VALUES (gen_random_uuid(), now(), now(), '{ns}', 'settings', '{json.dumps(value)}', 'ACTIVE', now() + interval '1 hour',
        'CT {ns}')""")
for k in BASE:
    sql(f"UPDATE accounts_account SET kyc_status = 'VERIFIED' WHERE id = '{account[k]}'")
step("override: bad", "POST", lambda k: f"{CR}scores/{account[k]}/override/", {"score": 101, "reason": ""}, who=admin)
step("override: bad account", "POST", f"{CR}scores/nope/override/", {"score": 80, "recommended_limit_kobo": 1,
                                                                     "reason": "x"}, who=admin)
step("override: rider forbidden", "POST", lambda k: f"{CR}scores/{account[k]}/override/", {"score": 80}, )
step("override", "POST", lambda k: f"{CR}scores/{account[k]}/override/", {"score": 80, "recommended_limit_kobo": 2_000_000,
                                                                          "reason": "CT manual"}, who=admin)
step("scores ?account", "GET", lambda k: f"{CR}scores/?account={account[k]}", who=admin, extra=CUR)
step("eligibility (eligible)", "GET", CR + "eligibility/")
A = CR + "applications/"
step("apply: bad grant", "POST", A, lambda k: {"amount_kobo": 600000, "tenor_days": 7, "idempotency_key": f"ct-a-{k}",
                                               "pin_grant": "nope"})
step("apply: below min", "POST", A, lambda k: {"amount_kobo": 100, "tenor_days": 7, "idempotency_key": f"ct-a-{k}",
                                               "pin_grant": GRANT[k]})
step("apply: bad tenor", "POST", A, lambda k: {"amount_kobo": 600000, "tenor_days": 9, "idempotency_key": f"ct-a-{k}",
                                               "pin_grant": GRANT[k]})
step("apply: over limit", "POST", A, lambda k: {"amount_kobo": 3_000_000, "tenor_days": 7,
                                                "idempotency_key": f"ct-a-{k}", "pin_grant": GRANT[k]})
a1 = step("apply", "POST", A, lambda k: {"amount_kobo": 600_000, "tenor_days": 14, "idempotency_key": f"ct-a-{k}",
                                         "pin_grant": GRANT[k]})
step("apply replay", "POST", A, lambda k: {"amount_kobo": 600_000, "tenor_days": 14, "idempotency_key": f"ct-a-{k}",
                                           "pin_grant": GRANT[k]})
a2 = step("apply second", "POST", A, lambda k: {"amount_kobo": 500_000, "tenor_days": 7, "idempotency_key": f"ct-b-{k}",
                                                "pin_grant": GRANT[k]})
app1, app2 = ({k: x[k][1]["id"] for k in BASE} for x in (a1, a2))
step("applications as rider", "GET", A, extra=CUR)
step("application detail", "GET", lambda k: f"{A}{app1[k]}/")
step("application of other rider (404)", "GET", lambda k: f"{A}{app1['go' if k == 'django' else 'django']}/")
step("approve: rider forbidden", "POST", lambda k: f"{A}{app1[k]}/approve/", {})
step("decline", "POST", lambda k: f"{A}{app2[k]}/decline/", {"reason": " not now "}, who=admin)
step("decline again", "POST", lambda k: f"{A}{app2[k]}/decline/", {}, who=admin)
step("approve declined", "POST", lambda k: f"{A}{app2[k]}/approve/", {}, who=admin)
step("approve", "POST", lambda k: f"{A}{app1[k]}/approve/", {"reason": "ok"}, who=admin)
step("approve again", "POST", lambda k: f"{A}{app1[k]}/approve/", {}, who=admin)
step("decline approved", "POST", lambda k: f"{A}{app1[k]}/decline/", {}, who=admin)
step("eligibility (loan active)", "GET", CR + "eligibility/")
L = CR + "loans/"
lst = step("loans as rider", "GET", L, extra=CUR)
loan = {k: lst[k][1]["results"][0]["id"] for k in BASE}
step("loan detail", "GET", lambda k: f"{L}{loan[k]}/")
step("loan detail as admin", "GET", lambda k: f"{L}{loan[k]}/", who=admin)
step("repay: empty", "POST", lambda k: f"{L}{loan[k]}/repay/", {})
step("repay: insufficient wallet", "POST", lambda k: f"{L}{loan[k]}/repay/",
     lambda k: {"amount_kobo": 100_000, "idempotency_key": f"ct-r1-{k}", "pin_grant": GRANT[k]})
for k in BASE:
    call(BASE[k], "GET", "/api/v1/finance/wallets/mine/", token=rider[k])
    sql(f"UPDATE finance_wallet SET balance_kobo = 1000000 WHERE account_id = '{account[k]}'")
step("repay part (interest first)", "POST", lambda k: f"{L}{loan[k]}/repay/",
     lambda k: {"amount_kobo": 100_000, "idempotency_key": f"ct-r2-{k}", "pin_grant": GRANT[k]})
step("repay replay", "POST", lambda k: f"{L}{loan[k]}/repay/",
     lambda k: {"amount_kobo": 100_000, "idempotency_key": f"ct-r2-{k}", "pin_grant": GRANT[k]})
step("repay rest (paid)", "POST", lambda k: f"{L}{loan[k]}/repay/",
     lambda k: {"amount_kobo": 900_000, "idempotency_key": f"ct-r3-{k}", "pin_grant": GRANT[k]})
step("repay paid loan", "POST", lambda k: f"{L}{loan[k]}/repay/",
     lambda k: {"amount_kobo": 1, "idempotency_key": f"ct-r4-{k}", "pin_grant": GRANT[k]})

# Offers (both mounts) + segments.
O = "/api/v1/offers/"
step("offer create: bad", "POST", O, {"name": "", "offer_type": "LOAN", "terms": [1], "status": "LIVE"}, who=admin)
of = step("offer create", "POST", O, lambda k: {"name": f"CT offer {k}", "offer_type": "CREDIT", "summary": " cheap ",
                                                "terms": {"apr": 5}, "status": "ACTIVE"}, who=admin, extra=("name",))
offer = {k: of[k][1]["id"] for k in BASE}
step("offer detail (credit mount)", "GET", lambda k: f"{CR}offers/{offer[k]}/", who=admin, extra=("name",))
step("offer patch", "PATCH", lambda k: f"{O}{offer[k]}/", {"summary": "", "offer_type": "NOPE", "terms": {"apr": 4}},
     who=admin, extra=("name",))
step("assign: none", "POST", lambda k: f"{O}{offer[k]}/assign/", {}, who=admin)
step("assign: bad criteria key", "POST", lambda k: f"{O}{offer[k]}/assign/", {"segment_criteria": {"x": 1}}, who=admin)
step("assign", "POST", lambda k: f"{O}{offer[k]}/assign/", lambda k: {"account_ids": [account[k]], "channel": "USSD"},
     who=admin)
step("assign again (reused)", "POST", lambda k: f"{O}{offer[k]}/assign/", lambda k: {"account_ids": [account[k]]}, who=admin)
mine = step("offers mine", "GET", O + "mine/", extra=("offer_name",))
asg = {k: mine[k][1][0]["id"] for k in BASE}
step("accept: bad grant", "POST", lambda k: f"{O}assignments/{asg[k]}/accept/", {"pin_grant": "x"})
step("accept", "POST", lambda k: f"{CR}offer-assignments/{asg[k]}/accept/", lambda k: {"pin_grant": GRANT[k],
                                                                                       "amount_kobo": 5000})
step("accept again", "POST", lambda k: f"{O}assignments/{asg[k]}/accept/", lambda k: {"pin_grant": GRANT[k]})
S = "/api/v1/segments/"
step("preview: bad keys", "POST", S + "preview/", {"criteria": {"color": "red", "age": 3}}, who=admin)
step("preview: empty", "POST", S + "preview/", {"criteria": {}}, who=admin)
step("preview: unknown segment", "POST", S + "preview/", {"criteria": {"segment_id": str(uuid.uuid4())}}, who=admin)
step("preview", "POST", S + "preview/", {"criteria": {"status": "ACTIVE", "kyc_status": "VERIFIED", "min_active_days": 0,
                                                      "min_score": 70}}, who=admin)
sg = step("segment create", "POST", S, lambda k: {"name": f" CT seg {k} ", "criteria": {"kind": "INDIVIDUAL",
                                                                                      "junk": 1}}, who=admin,
          extra=("name",))
seg = {k: sg[k][1]["id"] for k in BASE}
step("segment patch", "PATCH", lambda k: f"{S}{seg[k]}/", {"status": "ACTIVE", "criteria": {"max_active_days": 3}},
     who=admin, extra=("name",))
step("segment refresh", "POST", lambda k: f"{S}{seg[k]}/refresh/", who=admin, extra=("name",))
step("segment members", "GET", lambda k: f"{S}{seg[k]}/members/?page_size=5", who=admin, extra=("next",))
step("preview saved segment", "POST", S + "preview/", lambda k: {"criteria": {"segment_id": seg[k]}}, who=admin,
     extra=("summary",))
step("segments ?search", "GET", S + "?search=CT%20seg&status=ACTIVE", who=admin, extra=("name",))

norm = lambda rows: [tuple(r) for r in rows]  # noqa: E731
for name, q in [
    ("loan", "SELECT principal_kobo, interest_kobo, total_due_kobo, repaid_kobo, daily_installment_kobo, "
             "swap_credit_remaining_kobo, status FROM credit_loan WHERE account_id = '{a}'"),
    ("applications", "SELECT amount_kobo, tenor_days, interest_rate_bps, status, decision_reason FROM "
                     "credit_creditapplication WHERE account_id = '{a}' ORDER BY created_at"),
    ("line", "SELECT limit_kobo, status, score_id IS NOT NULL FROM credit_creditline WHERE account_id = '{a}'"),
    ("payments", "SELECT channel, amount_kobo, vat_kobo, purpose FROM finance_payment WHERE account_id = '{a}' ORDER BY created_at"),
    ("wallet", "SELECT balance_kobo FROM finance_wallet WHERE account_id = '{a}'"),
    ("notifications", "SELECT title, regexp_replace(body, 'CT offer (django|go)', 'CT offer'), severity FROM notifications_notification WHERE user_id = "
                      "(SELECT owner_user_id FROM accounts_account WHERE id = '{a}') ORDER BY created_at"),
]:
    check(f"db: {name}", (200, norm(sql(q.format(a=account["django"])))), (200, norm(sql(q.format(a=account["go"])))))

cleanup()
purge()
sys.exit(1 if summary() else 0)
