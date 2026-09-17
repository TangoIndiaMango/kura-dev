"""Buy a plan with wallet debit and activate the subscription."""
from __future__ import annotations

from datetime import timedelta

from django.db import IntegrityError, transaction
from django.utils import timezone

from core.exceptions import DomainError
from core.services.events import NotifySpec, emit_event
from finance.services import PlanFeeService
from mobility.models import Plan, Subscription, Vehicle
from mobility.services.plans.discounts import DiscountService
from mobility.services.plans.helpers import (
    duration_days,
    owner_user,
    require_wallet_pin,
    vehicle_count,
)
from mobility.services.plans.pricing import PricingService


def purchase(
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
    if plan.period == Plan.Period.SWAP or not plan.is_active:
        raise DomainError(
            "VALIDATION_ERROR", "Select an active daily, weekly, or monthly plan.", http=400
        )
    if vehicle.account_id != account.id:
        raise DomainError("FORBIDDEN", "Vehicle is not on this account.", http=403)
    if (payment_mode or "WALLET").upper() != "WALLET":
        raise DomainError(
            "VALIDATION_ERROR",
            "Only WALLET payment_mode is supported for plan purchase.",
            http=400,
        )

    key = (idempotency_key or "").strip()
    if key:
        existing = Subscription.objects.filter(idempotency_key=key).first()
        if existing is not None:
            return existing

    require_wallet_pin(account=account, pin_grant=pin_grant, skip_pin=skip_pin)

    list_price = PricingService.resolve_plan_list_kobo(
        vehicle_type=vehicle.vehicle_model.vehicle_type, period=plan.period
    )
    discount_kobo, due, code = 0, list_price, (discount_code or "").strip()

    with transaction.atomic():
        vehicle = Vehicle.objects.select_for_update().select_related(
            "vehicle_model", "account"
        ).get(pk=vehicle.pk)
        active = (
            Subscription.objects.select_for_update()
            .filter(vehicle=vehicle, status=Subscription.Status.ACTIVE)
            .first()
        )
        if active is not None:
            raise DomainError(
                "SUBSCRIPTION_ACTIVE",
                "Vehicle already has an active plan. Renew or switch instead.",
                http=409,
                details={"subscription_id": str(active.id)},
            )

        if code:
            quote = DiscountService.quote(
                code=code,
                list_price_kobo=list_price,
                period=plan.period,
                channel=channel,
                plan=plan,
                vehicle_count=vehicle_count(account),
            )
            discount_kobo, due = quote.discount_kobo, quote.due_kobo

        pay_key = (
            f"plan:{key}"
            if key
            else f"plan:{account.id}:{vehicle.id}:{plan.id}:{timezone.now().isoformat()}"
        )
        payment = PlanFeeService.debit(
            account=account,
            amount_kobo=due,
            idempotency_key=pay_key[:64],
        )

        now = timezone.now()
        days = duration_days(plan)
        renew_flag = plan.auto_renew_default if auto_renew is None else bool(auto_renew)
        try:
            sub = Subscription.objects.create(
                account=account,
                vehicle=vehicle,
                plan=plan,
                payment=payment,
                starts_at=now,
                ends_at=now + timedelta(days=days),
                swaps_used=0,
                swaps_allowance=plan.swap_allowance,
                status=Subscription.Status.ACTIVE,
                auto_renew=renew_flag,
                list_price_kobo=list_price,
                discount_kobo=discount_kobo,
                amount_kobo=due,
                discount_code=code.upper() if code else "",
                idempotency_key=key or None,
            )
        except IntegrityError:
            if key:
                existing = Subscription.objects.filter(idempotency_key=key).first()
                if existing is not None:
                    return existing
            raise DomainError(
                "SUBSCRIPTION_ACTIVE", "Vehicle already has an active plan.", http=409
            )

        if code:
            DiscountService.consume(
                code=code,
                list_price_kobo=list_price,
                period=plan.period,
                channel=channel,
                account=account,
                plan=plan,
                vehicle_count=vehicle_count(account),
                payment=payment,
                subscription=sub,
                idempotency_key=f"disc:{key}" if key else f"disc:{sub.id}",
            )

        owner = owner_user(account)
        emit_event(
            action="subscription.purchased",
            subject_type="subscription",
            subject_id=str(sub.id),
            actor=actor or owner,
            subject_label=f"{plan.name} · {vehicle.registration_plate}",
            after={
                "status": sub.status,
                "amount_kobo": due,
                "discount_kobo": discount_kobo,
                "ends_at": sub.ends_at.isoformat(),
                "payment_id": str(payment.id),
            },
            notify=NotifySpec(
                user=owner,
                title="Plan activated",
                body=f"{plan.name} is active until {sub.ends_at.date()}.",
                source="Billing",
                template_code="plan.purchased",
                link_path="/plans",
                dedupe_key=f"sub-purchased:{sub.id}",
            )
            if owner
            else None,
        )
        return sub
