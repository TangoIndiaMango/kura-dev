"""Ops velocity grants — narrow allow after SWAP_VELOCITY review."""
from __future__ import annotations

from datetime import timedelta

from django.db import transaction
from django.utils import timezone

from core.exceptions import DomainError
from core.services.events import NotifySpec, emit_event
from notifications.models import Notification
from risk.models import RiskEvent, RiskRule, RiskVelocityGrant


_GRANT_DEFAULTS = {
    "GRANT_TTL_HOURS": 4,
    "GRANT_MAX_USES": 1,
}


def _grant_params() -> dict:
    from risk.services import RiskService

    RiskService.ensure_rules()
    rule = RiskRule.objects.filter(code="SWAP_VELOCITY").only("params").first()
    raw = rule.params if rule and isinstance(rule.params, dict) else {}
    return {**_GRANT_DEFAULTS, **raw}


def create_velocity_grant(
    *,
    event: RiskEvent,
    reviewer,
    note: str = "",
    ttl_hours: int | None = None,
    max_uses: int | None = None,
) -> RiskVelocityGrant:
    if event.rule.code != "SWAP_VELOCITY":
        raise DomainError(
            "VALIDATION_ERROR",
            "Velocity grants only apply to SWAP_VELOCITY events.",
        )
    if event.subject_type != "vehicle":
        raise DomainError(
            "VALIDATION_ERROR",
            "SWAP_VELOCITY subject must be a vehicle.",
        )
    note_clean = (note or "").strip()
    if not note_clean:
        raise DomainError(
            "VALIDATION_ERROR",
            "A review note is required to grant a velocity exception.",
            details={"note": ["required"]},
        )

    params = _grant_params()
    hours = int(ttl_hours if ttl_hours is not None else params["GRANT_TTL_HOURS"])
    uses = int(max_uses if max_uses is not None else params["GRANT_MAX_USES"])
    hours = max(1, min(hours, 48))
    uses = max(1, min(uses, 5))
    expires_at = timezone.now() + timedelta(hours=hours)

    with transaction.atomic():
        # One active grant per vehicle from this event.
        RiskVelocityGrant.objects.filter(
            risk_event=event,
            status=RiskVelocityGrant.Status.ACTIVE,
        ).update(status=RiskVelocityGrant.Status.REVOKED)

        grant = RiskVelocityGrant.objects.create(
            risk_event=event,
            vehicle_id=event.subject_id,
            account=event.account,
            granted_by=reviewer,
            expires_at=expires_at,
            max_uses=uses,
            uses_remaining=uses,
            status=RiskVelocityGrant.Status.ACTIVE,
            note=note_clean[:4000],
        )
        emit_event(
            action="risk.velocity_grant.created",
            subject_type="risk_velocity_grant",
            subject_id=str(grant.id),
            actor=reviewer,
            subject_label=str(grant.vehicle_id)[:12],
            metadata={
                "risk_event_id": str(event.id),
                "vehicle_id": str(grant.vehicle_id),
                "expires_at": expires_at.isoformat(),
                "max_uses": uses,
            },
            notify=NotifySpec(
                user=reviewer,
                title="Velocity exception granted",
                body=(
                    f"Bay may complete up to {uses} swap(s) for this vehicle "
                    f"until {expires_at.astimezone().strftime('%Y-%m-%d %H:%M')}."
                ),
                source="Risk",
                severity=Notification.Severity.INFO,
                link_path=f"/risk/{event.id}",
                template_code="risk.velocity_grant.created",
                dedupe_key=f"risk.velocity_grant.created:{grant.id}",
            ),
        )
        return grant


def try_consume_velocity_grant(*, vehicle_id) -> RiskVelocityGrant | None:
    """Consume one use if an active, unexpired grant exists. Durable commit."""
    now = timezone.now()
    with transaction.atomic():
        grant = (
            RiskVelocityGrant.objects.select_for_update()
            .filter(
                vehicle_id=vehicle_id,
                status=RiskVelocityGrant.Status.ACTIVE,
                expires_at__gt=now,
                uses_remaining__gt=0,
            )
            .order_by("expires_at")
            .first()
        )
        if grant is None:
            return None
        grant.uses_remaining = max(0, int(grant.uses_remaining) - 1)
        if grant.uses_remaining == 0:
            grant.status = RiskVelocityGrant.Status.CONSUMED
        grant.save(update_fields=["uses_remaining", "status", "updated_at"])
        emit_event(
            action="risk.velocity_grant.consumed",
            subject_type="risk_velocity_grant",
            subject_id=str(grant.id),
            metadata={
                "vehicle_id": str(vehicle_id),
                "uses_remaining": grant.uses_remaining,
                "status": grant.status,
            },
        )
        return grant
