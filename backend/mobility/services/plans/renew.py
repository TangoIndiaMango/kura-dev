"""Extend an active or lapsed plan period via wallet debit."""
from __future__ import annotations

from datetime import timedelta

from django.db import transaction
from django.utils import timezone

from core.exceptions import DomainError
from core.services.events import NotifySpec, emit_event
from finance.services import PlanFeeService
from mobility.models import Subscription
from mobility.services.plans.discounts import DiscountService
from mobility.services.plans.helpers import (
    apply_queued_plan,
    duration_days,
    owner_user,
    require_wallet_pin,
    vehicle_count,
)
from mobility.services.plans.pricing import PricingService


def renew(
    *,
    subscription: Subscription,
    actor=None,
    discount_code: str = "",
    idempotency_key: str = "",
    channel: str = "App",
    pin_grant: str = "",
    skip_pin: bool = False,
) -> Subscription:
    """Charge for the next period at live price; apply any queued plan first."""
    key = (idempotency_key or "").strip()
    if key:
        existing = Subscription.objects.filter(idempotency_key=key).first()
        if existing is not None:
            return existing

    with transaction.atomic():
        sub = (
            Subscription.objects.select_for_update(of=("self",))
            .select_related(
                "plan",
                "queued_plan",
                "vehicle",
                "vehicle__vehicle_model",
                "account",
            )
            .get(pk=subscription.pk)
        )
        if sub.status not in {
            Subscription.Status.ACTIVE,
            Subscription.Status.EXPIRED,
            Subscription.Status.LAPSED_TO_PPS,
        }:
            raise DomainError(
                "INVALID_TRANSITION",
                f"Cannot renew subscription in status {sub.status}.",
                http=409,
            )

        require_wallet_pin(
            account=sub.account, pin_grant=pin_grant, skip_pin=skip_pin
        )

        switched = apply_queued_plan(sub)
        plan = sub.plan
        list_price = PricingService.resolve_plan_list_kobo(
            vehicle_type=sub.vehicle.vehicle_model.vehicle_type, period=plan.period
        )
        discount_kobo, due, code = 0, list_price, (discount_code or "").strip()
        if code:
            quote = DiscountService.quote(
                code=code,
                list_price_kobo=list_price,
                period=plan.period,
                channel=channel,
                plan=plan,
                vehicle_count=vehicle_count(sub.account),
            )
            discount_kobo, due = quote.discount_kobo, quote.due_kobo

        pay_key = f"renew:{key}" if key else f"renew:{sub.id}:{timezone.now().timestamp()}"
        payment = PlanFeeService.debit(
            account=sub.account,
            amount_kobo=due,
            idempotency_key=pay_key[:64],
        )

        now = timezone.now()
        base = sub.ends_at if sub.ends_at > now else now
        days = duration_days(plan)
        before = {
            "status": sub.status,
            "ends_at": sub.ends_at.isoformat(),
            "plan_id": str(sub.plan_id),
        }
        sub.starts_at = now if sub.status != Subscription.Status.ACTIVE else sub.starts_at
        sub.ends_at = base + timedelta(days=days)
        sub.status = Subscription.Status.ACTIVE
        if not switched:
            sub.swaps_used = 0
            sub.swaps_allowance = plan.swap_allowance
        sub.payment = payment
        sub.list_price_kobo = list_price
        sub.discount_kobo = discount_kobo
        sub.amount_kobo = due
        sub.discount_code = code.upper() if code else ""
        if key:
            sub.idempotency_key = key
        sub.save(
            update_fields=[
                "plan",
                "queued_plan",
                "starts_at",
                "ends_at",
                "status",
                "swaps_used",
                "swaps_allowance",
                "payment",
                "list_price_kobo",
                "discount_kobo",
                "amount_kobo",
                "discount_code",
                "idempotency_key",
                "updated_at",
            ]
        )
        if code:
            DiscountService.consume(
                code=code,
                list_price_kobo=list_price,
                period=plan.period,
                channel=channel,
                account=sub.account,
                plan=plan,
                vehicle_count=vehicle_count(sub.account),
                payment=payment,
                subscription=sub,
                idempotency_key=f"disc:{key}" if key else f"disc-renew:{payment.id}",
            )

        owner = owner_user(sub.account)
        after = {
            "status": sub.status,
            "ends_at": sub.ends_at.isoformat(),
            "amount_kobo": due,
            "plan_id": str(sub.plan_id),
            "queued_applied": switched,
        }
        emit_event(
            action="subscription.renewed",
            subject_type="subscription",
            subject_id=str(sub.id),
            actor=actor or owner,
            before=before,
            after=after,
            notify=NotifySpec(
                user=owner,
                title="Plan renewed",
                body=f"{plan.name} now runs until {sub.ends_at.date()}.",
                source="Billing",
                template_code="plan.renewed",
                link_path="/plans",
                dedupe_key=f"sub-renewed:{sub.id}:{payment.id}",
            )
            if owner
            else None,
        )
        return sub
