"""Roles + permissions: reads compared directly; writes cross-read (the other
backend must read back exactly what one wrote). Test roles are removed after."""
import subprocess
import sys

from lib import DJ, GO, both, call, check, staff_tokens, summary

ops = staff_tokens()
admin = staff_tokens("admin@yopmail.com", "adminpass123")

for q in ["", "?page_size=5", "?page=2&page_size=5", "?module=operations", "?q=hub",
          "?q=50%25", "?page=99"]:
    both(f"permissions list {q or '(default)'}", "GET", f"/api/v1/permissions/{q}", tokens=ops)
_, perms = call(DJ, "GET", "/api/v1/permissions/?page_size=100", token=ops[0])
pid = perms["results"][0]["id"]
both("permission detail", "GET", f"/api/v1/permissions/{pid}/", tokens=ops)
both("permission 404 bad uuid", "GET", "/api/v1/permissions/nope/", tokens=ops)

for q in ["", "?is_system=true", "?is_active=false", "?q=manager", "?page_size=3&page=2"]:
    both(f"roles list {q or '(default)'}", "GET", f"/api/v1/roles/{q}", tokens=ops)
both("roles stats", "GET", "/api/v1/roles/stats/", tokens=ops)
_, roles = call(DJ, "GET", "/api/v1/roles/?page_size=100", token=ops[0])
rid = roles["results"][0]["id"]
both("role detail", "GET", f"/api/v1/roles/{rid}/", tokens=ops)
both("role 404", "GET", "/api/v1/roles/00000000-0000-0000-0000-000000000000/", tokens=ops)

for name, path in [("roles csv", "/api/v1/roles/export/"), ("roles csv filtered", "/api/v1/roles/export/?is_system=true")]:
    d = call(DJ, "GET", path, token=ops[0], raw=True)
    g = call(GO, "GET", path, token=ops[1], raw=True)
    check(name, (d[0], {"csv": d[1].decode(), "rows": d[2].get("X-Export-Row-Count")}),
          (g[0], {"csv": g[1].decode(), "rows": g[2].get("X-Export-Row-Count")}))
d = call(DJ, "GET", "/api/v1/roles/export/?export=pdf", token=ops[0], raw=True)
g = call(GO, "GET", "/api/v1/roles/export/?export=pdf", token=ops[1], raw=True)
check("roles pdf (type + rows)", (d[0], {"type": d[2].get("Content-Type"), "rows": d[2].get("X-Export-Row-Count"),
                                         "pdf": d[1][:4].decode()}),
      (g[0], {"type": g[2].get("Content-Type"), "rows": g[2].get("X-Export-Row-Count"), "pdf": g[1][:4].decode()}))
both("roles export bad format", "GET", "/api/v1/roles/export/?export=xls", tokens=ops)

# Validation (no writes happen).
both("create: missing fields", "POST", "/api/v1/roles/", {}, admin)
both("create: duplicate exact code", "POST", "/api/v1/roles/", {"code": "OPS_MANAGER", "name": "x"}, admin)
both("create: duplicate other case", "POST", "/api/v1/roles/", {"code": "ops_manager", "name": "x"}, admin)
both("create: unknown permission", "POST", "/api/v1/roles/",
     {"code": "ZZ_NEVER", "name": "x", "permission_ids": ["00000000-0000-0000-0000-000000000000"]}, admin)
both("create: forbidden for ops? (roles:manage)", "POST", "/api/v1/roles/", {"code": "ZZ_X", "name": "x"}, ops)
both("deactivate system role refused", "POST", f"/api/v1/roles/{rid}/deactivate/", None, admin)

# Writes, cross-read: each backend creates its own role; the other reads it back.
for who, base, tok, other, otok in [("go", GO, admin[1], DJ, admin[0]), ("django", DJ, admin[0], GO, admin[1])]:
    code = f"CONTRACT_{who.upper()}"
    st, made = call(base, "POST", "/api/v1/roles/",
                    {"code": code.lower(), "name": f" {who} role ", "description": "d",
                     "permission_ids": [p["id"] for p in perms["results"][:3]]}, tok)
    assert st == 201, (who, st, made)  # create is 201; the read-back is 200
    check(f"{who} create -> other reads same", (200, made), call(other, "GET", f"/api/v1/roles/{made.get('id')}/", token=otok))
    st, upd = call(base, "PATCH", f"/api/v1/roles/{made['id']}/",
                   {"name": "renamed", "permission_ids": [perms["results"][4]["id"]]}, tok)
    check(f"{who} patch -> other reads same", (st, upd), call(other, "GET", f"/api/v1/roles/{made['id']}/", token=otok))
    st, off = call(base, "POST", f"/api/v1/roles/{made['id']}/deactivate/", None, tok)
    check(f"{who} deactivate -> other reads same", (st, off), call(other, "GET", f"/api/v1/roles/{made['id']}/", token=otok))
both("blank name patch", "PATCH", f"/api/v1/roles/{rid}/", {"name": ""}, admin)

subprocess.run(["psql", "postgres://kura:kura_dev_password@127.0.0.1:5432/kura", "-qc",
                "DELETE FROM accounts_role_permissions WHERE role_id IN (SELECT id FROM accounts_role WHERE code LIKE 'CONTRACT_%');"
                "DELETE FROM accounts_role WHERE code LIKE 'CONTRACT_%';"], check=True)
sys.exit(1 if summary() else 0)
