"""Bay-facing velocity status + exception request (ops still grants via review)."""
from __future__ import annotations

from django.db import transaction
from django.utils import timezone

from core.exceptions import DomainError
from core.services.events import emit_event
from risk.models import RiskEvent, RiskVelocityGrant
from risk.services.notify_staff import notify_risk_reviewers


def active_grant_for_vehicle(*, vehicle_id) -> RiskVelocityGrant | None:
    now = timezone.now()
    return (
        RiskVelocityGrant.objects.filter(
            vehicle_id=vehicle_id,
            status=RiskVelocityGrant.Status.ACTIVE,
            expires_at__gt=now,
            uses_remaining__gt=0,
        )
        .order_by("expires_at")
        .first()
    )


def open_velocity_event(*, vehicle_id) -> RiskEvent | None:
    return (
        RiskEvent.objects.select_related("rule", "account")
        .filter(
            rule__code="SWAP_VELOCITY",
            subject_type="vehicle",
            subject_id=str(vehicle_id),
            status=RiskEvent.Status.OPEN,
        )
        .order_by("-created_at")
        .first()
    )


def velocity_bay_status(*, vehicle_id) -> dict:
    from mobility.services.swap.risk import inspect_swap_velocity

    grant = active_grant_for_vehicle(vehicle_id=vehicle_id)
    event = open_velocity_event(vehicle_id=vehicle_id)
    throttle = inspect_swap_velocity(vehicle_id=vehicle_id)
    bay_note = ""
    if event and isinstance(event.context, dict):
        bay_note = str(event.context.get("bay_request_note") or "").strip()
    return {
        "vehicle_id": str(vehicle_id),
        "blocked": throttle is not None and grant is None,
        "reason": (throttle or {}).get("reason") if throttle else None,
        "message": (throttle or {}).get("message") if throttle else None,
        "retry_after_seconds": (throttle or {}).get("retry_after_seconds")
        if throttle
        else 0,
        "risk_event_id": str(event.id) if event else None,
        "bay_request_note": bay_note or None,
        "exception_requested": bool(bay_note),
        "active_grant": (
            {
                "id": str(grant.id),
                "uses_remaining": grant.uses_remaining,
                "max_uses": grant.max_uses,
                "expires_at": grant.expires_at.isoformat(),
            }
            if grant
            else None
        ),
    }


def request_velocity_exception(
    *,
    vehicle_id,
    note: str,
    agent,
    hub_id=None,
    account=None,
) -> RiskEvent:
    note_clean = (note or "").strip()
    if not note_clean:
        raise DomainError(
            "VALIDATION_ERROR",
            "A reason is required to request a velocity exception.",
            details={"note": ["required"]},
        )

    with transaction.atomic():
        event = open_velocity_event(vehicle_id=vehicle_id)
        if event is None:
            from risk.services import RiskService

            event = RiskService.emit(
                rule_code="SWAP_VELOCITY",
                subject_type="vehicle",
                subject_id=str(vehicle_id),
                account=account,
                severity="HIGH",
                context={
                    "reason": "BAY_EXCEPTION_REQUEST",
                    "requested_by": str(agent.id),
                },
                action_taken="BLOCK",
            )
        locked = (
            RiskEvent.objects.select_for_update(of=("self",))
            .select_related("rule", "account")
            .get(pk=event.pk)
        )
        if locked.status != RiskEvent.Status.OPEN:
            raise DomainError(
                "CONFLICT",
                "This velocity alert was already reviewed. Retry start or wait.",
                http=409,
            )
        ctx = dict(locked.context or {})
        ctx["bay_request_note"] = note_clean[:4000]
        ctx["bay_requested_by"] = str(agent.id)
        ctx["bay_requested_at"] = timezone.now().isoformat()
        if hub_id is not None:
            ctx["hub_id"] = str(hub_id)
        locked.context = ctx
        locked.save(update_fields=["context", "updated_at"])

        event_id = str(locked.id)
        emit_event(
            action="risk.velocity_exception.requested",
            subject_type="risk_event",
            subject_id=event_id,
            actor=agent,
            subject_label="SWAP_VELOCITY",
            metadata={
                "vehicle_id": str(vehicle_id),
                "hub_id": str(hub_id) if hub_id else None,
                "note": note_clean[:200],
            },
        )

        def _notify() -> None:
            notify_risk_reviewers(
                title="Bay · velocity exception requested",
                body=f"Agent requested an exception: {note_clean[:160]}",
                link_path=f"/risk/{event_id}",
                dedupe_key=f"risk.velocity_exception.requested:{event_id}",
            )

        transaction.on_commit(_notify)
        return locked
