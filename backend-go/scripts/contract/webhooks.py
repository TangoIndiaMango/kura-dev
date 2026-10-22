"""PSP webhooks: Paystack signature (sha512 HMAC), idempotent ingest, VA
assignment, ignored / failed events, Nomba without a secret, and the admin
events feed. Event ids differ per backend (they share one database)."""
import hashlib
import hmac
import json
import os
import sys
import urllib.request
import uuid

from lib import CUR, DJ, GO, both, check, fresh, new_rider, purge_phones, sql, staff_tokens, summary

ops = staff_tokens()
admin = staff_tokens("admin@yopmail.com", "adminpass123")
BASE = {"django": DJ, "go": GO}
PHONES = {"django": "+2348039990131", "go": "+2348039990132"}
W = "/api/v1/webhooks/"
ENV = os.path.join(os.path.dirname(__file__), "..", "..", "..", "infra", ".env")
SECRET = next(line.split("=", 1)[1].strip().strip('"') for line in open(ENV) if line.startswith("PAYSTACK_SECRET_KEY="))
RUN = uuid.uuid4().hex[:8]


def post(base, path, body, headers):
    raw = body if isinstance(body, bytes) else json.dumps(body).encode()
    req = urllib.request.Request(base + path, data=raw, method="POST",
                                 headers={"Content-Type": "application/json", **headers})
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            return r.status, json.loads(r.read() or b"{}")
    except urllib.error.HTTPError as e:
        data = e.read()
        try:
            return e.code, json.loads(data)
        except ValueError:
            return e.code, {"_raw": data[:120].decode(errors="replace")}


def signed(body):
    raw = json.dumps(body).encode()
    return raw, {"x-paystack-signature": hmac.new(SECRET.encode(), raw, hashlib.sha512).hexdigest()}


def step(name, path, body_for, headers_for=None, extra=()):
    out = {}
    for k in BASE:
        body = body_for(k)
        raw, hdrs = signed(body) if headers_for is None else (json.dumps(body).encode(), headers_for(k))
        out[k] = post(BASE[k], path, raw, hdrs)
    check(name, out["django"], out["go"], extra=("id",) + tuple(extra))
    return out


purge_phones(PHONES.values())
fresh()
for label, tok in [("admin", admin), ("ops", ops)]:
    both(f"events as {label}", "GET", W + "events/", tokens=tok, extra=CUR)
for q in ["?psp=PAYSTACK", "?psp=NOPE", "?status=FAILED", "?event_kind=VA_ASSIGNED"]:
    both(f"events {q}", "GET", W + "events/" + q, tokens=admin, extra=CUR)
for (eid,) in sql("SELECT id FROM integrations_pspwebhookevent ORDER BY created_at DESC LIMIT 3"):
    both(f"event {eid[-6:]}", "GET", f"{W}events/{eid}/", tokens=admin)

rider = {k: new_rider(BASE[k], PHONES[k]) for k in BASE}
account = {k: sql(f"SELECT a.id FROM accounts_account a JOIN accounts_user u ON u.id = a.owner_user_id WHERE "
                  f"u.phone = '{PHONES[k]}'")[0][0] for k in BASE}
NUBAN = {"django": "71" + RUN[:0] + "11112222"[:8], "go": "72" + "11112222"[:8]}

step("paystack: unsigned", W + "paystack", lambda k: {"event": "charge.success"}, lambda k: {})
step("paystack: bad signature", W + "paystack", lambda k: {"event": "x"}, lambda k: {"x-paystack-signature": "00"})
step("nomba: no secret configured", W + "nomba", lambda k: {"event_type": "payment_success"},
     lambda k: {"nomba-signature": "x", "nomba-timestamp": "1"})
va = lambda k, n: {"event": "dedicatedaccount.assign.success",  # noqa: E731
                   "data": {"id": f"{RUN}-{k}-{n}", "customer": {"customer_code": account[k]},
                            "dedicated_account": {"account_number": NUBAN[k], "account_name": "CT Rider",
                                                  "bank": {"name": "Wema Bank"}}}}
step("VA assigned", W + "paystack", lambda k: va(k, 1))
step("VA assigned replay (created false)", W + "paystack", lambda k: va(k, 1))
step("VA assign: bad NUBAN (failed)", W + "paystack", lambda k: {
    "event": "dedicatedaccount.assign.success",
    "data": {"id": f"{RUN}-{k}-2", "customer": {"customer_code": account[k]},
             "dedicated_account": {"account_number": "123", "account_name": "x", "bank_name": "y"}}})
step("VA assign: no account", W + "paystack", lambda k: {
    "event": "customeridentification.success",
    "data": {"id": f"{RUN}-{k}-3", "account_number": "7300000000", "account_name": "x", "bank_name": "y"}})
step("unknown event (ignored)", W + "paystack", lambda k: {"event": "subscription.create", "data": {"id": f"{RUN}-{k}-4"}})
step("event id from payload hash", W + "paystack", lambda k: {"event": "transfer.success", "data": {"k": k, "r": RUN,
                                                                                                 "n": [1, 2.5, "é"]}})
step("charge.success: missing reference", W + "paystack", lambda k: {"event": "charge.success",
                                                                     "data": {"id": f"{RUN}-{k}-5", "amount": 1000}})

norm = lambda rows: [tuple(r) for r in rows]  # noqa: E731
rows = {k: norm(sql(f"SELECT psp, event_kind, status, error, replace(psp_event_id, '{k}', 'K') FROM "
                    f"integrations_pspwebhookevent WHERE psp_event_id LIKE '%{RUN}%' AND psp_event_id LIKE '%-{k}-%' "
                    "ORDER BY created_at")) for k in BASE}
check("db: events", (200, rows["django"]), (200, rows["go"]))
rows = {k: norm(sql(f"SELECT nuban IS NOT NULL, bank_name, account_name, status FROM finance_virtualaccount "
                    f"WHERE account_id = '{account[k]}'")) for k in BASE}
check("db: virtual account", (200, rows["django"]), (200, rows["go"]))
rows = {k: norm(sql("SELECT action, after - 'nuban' FROM audit_auditevent WHERE subject_id IN (SELECT id::text FROM "
                    f"integrations_pspwebhookevent WHERE psp_event_id LIKE '%{RUN}%' AND psp_event_id LIKE '%-{k}-%') "
                    f"OR (subject_type = 'virtual_account' AND subject_id = '{account[k]}') ORDER BY created_at")) for k in BASE}
check("db: audit", (200, rows["django"]), (200, rows["go"]))

sql(f"DELETE FROM integrations_pspwebhookevent WHERE psp_event_id LIKE '%{RUN}%' OR psp_event_id LIKE 'transfer.success:%'")
purge_phones(PHONES.values())
sys.exit(1 if summary() else 0)
