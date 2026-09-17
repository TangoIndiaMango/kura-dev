"""Alert triage state transitions."""
from __future__ import annotations

from django.db import transaction
from django.utils import timezone

from core.exceptions import DomainError
from core.services.events import emit_event
from operations.models import Alert


def _state(alert: Alert) -> dict:
    return {
        "status": alert.status,
        "severity": alert.severity,
        "is_resolved": alert.is_resolved,
    }


class AlertService:
    @staticmethod
    @transaction.atomic
    def ack(*, alert: Alert, actor) -> Alert:
        locked = Alert.objects.select_for_update().get(pk=alert.pk)
        if locked.status == Alert.Status.RESOLVED:
            raise DomainError("CONFLICT", "Resolved alerts cannot be acknowledged.")
        if locked.status == Alert.Status.ACKNOWLEDGED:
            return locked
        before = _state(locked)
        locked.status = Alert.Status.ACKNOWLEDGED
        locked.acknowledged_at = timezone.now()
        locked.acknowledged_by = actor
        locked.is_resolved = False
        locked.save(
            update_fields=[
                "status",
                "acknowledged_at",
                "acknowledged_by",
                "is_resolved",
                "updated_at",
            ]
        )
        emit_event(
            action="alert.acknowledged",
            subject_type="alert",
            subject_id=str(locked.id),
            actor=actor,
            before=before,
            after=_state(locked),
        )
        return locked

    @staticmethod
    @transaction.atomic
    def resolve(*, alert: Alert, actor, note: str = "") -> Alert:
        locked = Alert.objects.select_for_update().get(pk=alert.pk)
        if locked.status == Alert.Status.RESOLVED:
            return locked
        before = _state(locked)
        locked.status = Alert.Status.RESOLVED
        locked.is_resolved = True
        locked.resolved_at = timezone.now()
        locked.resolved_by = actor
        locked.resolve_note = (note or "").strip()
        locked.save(
            update_fields=[
                "status",
                "is_resolved",
                "resolved_at",
                "resolved_by",
                "resolve_note",
                "updated_at",
            ]
        )
        emit_event(
            action="alert.resolved",
            subject_type="alert",
            subject_id=str(locked.id),
            actor=actor,
            before=before,
            after=_state(locked),
            metadata={"note": locked.resolve_note} if locked.resolve_note else None,
        )
        return locked

    @staticmethod
    @transaction.atomic
    def escalate(*, alert: Alert, actor, note: str = "") -> Alert:
        locked = Alert.objects.select_for_update().get(pk=alert.pk)
        if locked.status == Alert.Status.RESOLVED:
            raise DomainError("CONFLICT", "Resolved alerts cannot be escalated.")
        before = _state(locked)
        locked.status = Alert.Status.ESCALATED
        locked.is_resolved = False
        if note:
            locked.resolve_note = (note or "").strip()
        if locked.severity != Alert.Severity.CRITICAL:
            locked.severity = Alert.Severity.CRITICAL
        locked.save(
            update_fields=[
                "status",
                "is_resolved",
                "resolve_note",
                "severity",
                "updated_at",
            ]
        )
        emit_event(
            action="alert.escalated",
            subject_type="alert",
            subject_id=str(locked.id),
            actor=actor,
            before=before,
            after=_state(locked),
            metadata={"note": locked.resolve_note} if locked.resolve_note else None,
        )
        return locked

    @staticmethod
    @transaction.atomic
    def open(
        *,
        kind: str,
        message: str,
        severity: str = Alert.Severity.WARNING,
        hub=None,
        delivery_channel: str = "IN_APP",
    ) -> Alert:
        alert = Alert.objects.create(
            kind=kind,
            message=message,
            severity=severity,
            hub=hub,
            delivery_channel=delivery_channel or "IN_APP",
            status=Alert.Status.OPEN,
            is_resolved=False,
        )
        emit_event(
            action="alert.opened",
            subject_type="alert",
            subject_id=str(alert.id),
            subject_label=alert.kind,
            after=_state(alert),
        )
        return alert
