"""Reports: queue + synchronous render of impact PDF / ops / fleet / revenue
CSVs (params, idempotency), status (EXPIRED past TTL), download (attachment
headers, byte-identical CSVs, NOT_READY / EXPIRED / missing file)."""
import sys
import uuid

from lib import DJ, GO, call, check, fresh, sql, staff_tokens, summary

admin = staff_tokens("admin@yopmail.com", "adminpass123")
rider = tuple(call(b, "POST", "/api/v1/auth/pin/login/", {"phone": "+2348033330001", "pin": "1234"})[1]["access"]
              for b in (DJ, GO))
BASE = {"django": DJ, "go": GO}
TOK = {"django": admin[0], "go": admin[1]}
R = "/api/v1/reports/"
RUN = uuid.uuid4().hex[:8]
VOL = ("id", "created_at", "expires_at", "file_public_id", "download_path")
HUB = sql("SELECT id FROM mobility_hub ORDER BY code LIMIT 1")[0][0]
jobs = {k: [] for k in BASE}


def step(name, method, path, body=None, tok=TOK, extra=(), keep=False):
    out = {k: call(BASE[k], method, path(k) if callable(path) else path, body, tok[k] if tok else None) for k in BASE}
    check(name, out["django"], out["go"], extra=VOL + tuple(extra))
    if keep:
        for k in BASE:
            jobs[k].append(out[k][1].get("id"))
    return out


def download(name, path, body=True):
    out = {}
    for k in BASE:
        status, data, headers = call(BASE[k], "GET", path(k), None, TOK[k], raw=True)
        h = {x: headers.get(x) for x in ("Content-Type", "Content-Disposition", "Content-Length")}
        if not body:
            h.pop("Content-Length")  # PDF bytes differ by generator
        if status != 200:
            import json
            out[k] = (status, json.loads(data or b"{}"))
            continue
        out[k] = (status, {"headers": h, "body": data.decode() if body else data[:5].decode()})
    check(name, out["django"], out["go"], extra=("request_id",))


fresh()
step("create: empty", "POST", R, {})
step("create: bad", "POST", R, {"kind": "PNG", "params": [1], "idempotency_key": "x" * 65})
step("create: null kind", "POST", R, {"kind": None})
step("create: OTHER (501)", "POST", R, {"kind": "OTHER"})
step("create as rider (403)", "POST", R, {"kind": "OPS_CSV"}, tok={"django": rider[0], "go": rider[1]})
cases = [("ops default", {"kind": "OPS_CSV"}),
         ("ops period", {"kind": "OPS_CSV", "params": {"period": "2026-10"}}),
         ("ops range + hub", {"kind": "OPS_CSV", "params": {"date_from": "2026-09-01", "date_to": "2026-10-31",
                                                             "hub_id": HUB}}),
         ("ops date_to only", {"kind": "OPS_CSV", "params": {"date_to": "2026-10-15T10:00"}}),
         ("fleet", {"kind": "FLEET_CSV"}),
         ("fleet available at hub", {"kind": "FLEET_CSV", "params": {"status": "available", "hub": HUB}}),
         ("revenue", {"kind": "REVENUE_CSV", "params": {"period": "2026-10"}}),
         ("revenue bad period", {"kind": "REVENUE_CSV", "params": {"period": "oct"}}),
         ("impact pdf", {"kind": "IMPACT_PDF", "params": {"period": "2026-09"}}),
         ("impact pdf latest", {"kind": "IMPACT_PDF"})]
for name, body in cases:
    pdf = body["kind"] == "IMPACT_PDF"
    step(f"create {name}", "POST", R, body, keep=True, extra=("bytes",) if pdf else ())
    download(f"download {name}", lambda k: f"{R}{jobs[k][-1]}/download/", body=not pdf)
step("create with key", "POST", R, {"kind": "FLEET_CSV", "idempotency_key": f"ct-{RUN}"}, keep=True)
again = step("create with key again", "POST", R, {"kind": "FLEET_CSV", "idempotency_key": f"ct-{RUN}"})
check("idempotent id", (200, [again[k][1]["id"] == jobs[k][-1] for k in BASE]), (200, [True, True]))
step("detail", "GET", lambda k: f"{R}{jobs[k][0]}/")
step("detail unknown", "GET", f"{R}{uuid.uuid4()}/")
step("download unknown", "GET", f"{R}{uuid.uuid4()}/download/")

for k in BASE:  # past TTL, file gone, still queued
    sql(f"UPDATE analytics_reportjob SET expires_at = now() - interval '1 hour' WHERE id = '{jobs[k][0]}'")
    sql(f"UPDATE analytics_reportjob SET file_public_id = 'reports/csv/missing-{RUN}.csv' WHERE id = '{jobs[k][1]}'")
    sql(f"UPDATE analytics_reportjob SET status = 'QUEUED' WHERE id = '{jobs[k][2]}'")
step("detail expired", "GET", lambda k: f"{R}{jobs[k][0]}/")
step("download expired (410)", "GET", lambda k: f"{R}{jobs[k][0]}/download/")
step("download missing file", "GET", lambda k: f"{R}{jobs[k][1]}/download/")
step("download queued (409)", "GET", lambda k: f"{R}{jobs[k][2]}/download/")

norm = lambda rows: [tuple(r) for r in rows]  # noqa: E731
rows = {k: norm(sql("SELECT a.action, a.subject_label, a.after - 'file_public_id', a.actor_email FROM audit_auditevent a "
                    f"WHERE a.subject_id IN ('{chr(39).join([j + chr(39) + ',' for j in jobs[k]])[:-2]}') "
                    "ORDER BY a.created_at")) for k in BASE}
check("db: audit", (200, rows["django"]), (200, rows["go"]))
for k in BASE:
    sql("DELETE FROM analytics_reportjob WHERE id IN ('" + "','".join(jobs[k]) + "')")
sys.exit(1 if summary() else 0)
