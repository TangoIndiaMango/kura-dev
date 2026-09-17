"""Subscription lifecycle: purchase, renew, cancel, switch, auto-renew."""
from __future__ import annotations

from django.db import transaction

from core.exceptions import DomainError
from core.services.events import NotifySpec, emit_event
from mobility.models import Plan, Subscription, Vehicle
from mobility.services.plans.billing import (
    purchase as billing_purchase,
    renew as billing_renew,
)
from mobility.services.plans.helpers import owner_user
from mobility.services.plans.switch import execute_switch
from mobility.services.plans.switch_preview import SwitchPreview, preview_switch


class SubscriptionService:
    @classmethod
    def purchase(
        cls,
        *,
        account,
        vehicle: Vehicle,
        plan: Plan,
        actor=None,
        auto_renew: bool | None = None,
        discount_code: str = "",
        idempotency_key: str = "",
        channel: str = "App",
        payment_mode: str = "WALLET",
        pin_grant: str = "",
        skip_pin: bool = False,
    ) -> Subscription:
        return billing_purchase(
            account=account,
            vehicle=vehicle,
            plan=plan,
            actor=actor,
            auto_renew=auto_renew,
            discount_code=discount_code,
            idempotency_key=idempotency_key,
            channel=channel,
            payment_mode=payment_mode,
            pin_grant=pin_grant,
            skip_pin=skip_pin,
        )

    @classmethod
    def renew(
        cls,
        *,
        subscription: Subscription,
        actor=None,
        discount_code: str = "",
        idempotency_key: str = "",
        channel: str = "App",
        pin_grant: str = "",
        skip_pin: bool = False,
    ) -> Subscription:
        return billing_renew(
            subscription=subscription,
            actor=actor,
            discount_code=discount_code,
            idempotency_key=idempotency_key,
            channel=channel,
            pin_grant=pin_grant,
            skip_pin=skip_pin,
        )

    @classmethod
    def cancel(
        cls, *, subscription: Subscription, actor=None, reason: str = ""
    ) -> Subscription:
        with transaction.atomic():
            sub = Subscription.objects.select_for_update().select_related(
                "account", "plan", "vehicle"
            ).get(pk=subscription.pk)
            if sub.status != Subscription.Status.ACTIVE:
                raise DomainError(
                    "INVALID_TRANSITION",
                    f"Cannot cancel subscription in status {sub.status}.",
                    http=409,
                )
            before = {
                "status": sub.status,
                "auto_renew": sub.auto_renew,
                "queued_plan_id": str(sub.queued_plan_id) if sub.queued_plan_id else None,
            }
            sub.status = Subscription.Status.CANCELLED
            sub.auto_renew = False
            sub.queued_plan = None
            sub.save(
                update_fields=["status", "auto_renew", "queued_plan", "updated_at"]
            )
            owner = owner_user(sub.account)
            emit_event(
                action="subscription.cancelled",
                subject_type="subscription",
                subject_id=str(sub.id),
                actor=actor or owner,
                before=before,
                after={"status": sub.status, "reason": (reason or "")[:200]},
                notify=NotifySpec(
                    user=owner,
                    title="Plan cancelled",
                    body=f"{sub.plan.name} was cancelled. Swaps are pay-per-swap now.",
                    source="Billing",
                    template_code="plan.cancelled",
                    link_path="/plans",
                    dedupe_key=f"sub-cancelled:{sub.id}",
                )
                if owner
                else None,
            )
            return sub

    @classmethod
    def preview_switch(
        cls,
        *,
        subscription: Subscription,
        plan: Plan,
        immediate: bool | None = None,
        discount_code: str = "",
        channel: str = "App",
    ) -> SwitchPreview:
        sub = Subscription.objects.select_related(
            "account", "vehicle", "vehicle__vehicle_model", "plan", "queued_plan"
        ).get(pk=subscription.pk)
        return preview_switch(
            subscription=sub,
            plan=plan,
            immediate=immediate,
            discount_code=discount_code,
            channel=channel,
        )

    @classmethod
    def switch(
        cls,
        *,
        subscription: Subscription,
        plan: Plan,
        actor=None,
        immediate: bool | None = None,
        discount_code: str = "",
        idempotency_key: str = "",
        channel: str = "App",
        pin_grant: str = "",
    ) -> Subscription:
        return execute_switch(
            subscription=subscription,
            plan=plan,
            actor=actor,
            immediate=immediate,
            discount_code=discount_code,
            idempotency_key=idempotency_key,
            channel=channel,
            pin_grant=pin_grant,
            purchase_fn=cls.purchase,
            cancel_fn=cls.cancel,
        )

    @classmethod
    def set_auto_renew(
        cls, *, subscription: Subscription, auto_renew: bool, actor=None
    ) -> Subscription:
        with transaction.atomic():
            sub = Subscription.objects.select_for_update().get(pk=subscription.pk)
            before = {"auto_renew": sub.auto_renew}
            sub.auto_renew = bool(auto_renew)
            sub.save(update_fields=["auto_renew", "updated_at"])
            emit_event(
                action="subscription.auto_renew_set",
                subject_type="subscription",
                subject_id=str(sub.id),
                actor=actor,
                before=before,
                after={"auto_renew": sub.auto_renew},
            )
            return sub
