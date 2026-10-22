"""Staff users directory: reads compared directly; invites/edits cross-read.
Test users use the undeliverable example.test domain and are removed after."""
import subprocess
import sys

from lib import DJ, GO, both, call, check, staff_tokens, summary

ops = staff_tokens()
admin = staff_tokens("admin@yopmail.com", "adminpass123")

for q in ["", "?page_size=3", "?page=2&page_size=3", "?role=HUB_AGENT", "?is_active=false",
          "?status=invited", "?status=active", "?status=suspended", "?status=weird", "?q=yopmail",
          "?search=ops", "?start_date=2026-01-01", "?end_date=2026-10-20", "?start_date=bad"]:
    both(f"users list {q or '(default)'}", "GET", f"/api/v1/users/{q}", tokens=ops)
_, hubs = call(DJ, "GET", "/api/v1/hubs/?page_size=1", token=ops[0])
_, ulist = call(DJ, "GET", "/api/v1/users/?page_size=100", token=ops[0])
hub_id = next((h for u in ulist["results"] for h in u["hub_ids"]), None)
if hub_id:
    both("users list ?hub=", "GET", f"/api/v1/users/?hub={hub_id}", tokens=ops)
for q in ["", "?start_date=2026-10-01&end_date=2026-10-21", "?end_date=garbage"]:
    both(f"users stats {q or '(default)'}", "GET", f"/api/v1/users/stats/{q}", tokens=ops)
uid = ulist["results"][0]["id"]
both("user detail", "GET", f"/api/v1/users/{uid}/", tokens=ops)
both("user 404 malformed", "GET", "/api/v1/users/nope/", tokens=ops)
both("user 404 unknown", "GET", "/api/v1/users/00000000-0000-0000-0000-000000000000/", tokens=ops)
_, rider = call(DJ, "POST", "/api/v1/auth/pin/login/", {"phone": "+2348022220001", "pin": "1234"})
both("non-staff id is 404", "GET", f"/api/v1/users/{rider['user']['id']}/", tokens=ops)

for name, path in [("users csv", "/api/v1/users/export/"), ("users csv invited", "/api/v1/users/export/?status=invited")]:
    d = call(DJ, "GET", path, token=ops[0], raw=True)
    g = call(GO, "GET", path, token=ops[1], raw=True)
    check(name, (d[0], {"csv": d[1].decode(), "n": d[2].get("X-Export-Row-Count")}),
          (g[0], {"csv": g[1].decode(), "n": g[2].get("X-Export-Row-Count")}))

both("invite: empty", "POST", "/api/v1/users/", {}, admin)
both("invite: bad email", "POST", "/api/v1/users/", {"email": "nope", "role": "OPS_MANAGER"}, admin)
both("invite: email taken", "POST", "/api/v1/users/", {"email": "OPS@yopmail.com", "role": "OPS_MANAGER"}, admin)
both("invite: rider role", "POST", "/api/v1/users/", {"email": "x1@example.test", "role": "driver"}, admin)
both("invite: unknown role", "POST", "/api/v1/users/", {"email": "x1@example.test", "role": "NOPE"}, admin)
both("invite: hubs on non-agent", "POST", "/api/v1/users/",
     {"email": "x1@example.test", "role": "OPS_MANAGER", "hub_ids": ["00000000-0000-0000-0000-000000000000"]}, admin)
both("invite: unknown coop", "POST", "/api/v1/users/",
     {"email": "x1@example.test", "role": "COOPERATIVE_CHAIRMAN", "cooperative_id": "00000000-0000-0000-0000-000000000000"}, admin)
both("self deactivate refused", "POST", f"/api/v1/users/{call(DJ, 'GET', '/api/v1/auth/me/', token=admin[0])[1]['user']['id']}/deactivate/", None, admin)

for who, base, tok, other, otok in [("go", GO, admin[1], DJ, admin[0]), ("django", DJ, admin[0], GO, admin[1])]:
    body = {"email": f"Contract.{who}@Example.test", "role": "hub_agent", "first_name": " Con ",
            "last_name": "Tract", "phone": "", "hub_ids": [hub_id] if hub_id else []}
    st, made = call(base, "POST", "/api/v1/users/", body, tok)
    assert st == 201, (who, st, made)
    made = {k: v for k, v in made.items() if k not in ("invite_email_sent", "expires_hours")}
    check(f"{who} invite -> other reads same", (200, made),
          call(other, "GET", f"/api/v1/users/{made['id']}/", token=otok), extra=("public_id",))
    st, upd = call(base, "PATCH", f"/api/v1/users/{made['id']}/", {"role": "OPS_MANAGER", "first_name": "Renamed"}, tok)
    check(f"{who} patch role -> other reads same", (st, upd), call(other, "GET", f"/api/v1/users/{made['id']}/", token=otok))
    st, off = call(base, "POST", f"/api/v1/users/{made['id']}/deactivate/", None, tok)
    check(f"{who} deactivate -> other reads same", (st, off), call(other, "GET", f"/api/v1/users/{made['id']}/", token=otok))
    st, on = call(base, "POST", f"/api/v1/users/{made['id']}/activate/", None, tok)
    check(f"{who} activate -> other reads same", (st, on), call(other, "GET", f"/api/v1/users/{made['id']}/", token=otok))
    check(f"{who} resend invite", call(base, "POST", f"/api/v1/users/{made['id']}/resend-invite/", None, tok),
          call(other, "POST", f"/api/v1/users/{made['id']}/resend-invite/", None, otok))

subprocess.run(["psql", "postgres://kura:kura_dev_password@127.0.0.1:5432/kura", "-qc", """
  WITH u AS (SELECT id FROM accounts_user WHERE email LIKE 'contract.%@example.test' OR email LIKE 'x_@example.test')
  , a AS (DELETE FROM accounts_staffmembership WHERE user_id IN (SELECT id FROM u))
  , b AS (DELETE FROM accounts_passwordsetuptoken WHERE user_id IN (SELECT id FROM u))
  , c AS (DELETE FROM notifications_notification WHERE user_id IN (SELECT id FROM u))
  , d AS (UPDATE audit_auditevent SET actor_id = NULL WHERE actor_id IN (SELECT id FROM u))
  DELETE FROM accounts_user WHERE id IN (SELECT id FROM u);"""], check=True)
sys.exit(1 if summary() else 0)
