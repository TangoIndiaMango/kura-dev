"""Apply plan switches after preview rules."""
from __future__ import annotations

from django.db import transaction

from core.exceptions import DomainError
from core.services.events import NotifySpec, emit_event
from mobility.models import Plan, Subscription
from mobility.services.plans.helpers import owner_user
from mobility.services.plans.switch_preview import (
    SwitchEffective,
    SwitchKind,
    preview_switch,
)

def execute_switch(
    *,
    subscription: Subscription,
    plan: Plan,
    actor=None,
    immediate: bool | None = None,
    discount_code: str = "",
    idempotency_key: str = "",
    channel: str = "App",
    pin_grant: str = "",
    purchase_fn,
    cancel_fn,
) -> Subscription:
    """Apply preview rules then queue or cancel+buy. purchase_fn/cancel_fn avoid cycles."""
    with transaction.atomic():
        sub = (
            Subscription.objects.select_for_update(of=("self",))
            .select_related(
                "account",
                "vehicle",
                "vehicle__vehicle_model",
                "plan",
                "queued_plan",
            )
            .get(pk=subscription.pk)
        )
        preview = preview_switch(
            subscription=sub,
            plan=plan,
            immediate=immediate,
            discount_code=discount_code,
            channel=channel,
        )
        owner = owner_user(sub.account)

        if preview.kind == SwitchKind.CLEAR_QUEUE:
            before = {
                "queued_plan_id": str(sub.queued_plan_id) if sub.queued_plan_id else None
            }
            sub.queued_plan = None
            sub.save(update_fields=["queued_plan", "updated_at"])
            emit_event(
                action="subscription.switch_queue_cleared",
                subject_type="subscription",
                subject_id=str(sub.id),
                actor=actor or owner,
                before=before,
                after={"queued_plan_id": None},
            )
            return sub

        if preview.effective == SwitchEffective.QUEUED:
            before = {
                "plan_id": str(sub.plan_id),
                "queued_plan_id": str(sub.queued_plan_id)
                if sub.queued_plan_id
                else None,
            }
            sub.queued_plan = plan
            sub.save(update_fields=["queued_plan", "updated_at"])
            emit_event(
                action="subscription.switch_queued",
                subject_type="subscription",
                subject_id=str(sub.id),
                actor=actor or owner,
                before=before,
                after={
                    "kind": preview.kind,
                    "plan_id": str(sub.plan_id),
                    "queued_plan_id": str(plan.id),
                    "starts_at": sub.ends_at.isoformat(),
                },
                notify=NotifySpec(
                    user=owner,
                    title="Plan change queued",
                    body=preview.message,
                    source="Billing",
                    template_code="plan.switch_queued",
                    link_path="/plans",
                    dedupe_key=f"sub-switch-q:{sub.id}:{plan.id}",
                )
                if owner
                else None,
            )
            return sub

        if not (pin_grant or "").strip():
            raise DomainError(
                "PIN_GRANT_REQUIRED",
                "PIN confirmation is required to switch plans now.",
                http=403,
            )
        auto = sub.auto_renew
        account = sub.account
        vehicle = sub.vehicle
        cancel_fn(subscription=sub, actor=actor, reason=f"switch_{preview.kind.lower()}")

    return purchase_fn(
        account=account,
        vehicle=vehicle,
        plan=plan,
        actor=actor,
        auto_renew=auto,
        discount_code=discount_code,
        idempotency_key=idempotency_key,
        channel=channel,
        pin_grant=pin_grant,
        skip_pin=False,
    )
