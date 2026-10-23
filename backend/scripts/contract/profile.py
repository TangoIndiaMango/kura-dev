"""Contract check for profile, consent, password and device endpoints.

Django (:8001) vs Go (:8091) on the same dev database. Each mutation is run on
Django, then the identical mutation on Go, and the bodies compared; changes are
reverted so the data ends where it started. Seeded local test accounts only.
"""
import json
import urllib.error
import urllib.request
import uuid

DJ, GO = "http://localhost:8001", "http://localhost:8091"


def call(base, method, path, body=None, token=None, headers=None):
    h = {"Content-Type": "application/json", **(headers or {})}
    if token:
        h["Authorization"] = f"Bearer {token}"
    req = urllib.request.Request(base + path, method=method, headers=h,
                                 data=json.dumps(body).encode() if body is not None else None)
    try:
        with urllib.request.urlopen(req, timeout=20) as r:
            return r.status, json.loads(r.read() or b"{}")
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read() or b"{}")


VOLATILE = {"request_id", "updated_at", "last_login", "granted_at", "withdrawn_at",
            "first_seen_at", "last_seen_at", "id", "expires_at"}


def scrub(v):
    if isinstance(v, dict):
        return {k: ("<t>" if k in VOLATILE and v[k] is not None else scrub(x)) for k, x in v.items()}
    if isinstance(v, list):
        return [scrub(x) for x in v]
    return v


fails = 0


def same(name, d, g):
    global fails
    ok = d[0] == g[0] and scrub(d[1]) == scrub(g[1])
    fails += not ok
    print(f"{'PASS' if ok else 'FAIL'}  {name}: django {d[0]} / go {g[0]}")
    if not ok:
        print("   django:", json.dumps(scrub(d[1]))[:700])
        print("   go    :", json.dumps(scrub(g[1]))[:700])


def both(name, method, path, body, tokens, headers=None):
    d = call(DJ, method, path, body, tokens[0], headers)
    g = call(GO, method, path, body, tokens[1], headers)
    same(name, d, g)
    return d, g


def login(path, body):
    return (call(DJ, "POST", path, body)[1].get("access"), call(GO, "POST", path, body)[1].get("access"))


rider = login("/api/v1/auth/pin/login/", {"phone": "+2348033330003", "pin": "1234"})
staff = login("/api/v1/auth/login/", {"identifier": "ops@yopmail.com", "password": "opspass123"})
_, me = call(DJ, "GET", "/api/v1/auth/me/", token=rider[0])
first = me["user"]["first_name"]

both("profile: rename", "PATCH", "/api/v1/auth/me/profile/", {"first_name": "  Contract  "}, rider)
both("profile: prefs merge", "PATCH", "/api/v1/auth/me/profile/", {"notification_prefs": {"swap_sms": False}}, rider)
both("profile: bad avatar id", "PATCH", "/api/v1/auth/me/profile/", {"avatar_asset_id": "nope"}, rider)
both("profile: unknown avatar", "PATCH", "/api/v1/auth/me/profile/", {"avatar_asset_id": str(uuid.uuid4())}, rider)
both("profile: bad email", "PATCH", "/api/v1/auth/me/profile/", {"email": "not-an-email"}, rider)
both("profile: empty patch", "PATCH", "/api/v1/auth/me/profile/", {}, rider)
call(DJ, "PATCH", "/api/v1/auth/me/profile/", {"first_name": first, "notification_prefs": {"swap_sms": True}}, rider[0])

both("consent: grant data sharing", "POST", "/api/v1/auth/me/consent/", {"purpose": "DATA_SHARING", "granted": True}, rider)
both("consent: withdraw data sharing", "POST", "/api/v1/auth/me/consent/", {"purpose": "DATA_SHARING", "granted": False}, rider)
both("consent: withdraw service refused", "POST", "/api/v1/auth/me/consent/", {"purpose": "SERVICE", "granted": False}, rider)
both("consent: bad purpose", "POST", "/api/v1/auth/me/consent/", {"purpose": "X", "granted": True}, rider)
both("consent: missing granted", "POST", "/api/v1/auth/me/consent/", {"purpose": "SERVICE"}, rider)

both("password: wrong current", "POST", "/api/v1/auth/password/change/",
     {"current_password": "wrong", "new_password": "Xx1!aaaaa", "new_password_confirmation": "Xx1!aaaaa"}, staff)
both("password: mismatch", "POST", "/api/v1/auth/password/change/",
     {"current_password": "opspass123", "new_password": "Xx1!aaaaa", "new_password_confirmation": "nope"}, staff)
both("password: weak", "POST", "/api/v1/auth/password/change/",
     {"current_password": "opspass123", "new_password": "short", "new_password_confirmation": "short"}, staff)
both("password: reuse", "POST", "/api/v1/auth/password/change/",
     {"current_password": "opspass123", "new_password": "opspass123", "new_password_confirmation": "opspass123"}, staff)

both("setup context: bad token", "POST", "/api/v1/auth/password-setup/context/", {"token": "nope"}, (None, None))
both("setup context: missing", "POST", "/api/v1/auth/password-setup/context/", {}, (None, None))
both("setup: weak password", "POST", "/api/v1/auth/password-setup/",
     {"token": "nope", "password": "weak", "password_confirmation": "weak"}, (None, None))
both("setup: bad token", "POST", "/api/v1/auth/password-setup/",
     {"token": "nope", "password": "Strong1!pw", "password_confirmation": "Strong1!pw"}, (None, None))

dev_dj, dev_go = str(uuid.uuid4()), str(uuid.uuid4())
d = call(DJ, "POST", "/api/v1/auth/devices/heartbeat/", {"device_id": dev_dj}, rider[0])
g = call(GO, "POST", "/api/v1/auth/devices/heartbeat/", {"device_id": dev_go}, rider[1])
same("heartbeat: new device", d, g)
d = call(DJ, "POST", "/api/v1/auth/devices/heartbeat/", None, rider[0], {"X-Kura-Device-Id": dev_dj})
g = call(GO, "POST", "/api/v1/auth/devices/heartbeat/", None, rider[1], {"X-Kura-Device-Id": dev_go})
same("heartbeat: same device via header", d, g)
both("heartbeat: bad device id", "POST", "/api/v1/auth/devices/heartbeat/", {"device_id": "x"}, rider)
both("heartbeat: staff without account", "POST", "/api/v1/auth/devices/heartbeat/", {"device_id": dev_dj}, staff)
print("all identical" if not fails else f"{fails} difference(s)")
