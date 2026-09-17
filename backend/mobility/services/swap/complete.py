"""F4 swap complete — ISSUED → COMPLETED (payment + finalize)."""
from __future__ import annotations

from django.db import transaction
from django.utils import timezone

from core.exceptions import DomainError
from core.money import split_vat_inclusive
from mobility.models import Reservation, Swap
from mobility.services.plans.pricing import PricingService
from mobility.services.swap.finalize import finalize_completed_swap
from mobility.services.swap.risk import flag_geo_impossible_if_needed
from mobility.services.swap.settle import settle_swap_payment


def complete_started_swap(
    *,
    swap: Swap,
    payment_mode: str | None = None,
    amount_kobo: int | None = None,
    rider_pin_grant: str = "",
    override: dict | None = None,
    agent=None,
) -> Swap:
    with transaction.atomic():
        locked = (
            Swap.objects.select_for_update(of=("self",))
            .select_related(
                "reservation",
                "vehicle__vehicle_model",
                "hub",
                "account",
                "account__owner_user",
                "driver",
                "driver__user",
                "issued_battery",
                "returned_battery",
            )
            .get(pk=swap.pk)
        )
        if locked.status != Swap.Status.ISSUED:
            raise DomainError(
                "INVALID_TRANSITION",
                f"Cannot complete from status {locked.status} (need ISSUED).",
                http=409,
            )
        if locked.issued_battery_id is None:
            raise DomainError(
                "INVALID_TRANSITION",
                "Issued battery missing on swap.",
                http=409,
            )

        reservation = locked.reservation
        if reservation is not None:
            reservation = Reservation.objects.select_for_update().get(
                pk=reservation.pk
            )

        mode = (
            payment_mode
            or (reservation.payment_mode if reservation else None)
            or locked.payment_mode
            or Reservation.PaymentMode.WALLET
        ).upper()

        fee_default = PricingService.resolve_pps_kobo(
            vehicle_type=locked.vehicle.vehicle_model.vehicle_type
        )
        held = int(reservation.hold_amount_kobo) if reservation else 0
        if held > 0:
            fee = held
        elif mode == Reservation.PaymentMode.PLAN:
            fee = 0
        elif mode == Reservation.PaymentMode.CASH and amount_kobo is not None:
            fee = int(amount_kobo)
        else:
            fee = fee_default if amount_kobo is None else int(amount_kobo)
        _net, vat_kobo = (0, 0) if fee <= 0 else split_vat_inclusive(fee)

        if mode == Reservation.PaymentMode.WALLET and fee > 0 and held <= 0:
            from accounts.models import Account
            from accounts.services.auth import assert_pin_grant

            account = Account.objects.select_related("owner_user").get(
                pk=locked.account_id
            )
            if account.owner_user_id is None:
                raise DomainError(
                    "PIN_GRANT_REQUIRED",
                    "Account has no owner for PIN confirmation.",
                    http=409,
                )
            assert_pin_grant(token=rider_pin_grant, user_id=account.owner_user_id)

        settled = settle_swap_payment(
            mode=mode,
            fee=fee,
            reservation=reservation,
            account_id=locked.account_id,
            vehicle=locked.vehicle,
            hub=locked.hub,
            agent=agent,
        )

        if reservation is not None:
            reservation.status = Reservation.Status.USED
            reservation.hold_amount_kobo = 0
            reservation.save(
                update_fields=["status", "hold_amount_kobo", "updated_at"]
            )

        flag_geo_impossible_if_needed(
            vehicle_id=locked.vehicle_id,
            hub=locked.hub,
            account=locked.account,
            swap_id=locked.id,
            vehicle_type=locked.vehicle.vehicle_model.vehicle_type,
        )

        locked.payment_mode = mode
        locked.amount_kobo = max(fee, 0)
        locked.vat_kobo = vat_kobo
        locked.payment = settled.payment
        locked.subscription = settled.subscription
        locked.status = Swap.Status.COMPLETED
        locked.completed_at = timezone.now()
        locked.agent = agent or locked.agent
        locked.save(
            update_fields=[
                "payment_mode",
                "amount_kobo",
                "vat_kobo",
                "payment",
                "subscription",
                "status",
                "completed_at",
                "agent",
                "updated_at",
            ]
        )

        finalize_completed_swap(
            swap=locked,
            vehicle=locked.vehicle,
            hub=locked.hub,
            returned_battery=locked.returned_battery,
            issued_battery=locked.issued_battery,
            is_mismatch=locked.mismatch_flag,
            fee=fee,
            mode=mode,
            first_swap=locked.returned_battery_id is None,
            override=override,
            agent=agent,
        )
        try:
            from credit.services.bustout import check_credit_bustout

            check_credit_bustout(account=locked.account, swap_id=locked.id)
        except Exception:
            pass
        return locked
