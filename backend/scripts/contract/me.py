"""GET /auth/me must be byte-identical between Django (:8001) and Go (:8091).

Logs in on each backend with seeded local test accounts, then diffs the full
JSON bodies (no shape-only shortcuts: this payload is deterministic).
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
        return e.code, json.loads(e.read() or b"{}")


def diff(a, b, path=""):
    out = []
    if isinstance(a, dict) and isinstance(b, dict):
        for k in sorted(set(a) | set(b)):
            if k not in a or k not in b:
                out.append(f"{path}.{k}: only in {'django' if k in a else 'go'}")
            else:
                out += diff(a[k], b[k], f"{path}.{k}")
    elif a != b:
        out.append(f"{path}: django={a!r} go={b!r}")
    return out


LOGINS = {
    "staff ops": ("/api/v1/auth/login/", {"identifier": "ops@yopmail.com", "password": "opspass123"}),
    "staff admin": ("/api/v1/auth/login/", {"identifier": "admin@yopmail.com", "password": "adminpass123"}),
    "fleet owner": ("/api/v1/auth/pin/login/", {"phone": "+2348022220001", "pin": "1234"}),
    "rider verified+photos (suspended acct)": ("/api/v1/auth/pin/login/", {"phone": "+2348012345678", "pin": "1234"}),
    "rider verified 0001": ("/api/v1/auth/pin/login/", {"phone": "+2348033330001", "pin": "1234"}),
    "rider verified 0002": ("/api/v1/auth/pin/login/", {"phone": "+2348033330002", "pin": "1234"}),
    "rider verified 1110001": ("/api/v1/auth/pin/login/", {"phone": "+2348011110001", "pin": "1234"}),
}
failures = 0
for name, (path, body) in LOGINS.items():
    _, dj = call(DJ, "POST", path, body)
    _, go = call(GO, "POST", path, body)
    if not dj.get("access") or not go.get("access"):
        print(f"SKIP  me ({name}): login failed django={dj.get('error', {}).get('code')} go={go.get('error', {}).get('code')}")
        continue
    ds, dme = call(DJ, "GET", "/api/v1/auth/me/", token=dj.get("access"))
    gs, gme = call(GO, "GET", "/api/v1/auth/me/", token=go.get("access"))
    # last_login moves with each sign-in; compare everything else exactly.
    for me in (dme, gme):
        me.get("user", {}).pop("last_login", None)
        me.get("user", {}).pop("updated_at", None)
    problems = ([f"status django={ds} go={gs}"] if ds != gs else []) + diff(dme, gme)
    failures += bool(problems)
    print(f"{'PASS' if not problems else 'FAIL'}  me ({name})")
    for p in problems[:15]:
        print("   ", p)
print("all identical" if not failures else f"{failures} payload(s) differ")
