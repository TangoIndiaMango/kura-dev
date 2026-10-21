"""
Role → capability matrix (single source of truth).

- Codes use `resource:action` so new permissions are additive.
- Seed command syncs these into DB `Permission` / `Role` rows.
- `GET /me` exposes the resolved set so UIs hide controls from the same source.
- Superusers / SUPER_ADMIN always pass capability checks in code.
"""
from __future__ import annotations

from typing import Final

# (code, name, module, description)
PERMISSION_CATALOG: Final[list[tuple[str, str, str, str]]] = [
    ("hubs:read", "View hubs", "operations", "List hubs and slot status"),
    ("hubs:manage", "Manage hubs", "operations", "Create and configure hubs"),
    ("batteries:read", "View batteries", "operations", "Inventory and health"),
    ("batteries:manage", "Manage batteries", "operations", "Commission and retire"),
    ("battery-types:approve", "Approve battery types", "operations", "Maker-checker catalogue"),
    ("vehicles:read", "View vehicles", "operations", "Fleet register"),
    ("vehicles:manage", "Manage vehicles", "operations", "Register and suspend vehicles"),
    ("swaps:read", "View swaps", "operations", "Swap history"),
    ("swaps:complete", "Complete swaps", "operations", "Hub agent swap completion"),
    ("swaps:override", "Override swaps", "operations", "Manual override with reason"),
    ("swaps:reverse", "Reverse completed swaps", "operations", "Ops reverse within 24h"),
    ("alerts:read", "View alerts", "operations", "Alert triage queue"),
    ("alerts:manage", "Manage alerts", "operations", "Ack and resolve alerts"),
    ("shifts:manage", "Manage shifts", "operations", "Open and close hub shifts"),
    ("accounts:read", "View accounts", "accounts", "CRM / operator directory"),
    ("accounts:manage", "Manage accounts", "accounts", "Suspend, reinstate, edit"),
    ("accounts:write_own", "Edit own account", "accounts", "Operator self-service profile"),
    ("cooperatives:read", "View cooperatives", "accounts", "Cooperative directory"),
    ("cooperatives:manage", "Manage cooperatives", "accounts", "Create/edit cooperative catalogue"),
    ("analytics:cooperative", "Cooperative analytics", "analytics", "Read-only coop aggregates"),
    ("analytics:revenue", "View revenue analytics", "analytics", "Aggregated platform revenue"),
    ("finance:read", "View finance", "finance", "Wallets and ledger"),
    ("wallets:manage", "Manage wallets", "finance", "Ops wallet actions"),
    ("tariffs:manage", "Manage tariffs", "finance", "Plans and price versions"),
    ("price:approve", "Approve prices", "finance", "Maker-checker price activation"),
    ("credit:approve", "Approve credit", "finance", "Underwrite swap-credit"),
    ("offers:manage", "Manage offers", "finance", "Product offers catalogue"),
    ("segments:manage", "Manage segments", "finance", "Operator cohort definitions"),
    ("engines:manage", "Manage engines / retrofit", "operations", "Path B intake, install, checklist"),
    ("engines:release", "Release stored engines", "operations", "Ops release after case approval"),
    ("telemetry:read", "View telemetry", "operations", "Vehicle GPS / SOC event feed"),
    ("telemetry:ingest", "Ingest telemetry", "operations", "Manual or IoT batch ingest"),
    ("analytics:impact", "View impact metrics", "analytics", "Gov / ops CO₂ and savings rollups"),
    ("impact:manage", "Manage impact stories", "analytics", "Publish government impact CMS cards"),
    ("roles:manage", "Manage roles", "administration", "RBAC roles and grants"),
    ("users:read", "View users", "administration", "Staff and operator directory"),
    ("users:manage", "Manage users", "administration", "Invite and deactivate"),
    ("audit:read", "View audit", "administration", "Audit trail (scoped by module caps)"),
    ("audit:manage", "Manage audit", "administration", "Unscoped full audit trail"),
    ("identity:reveal", "Reveal identity", "administration", "Decrypt NIN/BVN (audited)"),
    ("cases:read", "View support cases", "support", "Support tickets / disputes"),
    ("cases:manage", "Manage support cases", "support", "Open, assign, resolve cases"),
    (
        "cases:write_own",
        "Open own support cases",
        "support",
        "Operator self-service tickets on own account",
    ),
    ("risk:read", "View risk events", "risk", "Fraud and compliance events"),
    ("risk:review", "Review risk events", "risk", "Mark risk events reviewed"),
]

# role_code → list of permission codes, or "*" for all
ROLE_CAPABILITIES: Final[dict[str, list[str] | str]] = {
    "SUPER_ADMIN": "*",
    "OPS_MANAGER": [
        "hubs:read",
        "hubs:manage",
        "batteries:read",
        "batteries:manage",
        "battery-types:approve",
        "vehicles:read",
        "vehicles:manage",
        "swaps:read",
        "swaps:complete",
        "swaps:override",
        "swaps:reverse",
        "alerts:read",
        "alerts:manage",
        "shifts:manage",
        "accounts:read",
        "accounts:manage",
        "cooperatives:read",
        "cooperatives:manage",
        "analytics:cooperative",
        "analytics:revenue",
        "finance:read",
        "users:read",
        "users:manage",
        "audit:read",
        "identity:reveal",
        "price:approve",
        "credit:approve",
        "offers:manage",
        "segments:manage",
        "engines:manage",
        "engines:release",
        "telemetry:read",
        "telemetry:ingest",
        "analytics:impact",
        "impact:manage",
        "cases:read",
        "cases:manage",
        "risk:read",
        "risk:review",
    ],
    "HUB_AGENT": [
        "hubs:read",
        "batteries:read",
        "vehicles:read",
        "swaps:read",
        "swaps:complete",
        "swaps:override",
        "shifts:manage",
        "accounts:read",
        "cooperatives:read",
        "engines:manage",
        "telemetry:ingest",
        "cases:read",
        "alerts:read",
    ],
    "COMMERCIAL_ADMIN": [
        "analytics:revenue",
        "finance:read",
        "wallets:manage",
        "tariffs:manage",
        "credit:approve",
        "offers:manage",
        "segments:manage",
        "accounts:read",
        "cooperatives:read",
        "users:read",
        "audit:read",
        "cases:read",
        "analytics:impact",
    ],
    # Read-only external roles see analytics aggregates only — never raw operator
    # tables (swaps, vehicles, payments, audit, cooperative members). 03 §roles.
    "GOVERNMENT_VIEWER": [
        "analytics:revenue",
        "analytics:impact",
        "hubs:read",
    ],
    "PARTNER_VIEWER": [
        "analytics:revenue",
        "analytics:impact",
        "hubs:read",
        "batteries:read",
    ],
    "COOPERATIVE_CHAIRMAN": [
        "cooperatives:read",
        "analytics:cooperative",
    ],
    "DRIVER": [
        "accounts:write_own",
        "swaps:read",
        "finance:read",
        "vehicles:manage",
        "cases:write_own",
    ],
    "FLEET_OWNER": [
        "accounts:write_own",
        "swaps:read",
        "finance:read",
        "users:read",
        "vehicles:manage",
        "cases:write_own",
    ],
}

ROLE_META: Final[dict[str, dict[str, str]]] = {
    "SUPER_ADMIN": {"name": "Super Admin", "description": "Unrestricted platform access"},
    "OPS_MANAGER": {"name": "Operations Manager", "description": "Network ops and CRM"},
    "HUB_AGENT": {"name": "Hub Agent", "description": "Station-level swap execution"},
    "COMMERCIAL_ADMIN": {"name": "Commercial Admin", "description": "Tariffs, credit, partners"},
    "GOVERNMENT_VIEWER": {"name": "Government Viewer", "description": "Read-only regulatory view"},
    "PARTNER_VIEWER": {"name": "Partner Viewer", "description": "Read-only partner view"},
    "COOPERATIVE_CHAIRMAN": {
        "name": "Cooperative Chairman",
        "description": "Read-only aggregates for one cooperative",
    },
    "DRIVER": {"name": "Driver / Operator", "description": "Rider app access"},
    "FLEET_OWNER": {"name": "Fleet Owner", "description": "Fleet account management"},
}


def all_permission_codes() -> list[str]:
    return [code for code, *_ in PERMISSION_CATALOG]


def capabilities_for_role_code(role_code: str) -> set[str]:
    grant = ROLE_CAPABILITIES.get(role_code, [])
    if grant == "*":
        return set(all_permission_codes())
    return set(grant)
