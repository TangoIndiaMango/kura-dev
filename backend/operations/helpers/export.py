"""Alert CSV/PDF export rows."""
from __future__ import annotations


def alert_export_rows(queryset):
    qs = queryset.select_related("hub", "acknowledged_by", "resolved_by")
    for alert in qs.iterator(chunk_size=500):
        yield [
            str(alert.id),
            alert.kind,
            alert.severity,
            alert.status,
            alert.message,
            alert.hub.code if alert.hub_id else "",
            alert.hub.name if alert.hub_id else "",
            alert.delivery_channel,
            alert.resolve_note,
            alert.created_at.isoformat() if alert.created_at else "",
            alert.acknowledged_at.isoformat() if alert.acknowledged_at else "",
            alert.resolved_at.isoformat() if alert.resolved_at else "",
        ]
