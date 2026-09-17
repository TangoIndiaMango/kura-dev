"""
Domain event helper — one call for audit trail + optional inbox/outbox notify.

Use from services (inside or outside transaction.atomic). Prefer this over
calling AuditService.record + NotificationService.notify separately.
"""
from __future__ import annotations

from collections.abc import Sequence
from dataclasses import dataclass, field
from typing import Any

from django.db import transaction

from audit.models import AuditEvent
from audit.services import AuditService
from core.helpers.client_ip import current_client_ip, current_request_id
from notifications.models import Notification
from notifications.services import NotificationService


@dataclass(frozen=True, slots=True)
class NotifySpec:
    """Deliver to one user on one or more channels (IN_APP, PUSH, …)."""

    user: Any
    title: str
    body: str = ""
    source: str = "System"
    severity: str = Notification.Severity.INFO
    channels: tuple[str, ...] = (Notification.Channel.IN_APP,)
    template_code: str = ""
    link_path: str = ""
    params: dict[str, Any] = field(default_factory=dict)
    dedupe_key: str = ""


@dataclass(frozen=True, slots=True)
class EventResult:
    audit: AuditEvent
    notifications: tuple[Notification, ...] = ()


def _normalize_notify(
    notify: NotifySpec | Sequence[NotifySpec] | None,
) -> tuple[NotifySpec, ...]:
    if notify is None:
        return ()
    if isinstance(notify, NotifySpec):
        return (notify,)
    return tuple(n for n in notify if n is not None)


@transaction.atomic
def emit_event(
    *,
    action: str,
    subject_type: str,
    subject_id: str,
    actor=None,
    subject_label: str = "",
    before: dict | None = None,
    after: dict | None = None,
    metadata: dict | None = None,
    ip_address: str | None = None,
    request_id: str = "",
    notify: NotifySpec | Sequence[NotifySpec] | None = None,
) -> EventResult:
    """
    Append an audit row, then optionally fan out notifications.

    Pass notify=None for audit-only events. Pass one NotifySpec or a sequence
    to notify several users (e.g. rider + hub agents) from one mutation.
    ip_address / request_id default from the current HTTP request context
    (never reuse a stored user IP).
    """
    if ip_address is None:
        ip_address = current_client_ip()
    if not request_id:
        request_id = current_request_id()

    audit = AuditService.record(
        action=action,
        subject_type=str(subject_type or "").strip().lower(),
        subject_id=str(subject_id),
        actor=actor,
        subject_label=subject_label,
        before=before,
        after=after,
        metadata=metadata,
        ip_address=ip_address,
        request_id=request_id,
    )
    notes: list[Notification] = []
    for spec in _normalize_notify(notify):
        if spec.user is None:
            continue
        channels = spec.channels or (Notification.Channel.IN_APP,)
        for channel in channels:
            dedupe = spec.dedupe_key
            if dedupe and len(channels) > 1:
                dedupe = f"{dedupe}:{channel}"
            notes.append(
                NotificationService.notify(
                    user=spec.user,
                    title=spec.title,
                    body=spec.body,
                    source=spec.source,
                    severity=spec.severity,
                    channel=channel,
                    template_code=spec.template_code,
                    link_path=spec.link_path,
                    params=spec.params,
                    dedupe_key=dedupe,
                )
            )
    return EventResult(audit=audit, notifications=tuple(notes))
