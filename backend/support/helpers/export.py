"""Support case CSV export — filtered full set (same pattern as accounts)."""
from __future__ import annotations


def case_export_rows(queryset):
    qs = queryset.select_related("account", "assigned_to")
    for case in qs.iterator(chunk_size=500):
        assignee = case.assigned_to
        if assignee is None:
            assignee_name = ""
        else:
            assignee_name = (
                f"{assignee.first_name or ''} {assignee.last_name or ''}".strip()
                or assignee.email
                or assignee.phone
                or str(assignee.id)
            )
        yield [
            str(case.id),
            case.code,
            case.subject,
            case.kind,
            case.account.kura_id if case.account_id else "",
            case.account.display_name if case.account_id else "",
            assignee_name,
            case.priority,
            case.status,
            case.sla_due_at.isoformat() if case.sla_due_at else "",
            case.created_at.isoformat() if case.created_at else "",
        ]
