"""Shared helpers for Django (:8001) vs Go (:8091) contract checks."""
import json
import urllib.error
import urllib.request

DJ, GO = "http://localhost:8001", "http://localhost:8091"
VOLATILE = {"request_id", "updated_at", "last_login", "granted_at", "withdrawn_at",
            "first_seen_at", "last_seen_at", "expires_at", "access", "refresh"}

_fails = 0


def reset_throttles():
    """Clear Django's dev throttle counters (local Redis) so repeated runs
    aren't rate-limited. Go's in-memory counters reset on restart."""
    import subprocess
    keys = subprocess.run(["redis-cli", "-n", "0", "--scan", "--pattern", "*throttle*"],
                          capture_output=True, text=True).stdout.split()
    if keys:
        subprocess.run(["redis-cli", "-n", "0", "del", *keys], capture_output=True)


reset_throttles()


def fresh():
    """Reset both backends' throttles mid-suite (Django: Redis keys; Go:
    restart, its counters live in memory)."""
    import os
    import subprocess
    reset_throttles()
    subprocess.run([os.path.join(os.path.dirname(__file__), "..", "restart_go.sh"), "8091",
                    "/tmp/kura-go-8091.log"], check=True)


def call(base, method, path, body=None, token=None, headers=None, raw=False):
    h = {"Content-Type": "application/json", **(headers or {})}
    if token:
        h["Authorization"] = f"Bearer {token}"
    req = urllib.request.Request(base + path, method=method, headers=h,
                                 data=json.dumps(body).encode() if body is not None else None)
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            data = r.read()
            if raw:
                return r.status, data, dict(r.headers)
            return r.status, json.loads(data or b"{}")
    except urllib.error.HTTPError as e:
        data = e.read()
        if raw:
            return e.code, data, dict(e.headers)
        try:
            return e.code, json.loads(data or b"{}")
        except ValueError:
            return e.code, {"_raw": data[:120].decode(errors="replace")}


def scrub(v, extra=()):
    keys = VOLATILE | set(extra)
    if isinstance(v, dict):
        return {k: ("<t>" if k in keys and v[k] is not None else scrub(x, extra)) for k, x in v.items()}
    if isinstance(v, list):
        return [scrub(x, extra) for x in v]
    return v


def _hosts(v):
    """Pagination links carry each server's own host; compare paths only."""
    if isinstance(v, str):
        return v.replace(GO, "<host>").replace(DJ, "<host>")
    if isinstance(v, dict):
        return {k: _hosts(x) for k, x in v.items()}
    if isinstance(v, list):
        return [_hosts(x) for x in v]
    return v


def diff(a, b, path=""):
    out = []
    if isinstance(a, dict) and isinstance(b, dict):
        for k in sorted(set(a) | set(b)):
            if k not in a or k not in b:
                out.append(f"{path}.{k}: only in {'django' if k in a else 'go'}")
            else:
                out += diff(a[k], b[k], f"{path}.{k}")
    elif isinstance(a, list) and isinstance(b, list) and len(a) == len(b):
        for i, (x, y) in enumerate(zip(a, b)):
            out += diff(x, y, f"{path}[{i}]")
    elif a != b:
        out.append(f"{path}: django={json.dumps(a)[:120]} go={json.dumps(b)[:120]}")
    return out


def check(name, d, g, extra=()):
    """Compare (status, body) pairs; prints PASS/FAIL with a field diff."""
    global _fails
    problems = ([f"status django={d[0]} go={g[0]}"] if d[0] != g[0] else []) + \
        diff(_hosts(scrub(d[1], extra)), _hosts(scrub(g[1], extra)))
    _fails += bool(problems)
    print(f"{'PASS' if not problems else 'FAIL'}  {name}: django {d[0]} / go {g[0]}")
    for p in problems[:12]:
        print("   ", p)


def both(name, method, path, body=None, tokens=(None, None), extra=()):
    d = call(DJ, method, path, body, tokens[0])
    g = call(GO, method, path, body, tokens[1])
    check(name, d, g, extra)
    return d, g


def staff_tokens(identifier="ops@yopmail.com", password="opspass123"):
    body = {"identifier": identifier, "password": password}
    return (call(DJ, "POST", "/api/v1/auth/login/", body)[1].get("access"),
            call(GO, "POST", "/api/v1/auth/login/", body)[1].get("access"))


def summary():
    print("all identical" if not _fails else f"{_fails} difference(s)")
    return _fails


PG = "postgres://kura:kura_dev_password@127.0.0.1:5432/kura"


def sql(query):
    """Run SQL on the shared dev database; returns stdout rows (tab-separated)."""
    import subprocess
    out = subprocess.run(["psql", PG, "-qAtF", "\t", "-c", query], check=True, capture_output=True, text=True)
    return [line.split("\t") for line in out.stdout.splitlines() if line]


def new_rider(base, phone, pin="1234"):
    """Sign a brand-new rider up through `base` (OTP dev code + PIN); returns
    an access token that works on both backends."""
    call(base, "POST", "/api/v1/auth/otp/request/", {"phone": phone})
    st, body = call(base, "POST", "/api/v1/auth/otp/verify/", {"phone": phone, "code": "123456"})
    assert st == 200, (st, body)
    st, body = call(base, "POST", "/api/v1/auth/pin/set/", {"pin": pin, "pin_confirm": pin}, body["access"])
    assert st == 200, (st, body)
    return body.get("access") or call(base, "POST", "/api/v1/auth/pin/login/", {"phone": phone, "pin": pin})[1]["access"]


def media_asset(owner_phone=None, kind="KYC", owner_email=None):
    """Insert a Cloudinary-style asset uploaded by that user; returns its id."""
    import uuid
    aid = str(uuid.uuid4())
    who = f"phone = '{owner_phone}'" if owner_phone else f"email = '{owner_email}'"
    sql(f"""INSERT INTO core_mediaasset (id, created_at, updated_at, provider, storage_key, kind, content_type,
        resource_type, byte_size, original_filename, visibility, uploaded_by_id)
        SELECT '{aid}', now(), now(), 'cloudinary', 'kura/test/{aid}', '{kind}', 'image/jpeg', 'image', 1000,
        'x.jpg', 'private', id FROM accounts_user WHERE {who}""")
    return aid


def purge_phones(phones):
    """Remove test riders and everything hanging off them. Audit rows stay
    (the hash chain covers actor_email, not actor_id), with actor_id nulled."""
    ph = ", ".join(f"'{p}'" for p in phones)
    sql(f"""
      CREATE TEMP TABLE pu AS SELECT id FROM accounts_user WHERE phone IN ({ph});
      CREATE TEMP TABLE pa AS SELECT id FROM accounts_account WHERE owner_user_id IN (SELECT id FROM pu);
      UPDATE audit_auditevent SET actor_id = NULL WHERE actor_id IN (SELECT id FROM pu);
      DELETE FROM notifications_notification WHERE user_id IN (SELECT id FROM pu)
        OR EXISTS (SELECT 1 FROM pa WHERE notifications_notification.link_path LIKE '%' || pa.id || '%');
      DELETE FROM accounts_passwordsetuptoken WHERE user_id IN (SELECT id FROM pu);
      DELETE FROM token_blacklist_blacklistedtoken WHERE token_id IN
        (SELECT id FROM token_blacklist_outstandingtoken WHERE user_id IN (SELECT id FROM pu));
      DELETE FROM token_blacklist_outstandingtoken WHERE user_id IN (SELECT id FROM pu);
      DELETE FROM accounts_trusteddevice WHERE account_id IN (SELECT id FROM pa);
      DELETE FROM risk_riskevent WHERE account_id IN (SELECT id FROM pa);
      DELETE FROM risk_riskvelocitygrant WHERE account_id IN (SELECT id FROM pa);
      DELETE FROM accounts_consent WHERE account_id IN (SELECT id FROM pa);
      DELETE FROM accounts_identitydocument WHERE account_id IN (SELECT id FROM pa);
      DELETE FROM accounts_driver WHERE user_id IN (SELECT id FROM pu) OR account_id IN (SELECT id FROM pa);
      DELETE FROM mobility_discountredemption WHERE account_id IN (SELECT id FROM pa);
      DELETE FROM mobility_subscription WHERE account_id IN (SELECT id FROM pa);
      DELETE FROM finance_payment WHERE account_id IN (SELECT id FROM pa);
      DELETE FROM mobility_vehicleassignment WHERE vehicle_id IN (SELECT id FROM mobility_vehicle WHERE account_id IN (SELECT id FROM pa));
      DELETE FROM mobility_vehiclecommand WHERE vehicle_id IN (SELECT id FROM mobility_vehicle WHERE account_id IN (SELECT id FROM pa));
      DELETE FROM notifications_notification WHERE EXISTS (SELECT 1 FROM mobility_vehicle v WHERE v.account_id IN (SELECT id FROM pa) AND notifications_notification.link_path LIKE '%' || v.id || '%');
      DELETE FROM mobility_vehicle WHERE account_id IN (SELECT id FROM pa);
      DELETE FROM finance_virtualaccount WHERE account_id IN (SELECT id FROM pa);
      DELETE FROM finance_wallet WHERE account_id IN (SELECT id FROM pa);
      DELETE FROM accounts_account WHERE id IN (SELECT id FROM pa);
      DELETE FROM core_mediaasset WHERE uploaded_by_id IN (SELECT id FROM pu);
      DELETE FROM accounts_otpchallenge WHERE phone IN ({ph});
      DELETE FROM accounts_user WHERE id IN (SELECT id FROM pu);""")
