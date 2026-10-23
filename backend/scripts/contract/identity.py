"""Identity / KYC writes end to end, one fresh rider per backend.

The Go rider is driven through Go and the Django rider through Django with
the same steps; every response, the resulting audit trail, notifications and
the dev NUBAN are compared. Test riders are purged before and after.
"""
import sys
import time

from lib import DJ, GO, call, check, media_asset, new_rider, purge_phones, sql, staff_tokens, summary

PHONES = {"go": "+2348039990031", "django": "+2348039990032"}
BASES = {"go": GO, "django": DJ}
ASSET_KEYS = ("face_asset_id", "id_front_asset_id", "id_back_asset_id", "photo_url", "id_front_url",
              "id_back_url", "virtual_account_nuban", "id", "kura_id", "account", "user", "public_id",
              "phone", "owner_user", "created_at", "date_joined")

purge_phones(PHONES.values())
admin = dict(zip(("django", "go"), staff_tokens("admin@yopmail.com", "adminpass123")))
rider = {k: new_rider(BASES[k], PHONES[k]) for k in PHONES}
assets = {k: {n: media_asset(PHONES[k]) for n in ("face", "front", "back", "face2", "front2", "back2")}
          for k in PHONES}
# Staff-uploaded photos for the assisted submit (kyc/submit).
staff_assets = {k: {n: media_asset(owner_email="admin@yopmail.com") for n in ("face", "front", "back")}
                for k in PHONES}
foreign = {"go": assets["django"]["face"], "django": assets["go"]["face"]}
account = {}


def step(name, method, path, body=None, who="rider"):
    """Run the same step for both riders on their own backend and compare."""
    out = {}
    for k in ("django", "go"):
        tok = rider[k] if who == "rider" else admin[k]
        p = path(k) if callable(path) else path
        b = body(k) if callable(body) else body
        out[k] = call(BASES[k], method, p, b, tok)
    check(name, out["django"], out["go"], extra=ASSET_KEYS)
    return out


def ident(k, **over):
    a = assets[k]
    return {"display_name": "Contract Rider", "id_type": "NIN", "id_number": "12345678901",
            "face_asset_id": a["face"], "id_front_asset_id": a["front"], "id_back_asset_id": a["back"],
            "consent_service": True, **over}


I = "/api/v1/accounts/identity/"
step("submit: empty", "POST", I, {})
step("submit: bad types", "POST", I, lambda k: {"display_name": "", "id_type": "nin", "face_asset_id": "x",
                                                "id_front_asset_id": 5, "consent_service": "maybe", "channel": "SMS"})
step("submit: blank choice", "POST", I, lambda k: ident(k, id_type=""))
step("submit: no consent", "POST", I, lambda k: ident(k, consent_service=False))
step("submit: short number", "POST", I, lambda k: ident(k, id_number="12-34"))
step("submit: foreign face", "POST", I, lambda k: ident(k, face_asset_id=foreign[k]))
step("submit: unknown asset", "POST", I, lambda k: ident(k, id_back_asset_id="00000000-0000-0000-0000-000000000001"))
step("submit: one-letter name", "POST", I, lambda k: ident(k, display_name="A"))
step("submit ok", "POST", I, lambda k: ident(k, consent_data_sharing=True, channel="APP"))
for k in PHONES:
    account[k] = sql(f"SELECT a.id FROM accounts_account a JOIN accounts_user u ON u.id = a.owner_user_id "
                     f"WHERE u.phone = '{PHONES[k]}'")[0][0]
step("me after submit", "GET", "/api/v1/auth/me/")
step("photos while pending", "POST", I + "photos/", lambda k: {"id_front_asset_id": assets[k]["front2"],
                                                                "id_back_asset_id": assets[k]["back2"]})
K = lambda suffix: (lambda k: f"/api/v1/accounts/{account[k]}/kyc/{suffix}")  # noqa: E731
step("request photos: short", "POST", K("request-photos/"), {"note": "x"}, who="staff")
step("request photos: missing", "POST", K("request-photos/"), {}, who="staff")
step("request photos", "POST", K("request-photos/"), {"note": "ID front is blurry"}, who="staff")
step("photos with new face", "POST", I + "photos/", lambda k: {"id_front_asset_id": assets[k]["front"],
                                                                "id_back_asset_id": assets[k]["back"],
                                                                "face_asset_id": assets[k]["face2"]})
step("withdraw", "POST", I + "withdraw/")
step("photos after withdraw", "POST", I + "photos/", lambda k: {"id_front_asset_id": assets[k]["front"],
                                                                 "id_back_asset_id": assets[k]["back"]})
step("resubmit: keep needs number", "POST", I, lambda k: ident(k, id_number=""))
step("resubmit", "POST", I, lambda k: ident(k, id_type="BVN", id_number="22233344455"))
step("reject: missing", "POST", K("reject/"), {}, who="staff")
step("reject", "POST", K("reject/"), {"reason": "Name does not match the card"}, who="staff")
step("request photos when rejected", "POST", K("request-photos/"), {"note": "Retake"}, who="staff")
step("resubmit keeping number", "POST", I, lambda k: ident(k, id_type="BVN", id_number=""))
step("verify: bad via", "POST", K("verify/"), {"via": "FAX"}, who="staff")
step("verify", "POST", K("verify/"), {"via": "PROVIDER", "note": "Checked on NIMC"}, who="staff")
step("verify again", "POST", K("verify/"), {}, who="staff")
step("withdraw verified", "POST", I + "withdraw/")
step("photos when complete", "POST", I + "photos/", lambda k: {"id_front_asset_id": assets[k]["front"],
                                                                "id_back_asset_id": assets[k]["back"]})
step("kyc read", "GET", K(""), who="staff")
step("staff submit", "POST", K("submit/"), lambda k: {
    "display_name": "", "id_type": "PASSPORT", "id_number": "A1234 5678", "face_asset_id": staff_assets[k]["face"],
    "id_front_asset_id": staff_assets[k]["front"], "id_back_asset_id": staff_assets[k]["back"]}, who="staff")
step("staff submit: rider assets refused", "POST", K("submit/"), lambda k: ident(k), who="staff")
step("staff submit: unknown account", "POST", lambda k: "/api/v1/accounts/00000000-0000-0000-0000-000000000000"
     "/kyc/submit/", lambda k: ident(k), who="staff")
step("rider cannot verify", "POST", K("verify/"), {})
step("me at the end", "GET", "/api/v1/auth/me/")

# Cross-read: each backend reads the other's result identically.
for k, other in (("go", "django"), ("django", "go")):
    p = f"/api/v1/accounts/{account[k]}/kyc/"
    check(f"{k} result read by {other}", call(BASES[k], "GET", p, None, admin[k]),
          call(BASES[other], "GET", p, None, admin[other]), extra=ASSET_KEYS)

# Dev NUBAN: Go provisions in the background, so wait for both.
deadline = time.time() + 30
while time.time() < deadline:
    rows = sql(f"SELECT status FROM finance_virtualaccount WHERE account_id IN ('{account['go']}', "
               f"'{account['django']}')")
    if len(rows) == 2 and all(r[0] == "ACTIVE" for r in rows):
        break
    time.sleep(0.5)
va = {k: sql(f"SELECT status, bank_name, left(nuban, 2), provision_attempts, last_error FROM finance_virtualaccount "
             f"WHERE account_id = '{account[k]}'") for k in PHONES}
check("virtual account", (200, va["django"]), (200, va["go"]))
kyc = {k: sql(f"SELECT kyc_status, status, kind FROM accounts_account WHERE id = '{account[k]}'") for k in PHONES}
check("account row", (200, kyc["django"]), (200, kyc["go"]))

# Audit trail and notifications, minus ids / times / labels.
AUDIT = """SELECT action, actor_email = (SELECT COALESCE(email, phone) FROM accounts_user WHERE phone = '{p}'),
  before::text, after::text, metadata::text FROM audit_auditevent WHERE subject_id = '{a}' ORDER BY created_at, id"""
audit = {}
for k in PHONES:
    rows = sql(AUDIT.format(p=PHONES[k], a=account[k]))
    audit[k] = [[c.replace(account[k], "<acct>").replace(PHONES[k], "<phone>") for c in r] for r in rows]
    for name, aid in {**assets[k], **{"s" + n: v for n, v in staff_assets[k].items()}}.items():
        audit[k] = [[c.replace(aid, f"<{name}>") for c in r] for r in audit[k]]
import re  # noqa: E402

VOLATILE = [(re.compile(r"\d{4}-\d\d-\d\dT[\d:.]+\+00:00"), "<ts>"), (re.compile(r"\b99\d{8}\b"), "<nuban>"),
            (re.compile(r"CUS_\w+"), "<cus>"), (re.compile(r"Rider 00\d\d"), "<name>")]


def norm(rows):
    out = []
    for r in rows:
        cells = []
        for c in r:
            for rx, sub in VOLATILE:
                c = rx.sub(sub, c)
            cells.append(c)
        out.append(cells)
    return out


check("audit trail", (200, norm(audit["django"])), (200, norm(audit["go"])))
NOTES = """SELECT title, body, template_code, link_path, source, severity, regexp_replace(dedupe_key, ':[0-9]+$', ':<t>')
  FROM notifications_notification WHERE user_id = (SELECT id FROM accounts_user WHERE phone = '{p}')
  ORDER BY created_at, id"""
notes = {k: [[c.replace(account[k], "<acct>") for c in r] for r in sql(NOTES.format(p=PHONES[k]))] for k in PHONES}
for k in PHONES:  # the label inside the verified message is the kura id
    kura = sql(f"SELECT kura_id FROM accounts_account WHERE id = '{account[k]}'")[0][0]
    notes[k] = [[c.replace(kura, "<kura>") for c in r] for r in notes[k]]
check("rider notifications", (200, notes["django"]), (200, notes["go"]))
print(f"compared {len(audit['go'])} audit rows and {len(notes['go'])} notifications per rider")
assert len(audit["go"]) >= 10 and len(notes["go"]) >= 3, "audit / notification comparison is empty"

purge_phones(PHONES.values())
sql("DELETE FROM core_mediaasset WHERE id IN (%s)" % ", ".join(
    f"'{a}'" for k in PHONES for a in staff_assets[k].values()))
sys.exit(1 if summary() else 0)
