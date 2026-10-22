"""Accounts writes: create / rename / register / suspend / reinstate / notify /
set-cooperative. One fresh rider and one registered operator per backend; the
same steps run on each and responses, audit trail and notifications compare."""
import re
import sys

from lib import DJ, GO, call, check, new_rider, purge_phones, sql, staff_tokens, summary

RIDERS = {"go": "+2348039990041", "django": "+2348039990042"}
OPS = {"go": ("+2348039990043", "contract.op.go@example.test"), "django": ("+2348039990044",
                                                                         "contract.op.dj@example.test")}
BASES = {"go": GO, "django": DJ}
SCRUB = ("id", "public_id", "kura_id", "owner_user", "owner_user_id", "driver_ids", "wallet_id", "vehicle_ids", "phone",
         "email", "created_at", "photo_url")
ALL = list(RIDERS.values()) + [p for p, _ in OPS.values()]

purge_phones(ALL)
admin = dict(zip(("django", "go"), staff_tokens("admin@yopmail.com", "adminpass123")))
rider = {k: new_rider(BASES[k], RIDERS[k]) for k in RIDERS}
coop = sql("SELECT id FROM accounts_cooperative ORDER BY name LIMIT 1")[0][0]
account = {}


def step(name, method, path, body=None, who="rider"):
    out = {}
    for k in ("django", "go"):
        tok = {"rider": rider, "staff": admin}[who][k]
        out[k] = call(BASES[k], method, path(k) if callable(path) else path,
                      body(k) if callable(body) else body, tok)
    check(name, out["django"], out["go"], extra=SCRUB)
    return out


A = "/api/v1/accounts/"
step("create: empty", "POST", A, {})
step("create: blank name", "POST", A, {"display_name": "  "})
step("create: too long", "POST", A, {"display_name": "x" * 201, "first_name": "y" * 151})
step("create", "POST", A, {"display_name": "Contract  Rider Writes", "id_number": "1234-5678-901"})
for k in RIDERS:
    account[k] = sql(f"SELECT a.id FROM accounts_account a JOIN accounts_user u ON u.id = a.owner_user_id "
                     f"WHERE u.phone = '{RIDERS[k]}'")[0][0]
step("create again renames", "POST", A, {"display_name": "Contract Renamed", "first_name": "Ada"})
D = lambda suffix="": (lambda k: f"{A}{account[k]}/{suffix}")  # noqa: E731
step("patch: missing name", "PATCH", D(), {})
# Known Django bug: a non-string display_name crashes (.strip() on int) → 500.
# Go answers the same 400 as a missing name.
_d = call(DJ, "PATCH", D()("django"), {"display_name": 42}, rider["django"])
_g = call(GO, "PATCH", D()("go"), {"display_name": 42}, rider["go"])
check("patch: number name (django 500 bug, go 400)", (400, None), (_g[0], None))
assert _d[0] == 500, _d
step("patch by owner", "PATCH", D(), {"display_name": "  Owner Rename  ", "last_name": None})
step("patch by staff refused", "PATCH", D(), {"display_name": "Staff Rename"}, who="staff")
step("me after rename", "GET", "/api/v1/auth/me/")

step("suspend: missing reason", "POST", D("suspend/"), {}, who="staff")
step("suspend: short reason", "POST", D("suspend/"), {"reason": "no"}, who="staff")
step("suspend: bad body, unknown account", "POST", "/api/v1/accounts/00000000-0000-0000-0000-000000000000/suspend/",
     {}, who="staff")
step("suspend", "POST", D("suspend/"), {"reason": "Unpaid swaps over 30 days"}, who="staff")
step("suspend again", "POST", D("suspend/"), {"reason": "Still unpaid"}, who="staff")
step("reinstate", "POST", D("reinstate/"), None, who="staff")
step("rider cannot suspend", "POST", D("suspend/"), {"reason": "self"})
step("notify: short", "POST", D("notify/"), {"message": " a "}, who="staff")
step("notify: too long", "POST", D("notify/"), {"message": "x" * 281}, who="staff")
step("notify", "POST", D("notify/"), {"message": "Please bring your ID card to Yaba hub."}, who="staff")
step("set coop: missing", "POST", D("set-cooperative/"), {}, who="staff")
step("set coop: bad uuid", "POST", D("set-cooperative/"), {"cooperative_id": "nope"}, who="staff")
step("set coop: unknown", "POST", D("set-cooperative/"), {"cooperative_id": "00000000-0000-0000-0000-000000000009"},
     who="staff")
step("set coop", "POST", D("set-cooperative/"), {"cooperative_id": coop}, who="staff")
step("clear coop", "POST", D("set-cooperative/"), {"cooperative_id": None}, who="staff")
step("detail after writes", "GET", D(), who="staff")

R = A + "register/"
step("register: empty", "POST", R, {}, who="staff")
step("register: bad email + phone", "POST", R, {"full_name": "X Y", "phone": "123", "email": "nope"}, who="staff")
step("register: email taken", "POST", R, {"full_name": "X Y", "phone": "08031112222", "email": "ADMIN@yopmail.com"},
     who="staff")
step("register: bad phone", "POST", R, lambda k: {"full_name": "X Y", "phone": "0803", "email": OPS[k][1]},
     who="staff")
step("register: phone taken", "POST", R, lambda k: {"full_name": "X Y", "phone": RIDERS[k], "email": OPS[k][1]},
     who="staff")
step("register: unknown coop", "POST", R, lambda k: {"full_name": "X Y", "phone": OPS[k][0], "email": OPS[k][1],
                                                     "cooperative_id": "00000000-0000-0000-0000-000000000009"},
     who="staff")
step("register", "POST", R, lambda k: {"full_name": " Bola  Ade Tunde ", "phone": OPS[k][0].replace("+234", "0"),
                                       "email": OPS[k][1].upper(), "id_type": "nin", "id_number": "123 456 789 01",
                                       "cooperative_id": coop}, who="staff")
step("rider cannot register", "POST", R, {"full_name": "A B", "phone": "08031234500", "email": "z@example.test"})

# Audit and notifications for the rider accounts and the registered operators.
VOL = [(re.compile(r"KR-[A-Z0-9]{6}"), "<kura>"), (re.compile(r"Rider 00\d\d"), "<name>"),
       (re.compile(r"\b99\d{8}\b"), "<nuban>"), (re.compile(r"CUS_\w+"), "<cus>"), (re.compile(r"\+23480399900\d\d"), "<phone>"),
       (re.compile(r"contract\.op\.(go|dj)@example\.test"), "<email>"), (re.compile(r"[0-9a-f-]{36}"), "<uuid>"),
       (re.compile(r":\d{10}$"), ":<t>")]


def norm(rows):
    out = []
    for r in rows:
        cells = []
        for c in r:
            for rx, sub in VOL:
                c = rx.sub(sub, c)
            cells.append(c)
        out.append(cells)
    return out


for k in RIDERS:
    account[k + "_op"] = sql(f"SELECT a.id FROM accounts_account a JOIN accounts_user u ON u.id = a.owner_user_id "
                             f"WHERE u.phone = '{OPS[k][0]}'")[0][0]
audit = {k: norm(sql(f"SELECT action, before::text, after::text, metadata::text FROM audit_auditevent WHERE "
                     f"subject_id IN ('{account[k]}', '{account[k + '_op']}') ORDER BY created_at, id"))
         for k in RIDERS}
check("audit trail", (200, audit["django"]), (200, audit["go"]))
notes = {k: norm(sql(f"SELECT title, body, template_code, link_path, source, dedupe_key FROM "
                     f"notifications_notification WHERE link_path LIKE '%{account[k]}%' OR link_path LIKE "
                     f"'%{account[k + '_op']}%' OR user_id = (SELECT id FROM accounts_user WHERE phone = "
                     f"'{RIDERS[k]}') ORDER BY created_at, id")) for k in RIDERS}
check("notifications", (200, notes["django"]), (200, notes["go"]))
users = {k: norm(sql(f"SELECT email, first_name, last_name, role, onboarding_step, left(password, 1), "
                     f"length(password), left(public_id, 3), is_staff FROM accounts_user WHERE phone = '{OPS[k][0]}'"))
         for k in RIDERS}
check("registered user row", (200, users["django"]), (200, users["go"]))
tokens = {k: sql(f"SELECT purpose, consumed_at IS NULL, expires_at > now() + interval '71 hours' FROM "
                 f"accounts_passwordsetuptoken WHERE user_id = (SELECT id FROM accounts_user WHERE phone = "
                 f"'{OPS[k][0]}')") for k in RIDERS}
check("setup token", (200, tokens["django"]), (200, tokens["go"]))
print(f"compared {len(audit['go'])} audit rows and {len(notes['go'])} notifications per backend")

purge_phones(ALL)
sys.exit(1 if summary() else 0)
