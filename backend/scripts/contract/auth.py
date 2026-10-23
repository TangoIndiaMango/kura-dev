"""Side-by-side contract check: Django (:8001) vs Go (:8091) for auth endpoints.

Run both servers on the same dev database, then: python3 scripts/contract/auth.py
Compares status codes and response key shapes (tokens, ids, timestamps differ
by design) plus selected exact values. Uses seeded local test accounts only.
"""
import json
import urllib.error
import urllib.request

DJ, GO = "http://localhost:8001", "http://localhost:8091"


def call(base, method, path, body=None, token=None):
    req = urllib.request.Request(base + path, method=method,
                                 data=json.dumps(body).encode() if body is not None else None,
                                 headers={"Content-Type": "application/json",
                                          **({"Authorization": f"Bearer {token}"} if token else {})})
    try:
        with urllib.request.urlopen(req, timeout=20) as r:
            return r.status, json.loads(r.read() or b"{}")
    except urllib.error.HTTPError as e:
        raw = e.read()
        try:
            return e.code, json.loads(raw or b"{}")
        except ValueError:
            return e.code, {"_raw": raw[:80].decode(errors="replace")}


def shape(v):
    if isinstance(v, dict):
        return {k: shape(x) for k, x in sorted(v.items()) if k != "request_id"}
    if isinstance(v, list):
        return [shape(v[0])] if v else []
    return type(v).__name__


def compare(name, method, path, body=None, dj_tok=None, go_tok=None, values=()):
    ds, db = call(DJ, method, path, body, dj_tok)
    gs, gb = call(GO, method, path, body, go_tok)
    ok = ds == gs and shape(db) == shape(gb)
    for key in values:  # fields whose values must match exactly
        dv, gv = db, gb
        for part in key.split("."):
            dv = dv.get(part) if isinstance(dv, dict) else None
            gv = gv.get(part) if isinstance(gv, dict) else None
        if dv != gv:
            ok = False
            print(f"   value {key}: django={dv!r} go={gv!r}")
    print(f"{'PASS' if ok else 'FAIL'}  {name}: django {ds} / go {gs}")
    if not ok and shape(db) != shape(gb):
        print("   django:", json.dumps(shape(db))[:600])
        print("   go    :", json.dumps(shape(gb))[:600])
    return db, gb


STAFF = {"identifier": "ops@yopmail.com", "password": "opspass123"}
RIDER_PHONE = "+2348022220001"

d, g = compare("staff login", "POST", "/api/v1/auth/login/", STAFF,
               values=("user.id", "user.email", "user.role", "user.name", "user.hub_ids"))
dj_access, go_access = d.get("access"), g.get("access")
dj_refresh, go_refresh = d.get("refresh"), g.get("refresh")

compare("staff login wrong password", "POST", "/api/v1/auth/login/",
        {"identifier": "ops@yopmail.com", "password": "nope"}, values=("error.code", "error.message"))
compare("staff login missing fields", "POST", "/api/v1/auth/login/", {},
        values=("error.code", "error.details"))
compare("login begin (PIN user)", "POST", "/api/v1/auth/login/begin/", {"phone": "08022220001"},
        values=("next", "phone", "has_pin", "display_name"))
compare("login begin bad phone", "POST", "/api/v1/auth/login/begin/", {"phone": "123"},
        values=("error.code", "error.message"))
compare("login begin bad channel", "POST", "/api/v1/auth/login/begin/",
        {"phone": RIDER_PHONE, "channel": "FAX"}, values=("error.code", "error.details"))
d, g = compare("pin login", "POST", "/api/v1/auth/pin/login/", {"phone": RIDER_PHONE, "pin": "1234"},
               values=("user.id", "has_pin", "display_name", "onboarding_step", "channel"))
rider_dj, rider_go = d.get("access"), g.get("access")
compare("pin login short pin", "POST", "/api/v1/auth/pin/login/", {"phone": RIDER_PHONE, "pin": "12"},
        values=("error.code", "error.details"))
compare("pin verify", "POST", "/api/v1/auth/pin/verify/", {"pin": "1234"}, rider_dj, rider_go,
        values=("status",))
compare("pin verify anon", "POST", "/api/v1/auth/pin/verify/", {"pin": "1234"},
        values=("error.code",))
# Each backend refreshes its own token, then the other backend must reject it
# (one shared blacklist).
ds, db_ = call(DJ, "POST", "/api/v1/auth/token/refresh/", {"refresh": dj_refresh})
gs, gb_ = call(GO, "POST", "/api/v1/auth/token/refresh/", {"refresh": go_refresh})
print(f"{'PASS' if ds == gs == 200 and shape(db_) == shape(gb_) else 'FAIL'}  refresh own token: django {ds} / go {gs}")
xs, xb = call(GO, "POST", "/api/v1/auth/token/refresh/", {"refresh": dj_refresh})
ys, yb = call(DJ, "POST", "/api/v1/auth/token/refresh/", {"refresh": go_refresh})
same = xb.get("error", {}).get("details") == yb.get("error", {}).get("details") == {"detail": "Token is blacklisted", "code": "token_not_valid"}
print(f"{'PASS' if xs == ys == 401 and same else 'FAIL'}  shared blacklist: go rejects django-rotated {xs}, django rejects go-rotated {ys}")
go_refresh = gb_.get("refresh")
compare("refresh garbage", "POST", "/api/v1/auth/token/refresh/", {"refresh": "x.y.z"},
        values=("error.message", "error.details"))
compare("bad bearer", "GET", "/api/v1/auth/pin/verify/", None, "x.y.z", "x.y.z",
        values=("error.message", "error.details"))
compare("logout", "POST", "/api/v1/auth/logout/", {"refresh": go_refresh}, dj_access, go_access,
        values=("status",))
# Unknown routes: Django returns an HTML debug page; Go returns the JSON 404 (intentional).
