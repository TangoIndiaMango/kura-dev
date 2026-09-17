"""Risk event CSV/PDF export — filtered full set."""
from __future__ import annotations


def risk_event_export_rows(queryset):
    qs = queryset.select_related("account", "rule", "reviewed_by")
    for event in qs.iterator(chunk_size=500):
        reviewer = event.reviewed_by
        if reviewer is None:
            reviewer_name = ""
        else:
            reviewer_name = (
                f"{reviewer.first_name or ''} {reviewer.last_name or ''}".strip()
                or reviewer.email
                or reviewer.phone
                or str(reviewer.id)
            )
        yield [
            str(event.id),
            event.rule.code if event.rule_id else "",
            event.rule.name if event.rule_id else "",
            event.account.kura_id if event.account_id else "",
            event.account.display_name if event.account_id else "",
            event.subject_type,
            event.subject_id,
            event.severity,
            event.score,
            event.action_taken,
            event.status,
            reviewer_name,
            event.review_note,
            event.created_at.isoformat() if event.created_at else "",
        ]
