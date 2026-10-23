"""Battery types: list / filters / detail / create (proposal) / activate (maker-checker)."""
import sys

from lib import DJ, GO, both, call, check, sql, staff_tokens, summary

ops = staff_tokens()
admin = staff_tokens("admin@yopmail.com", "adminpass123")
B = "/api/v1/mobility/battery-types/"
sql("DELETE FROM mobility_batterytype WHERE name LIKE 'CT %'")

for q in ["", "?status=ACTIVE", "?vehicle_type=MOTORCYCLE", "?q=kura", "?page_size=1&page=2", "?status=NOPE"]:
    both(f"list {q or '(default)'}", "GET", B + q, tokens=ops)
_, lst = call(DJ, "GET", B, token=ops[0])
for t in lst["results"]:
    both(f"detail {t['name']}", "GET", f"{B}{t['id']}/", tokens=ops)
    both(f"detail filtered out {t['name']}", "GET", f"{B}{t['id']}/?status=PENDING", tokens=ops)
both("detail bad id", "GET", B + "nope/", tokens=ops)

both("create: empty", "POST", B, {}, admin)
both("create: bad", "POST", B, {"name": "", "vehicle_type": "x" * 51, "capacity_kwh": "1.234",
                                "nominal_voltage": -1, "qr_scheme": "NOPE", "manufacturer": ""}, admin)
made = {}
for k, base, tok in (("django", DJ, admin[0]), ("go", GO, admin[1])):
    made[k] = call(base, "POST", B, {"name": f" CT {k} pack ", "vehicle_type": " keke-tri ",
                                     "capacity_kwh": 0, "nominal_voltage": 0}, tok)
check("create defaults", (made["django"][0], {**made["django"][1], "name": "x"}),
      (made["go"][0], {**made["go"][1], "name": "x"}), extra=("id", "created_at", "updated_at"))
full = {}
for k, base, tok in (("django", DJ, ops[0]), ("go", GO, ops[1])):
    full[k] = call(base, "POST", B, {"name": f"CT {k} full", "vehicle_type": "BOAT", "capacity_kwh": "4.5",
                                     "nominal_voltage": 60, "qr_scheme": "PRINTED", "manufacturer": "Acme"}, tok)
check("create full (ops)", (full["django"][0], {**full["django"][1], "name": "x"}),
      (full["go"][0], {**full["go"][1], "name": "x"}), extra=("id", "created_at", "updated_at", "created_by"))
# Maker-checker: ops created it, ops can't activate (not super admin); admin created its own and can (bypass).
res = {}
for k, base, tops, tadm in (("django", DJ, ops[0], admin[0]), ("go", GO, ops[1], admin[1])):
    r = []
    r.append(call(base, "POST", f"{B}{full[k][1]['id']}/activate/", None, tops))
    r.append(call(base, "POST", f"{B}{made[k][1]['id']}/activate/", None, tadm))
    r.append(call(base, "POST", f"{B}{made[k][1]['id']}/activate/", None, tadm))
    r.append(call(base, "POST", f"{B}{full[k][1]['id']}/activate/", None, tadm))
    res[k] = r
for i, name in enumerate(["self activate (ops)", "self activate (super admin bypass)", "activate twice",
                          "activate other's"]):
    a, b = res["django"][i], res["go"][i]
    strip = lambda x: {**x[1], "name": "x"} if "name" in x[1] else x[1]  # noqa: E731
    check(name, (a[0], strip(a)), (b[0], strip(b)), extra=("id", "created_at", "updated_at", "approved_by",
                                                            "created_by"))
audit = {k: sql(f"SELECT action, before::text, after::text, metadata::text FROM audit_auditevent WHERE subject_id IN "
                f"('{made[k][1]['id']}', '{full[k][1]['id']}') ORDER BY created_at, id") for k in made}
norm = lambda rows: [[c for c in r[:2]] + [r[3]] for r in rows]  # noqa: E731
check("audit trail", (200, norm(audit["django"])), (200, norm(audit["go"])))
print(f"compared {len(audit['go'])} audit rows")
sql("DELETE FROM mobility_batterytype WHERE name LIKE 'CT %'")
sys.exit(1 if summary() else 0)
