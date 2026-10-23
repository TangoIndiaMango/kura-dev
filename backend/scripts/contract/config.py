"""Platform config: namespace snapshots, propose (merged draft), versions,
maker-checker approve. Restores the original rows afterwards."""
import sys
import uuid

from lib import DJ, GO, both, call, check, fresh, sql, staff_tokens, summary

ops = staff_tokens()
admin = staff_tokens("admin@yopmail.com", "adminpass123")
agent = staff_tokens("agent.yaba@yopmail.com", "agentpass123")
rb = {"phone": "+2348033330001", "pin": "1234"}
rider = (call(DJ, "POST", "/api/v1/auth/pin/login/", rb)[1]["access"],
         call(GO, "POST", "/api/v1/auth/pin/login/", rb)[1]["access"])
C = "/api/v1/config/"
BASE = {"django": DJ, "go": GO}
IX = {"django": 0, "go": 1}
orig = sql("SELECT id, status FROM core_configversion")
fresh()

for label, tok in [("admin", admin), ("ops", ops), ("rider", rider), ("agent", agent)]:
    for ns in ("credit", "offers", "ussd", "sms_templates", "nope"):
        both(f"{ns} as {label}", "GET", f"{C}{ns}/", tokens=tok)
    both(f"versions as {label}", "GET", C + "versions/", tokens=tok)
for q in ["?status=ACTIVE", "?status=NOPE", "?namespace=credit", "?key=settings&page_size=1&page=2"]:
    both(f"versions {q}", "GET", C + "versions/" + q, tokens=admin)
for (vid,) in sql("SELECT id FROM core_configversion ORDER BY created_at LIMIT 5"):
    both(f"version {vid[-6:]}", "GET", f"{C}versions/{vid}/", tokens=admin)
both("version unknown", "GET", f"{C}versions/{uuid.uuid4()}/", tokens=admin)

for name, body in [("empty", {}), ("empty value", {"value": {}}), ("list value", {"value": [1]}),
                   ("null value", {"value": None}), ("long note", {"value": {"x": 1}, "note": "n" * 256}),
                   ("enabled not bool", {"value": {"enabled": "yes"}})]:
    both(f"propose: {name}", "POST", C + "ussd/", body, admin)
both("propose: unknown ns", "POST", C + "nope/", {"value": {"a": 1}}, admin)
both("propose: rider forbidden", "POST", C + "ussd/", {"value": {"a": 1}}, rider)
SCRUB = ("id", "created_at", "updated_at", "effective_from", "active_version_id")
out = {}


def restore():
    sql("UPDATE core_configversion SET status = 'REJECTED' WHERE note LIKE 'CT %'")
    for vid, status in orig:
        sql(f"UPDATE core_configversion SET status = '{status}' WHERE id = '{vid}'")


for k in BASE:
    restore()
    tok = admin[IX[k]]
    p = call(BASE[k], "POST", C + "ussd/", {"value": {"shortcode": "*1#", "extra": [1, 2]}, "note": f" CT {k} "}, tok)
    snap = call(BASE[k], "GET", C + "ussd/", token=tok)
    stale = call(BASE[k], "POST", C + "ussd/", {"value": {"enabled": False}, "note": f"CT second {k}"}, tok)
    first_after = call(BASE[k], "GET", f"{C}versions/{p[1]['id']}/", token=tok)
    appr = call(BASE[k], "POST", f"{C}versions/{stale[1]['id']}/approve/", token=tok)
    again = call(BASE[k], "POST", f"{C}versions/{stale[1]['id']}/approve/", token=tok)
    rejected = call(BASE[k], "POST", f"{C}versions/{p[1]['id']}/approve/", token=tok)
    after = call(BASE[k], "GET", C + "ussd/", token=tok)
    out[k] = [p, snap, stale, first_after, appr, again, rejected, after]
for name, i in [("propose", 0), ("snapshot with pending", 1), ("second proposal", 2), ("first now rejected", 3),
                ("approve (super admin bypass)", 4), ("approve again", 5), ("approve rejected", 6),
                ("snapshot after approve", 7)]:
    d, g = out["django"][i], out["go"][i]
    for body in (d[1], g[1]):
        if isinstance(body, dict) and isinstance(body.get("pending"), dict):
            body["pending"]["id"] = body["pending"]["created_at"] = "x"
            body["pending"]["note"] = body["pending"]["note"].replace("django", "go")
        if isinstance(body, dict) and "note" in body:
            body["note"] = body["note"].replace("django", "go")
    check(name, d, g, extra=SCRUB)
rows = {k: sql(f"SELECT action, after - 'effective_from' - 'approved_by_id' - 'created_by_id', metadata FROM "
               f"audit_auditevent WHERE subject_type = 'config_version' AND subject_id IN "
               f"(SELECT id::text FROM core_configversion WHERE note IN ('CT {k}', 'CT second {k}')) ORDER BY created_at") for k in BASE}
for k in rows:
    rows[k] = [tuple(x.replace("django", "go") for x in r) for r in rows[k]]
check("db: config audit", (200, rows["django"]), (200, rows["go"]))

# Restore: drop CT rows, put the original statuses back.
restore()
sql("DELETE FROM core_configversion WHERE note LIKE 'CT %'")
sys.exit(1 if summary() else 0)
