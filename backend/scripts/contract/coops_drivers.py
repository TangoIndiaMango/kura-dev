"""Cooperatives + drivers, per role scope; writes cross-read; test rows removed."""
import subprocess
import sys

from lib import DJ, GO, both, call, check, staff_tokens, summary

ops = staff_tokens()
admin = staff_tokens("admin@yopmail.com", "adminpass123")
agent = staff_tokens("agent.yaba@yopmail.com", "agentpass123")
owner_login = {"phone": "+2348022220001", "pin": "1234"}
owner = (call(DJ, "POST", "/api/v1/auth/pin/login/", owner_login)[1]["access"],
         call(GO, "POST", "/api/v1/auth/pin/login/", owner_login)[1]["access"])
fleet_acct = call(DJ, "GET", "/api/v1/auth/me/", token=owner[0])[1]["account"]["id"]

# Cooperatives
for q in ["", "?q=lagos", "?page_size=1&page=2"]:
    both(f"coops list {q or '(default)'}", "GET", f"/api/v1/cooperatives/{q}", tokens=ops)
_, coops = call(DJ, "GET", "/api/v1/cooperatives/", token=ops[0])
if coops.get("results"):
    cid = coops["results"][0]["id"]
    both("coop detail", "GET", f"/api/v1/cooperatives/{cid}/", tokens=ops)
both("coop 404", "GET", "/api/v1/cooperatives/00000000-0000-0000-0000-000000000000/", tokens=ops)
both("coops as rider (forbidden)", "GET", "/api/v1/cooperatives/", tokens=owner)
both("coop create blank", "POST", "/api/v1/cooperatives/", {"name": ""}, admin)
both("coop create spaces", "POST", "/api/v1/cooperatives/", {"name": "   "}, admin)
both("coop create bad status", "POST", "/api/v1/cooperatives/", {"name": "x", "status": "NOPE"}, admin)
for who, base, tok, other, otok in [("go", GO, admin[1], DJ, admin[0]), ("django", DJ, admin[0], GO, admin[1])]:
    st, made = call(base, "POST", "/api/v1/cooperatives/", {"name": f" Contract {who} coop ", "region": " Ikeja "}, tok)
    assert st == 201, (who, st, made)
    check(f"{who} coop create -> other reads", (200, made), call(other, "GET", f"/api/v1/cooperatives/{made['id']}/", token=otok))
    st, upd = call(base, "PATCH", f"/api/v1/cooperatives/{made['id']}/", {"status": "INACTIVE", "region": "Yaba"}, tok)
    check(f"{who} coop patch -> other reads", (st, upd), call(other, "GET", f"/api/v1/cooperatives/{made['id']}/", token=otok))

# Drivers
for label, tok in [("ops", ops), ("fleet owner", owner), ("hub agent", agent)]:
    both(f"drivers list as {label}", "GET", "/api/v1/drivers/?page_size=50", tokens=tok)
both("drivers ?account=", "GET", f"/api/v1/drivers/?account={fleet_acct}", tokens=ops)
both("drivers ?status=ACTIVE&q=08", "GET", "/api/v1/drivers/?status=ACTIVE&q=080", tokens=ops)
both("drivers ?account=bad", "GET", "/api/v1/drivers/?account=bad", tokens=ops)
_, dl = call(DJ, "GET", f"/api/v1/drivers/?account={fleet_acct}", token=ops[0])
did = dl["results"][0]["id"]
both("driver detail ops", "GET", f"/api/v1/drivers/{did}/", tokens=ops)
both("driver detail owner", "GET", f"/api/v1/drivers/{did}/", tokens=owner)
both("driver detail agent", "GET", f"/api/v1/drivers/{did}/", tokens=agent)
both("attach: missing", "POST", "/api/v1/drivers/attach/", {}, owner)
both("attach: unknown account", "POST", "/api/v1/drivers/attach/",
     {"account_id": "00000000-0000-0000-0000-000000000000", "phone": "08031234567"}, owner)
both("attach: bad phone", "POST", "/api/v1/drivers/attach/", {"account_id": fleet_acct, "phone": "123"}, owner)
both("attach: staff phone", "POST", "/api/v1/drivers/attach/", {"account_id": fleet_acct,
     "phone": call(DJ, "GET", "/api/v1/auth/me/", token=agent[0])[1]["user"]["phone"] or "08000000000"}, owner)
both("limits: empty", "PATCH", f"/api/v1/drivers/{did}/", {}, owner)
both("limits: below min", "PATCH", f"/api/v1/drivers/{did}/", {"daily_swap_limit": 0}, owner)
for who, base, tok, other, otok, phone in [("go", GO, owner[1], DJ, owner[0], "08039990011"),
                                           ("django", DJ, owner[0], GO, owner[1], "08039990012")]:
    st, made = call(base, "POST", "/api/v1/drivers/attach/", {"account_id": fleet_acct, "phone": phone,
                    "first_name": "Contract", "last_name": who, "daily_swap_limit": 3}, tok)
    assert st == 201, (who, st, made)
    check(f"{who} attach -> other reads", (200, made), call(other, "GET", f"/api/v1/drivers/{made['id']}/", token=otok))
    st, upd = call(base, "PATCH", f"/api/v1/drivers/{made['id']}/", {"daily_swap_limit": None, "daily_spend_kobo_limit": 500000}, tok)
    check(f"{who} limits -> other reads", (st, upd), call(other, "GET", f"/api/v1/drivers/{made['id']}/", token=otok))
    st, again = call(base, "POST", "/api/v1/drivers/attach/", {"account_id": fleet_acct, "phone": phone}, tok)
    check(f"{who} re-attach -> other reads", (200 if st == 201 else st, again), call(other, "GET", f"/api/v1/drivers/{made['id']}/", token=otok))

subprocess.run(["psql", "postgres://kura:kura_dev_password@127.0.0.1:5432/kura", "-qc", """
  WITH u AS (SELECT id FROM accounts_user WHERE phone IN ('+2348039990011', '+2348039990012'))
  , a AS (DELETE FROM accounts_driver WHERE user_id IN (SELECT id FROM u))
  , b AS (DELETE FROM notifications_notification WHERE user_id IN (SELECT id FROM u))
  DELETE FROM accounts_user WHERE id IN (SELECT id FROM u);
  DELETE FROM accounts_cooperative WHERE name LIKE 'Contract % coop';"""], check=True)
sys.exit(1 if summary() else 0)
