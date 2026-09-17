"""Agent bay overrides — PIN grant + daily limit (E4.8 / T-SWP-06)."""
from __future__ import annotations

from django.db import transaction
from django.utils import timezone

from accounts.services.auth import assert_pin_grant
from core.exceptions import DomainError
from core.services.events import emit_event
from operations.models import Alert, Override
from operations.services.alerts import AlertService

OVERRIDE_ALERT_THRESHOLD = 3


class OverrideService:
    @staticmethod
    @transaction.atomic
    def record(
        *,
        agent,
        reason: str,
        note: str,
        pin_grant: str,
        swap=None,
        hub=None,
    ) -> Override:
        assert_pin_grant(token=pin_grant, user_id=agent.id)

        reason_key = (reason or "").strip().upper() or Override.Reason.DISCRETION
        valid = {c.value for c in Override.Reason}
        if reason_key not in valid:
            note = f"[{reason_key}] {(note or '').strip()}".strip()
            reason_key = Override.Reason.DISCRETION
        note_clean = (note or "").strip()
        if not note_clean:
            raise DomainError(
                "VALIDATION_ERROR",
                "Override note/reason detail is required.",
                details={"note": ["required"]},
            )

        row = Override.objects.create(
            swap=swap,
            agent=agent,
            reason=reason_key,
            note=note_clean,
        )

        day_start = timezone.now().replace(hour=0, minute=0, second=0, microsecond=0)
        count = Override.objects.filter(
            agent=agent, created_at__gte=day_start
        ).count()

        if count >= OVERRIDE_ALERT_THRESHOLD:
            AlertService.open(
                kind=Alert.Kind.AGENT_OVERRIDE_LIMIT,
                message=(
                    f"{agent.email or agent.phone} recorded {count} overrides today "
                    f"(threshold {OVERRIDE_ALERT_THRESHOLD})."
                ),
                severity=Alert.Severity.WARNING,
                hub=hub or (getattr(swap, "hub", None) if swap else None),
            )

        emit_event(
            action="override.recorded",
            subject_type="override",
            subject_id=str(row.id),
            actor=agent,
            metadata={
                "reason": reason_key,
                "swap_id": str(swap.id) if swap else None,
                "day_count": count,
            },
        )
        return row
