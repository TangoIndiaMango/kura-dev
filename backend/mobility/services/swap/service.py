from __future__ import annotations

from django.db import transaction
from django.utils import timezone

from core.exceptions import DomainError
from core.money import split_vat_inclusive
from mobility.models import Battery, Hub, Reservation, Swap, Vehicle
from mobility.services.plans.pricing import PricingService
from mobility.services.swap.abort import abort_swap
from mobility.services.swap.complete import complete_started_swap
from mobility.services.swap.custody import apply_swap_battery_custody
from mobility.services.swap.finalize import finalize_completed_swap
from mobility.services.swap.issue import issue_battery
from mobility.services.swap.return_ import record_return
from mobility.services.swap.reverse import reverse_swap
from mobility.services.swap.risk import (
    assert_swap_velocity,
    flag_geo_impossible_if_needed,
)
from mobility.services.swap.settle import settle_swap_payment
from mobility.services.swap.start import start_swap


class SwapService:
    start = staticmethod(start_swap)
    record_return = staticmethod(record_return)
    issue = staticmethod(issue_battery)
    abort = staticmethod(abort_swap)
    complete_session = staticmethod(complete_started_swap)
    reverse = staticmethod(reverse_swap)

    @staticmethod
    def complete_swap(
        *,
        reservation_id=None,
        hub_id,
        vehicle_id,
        driver_id,
        account_id,
        returned_battery_serial: str | None = None,
        issued_battery_serial: str = "",
        returned_charge_pct=15,
        issued_charge_pct=100,
        amount_kobo: int | None = None,
        payment_mode: str | None = None,
        rider_pin_grant: str = "",
        override: dict | None = None,
        agent=None,
    ) -> Swap:
        """Legacy one-shot complete (tests + older clients). Prefer session steps."""
        from accounts.models import Account

        if not (issued_battery_serial or "").strip():
            raise DomainError(
                "VALIDATION_ERROR",
                "issued_battery_serial is required.",
                details={"issued_battery_serial": ["required"]},
            )
        # Velocity BLOCK must commit RiskEvent outside the write txn (rollback-safe).
        assert_swap_velocity(
            vehicle_id=vehicle_id,
            account=Account.objects.filter(pk=account_id).first(),
        )

        with transaction.atomic():
            hub = Hub.objects.get(id=hub_id)
            vehicle = Vehicle.objects.select_for_update().select_related(
                "vehicle_model"
            ).get(id=vehicle_id)
            fee_default = PricingService.resolve_pps_kobo(
                vehicle_type=vehicle.vehicle_model.vehicle_type
            )

            returned_serial = (returned_battery_serial or "").strip()
            first_swap = vehicle.current_battery_id is None

            returned_battery = None
            if returned_serial:
                returned_battery = (
                    Battery.objects.select_for_update()
                    .filter(serial=returned_serial)
                    .first()
                )
                if not returned_battery:
                    raise DomainError(
                        "BATTERY_NOT_FOUND",
                        f"Returned battery {returned_serial} not found.",
                    )
            elif not first_swap:
                raise DomainError(
                    "RETURN_REQUIRED",
                    "This vehicle has a pack on it — scan the returned battery.",
                    http=409,
                )

            issued_battery = (
                Battery.objects.select_for_update()
                .filter(serial=issued_battery_serial)
                .first()
            )
            if not issued_battery:
                raise DomainError(
                    "BATTERY_NOT_FOUND",
                    f"Issued battery {issued_battery_serial} not found.",
                )

            is_mismatch = bool(
                returned_battery is not None
                and vehicle.current_battery_id
                and vehicle.current_battery_id != returned_battery.id
            )

            reservation = None
            if reservation_id:
                reservation = (
                    Reservation.objects.select_for_update()
                    .select_related("account")
                    .filter(id=reservation_id)
                    .first()
                )
                if reservation is None:
                    raise DomainError("NOT_FOUND", "Reservation not found.", http=404)
                from mobility.services.reservations.service import ReservationService

                reservation = ReservationService.ensure_fresh(reservation=reservation)
                if reservation.status == Reservation.Status.EXPIRED:
                    raise DomainError(
                        "RESERVATION_EXPIRED",
                        "This reservation has expired.",
                        http=409,
                    )
                if reservation.status == Reservation.Status.USED:
                    raise DomainError(
                        "INVALID_TRANSITION",
                        "Reservation already used.",
                        http=409,
                    )
                if reservation.status not in {
                    Reservation.Status.CONFIRMED,
                    Reservation.Status.PENDING,
                }:
                    raise DomainError(
                        "INVALID_TRANSITION",
                        f"Reservation status {reservation.status} cannot complete.",
                        http=409,
                    )

            mode = (
                payment_mode
                or (reservation.payment_mode if reservation else None)
                or Reservation.PaymentMode.WALLET
            ).upper()

            held = int(reservation.hold_amount_kobo) if reservation else 0
            if held > 0:
                fee = held
            elif mode == Reservation.PaymentMode.PLAN:
                fee = 0
            elif mode == Reservation.PaymentMode.CASH and amount_kobo is not None:
                fee = int(amount_kobo)
            else:
                fee = fee_default if amount_kobo is None else int(amount_kobo)
            _net_kobo, vat_kobo = (0, 0) if fee <= 0 else split_vat_inclusive(fee)

            account = Account.objects.filter(pk=account_id).first()
            if mode == Reservation.PaymentMode.WALLET and fee > 0 and held <= 0:
                from accounts.services.auth import assert_pin_grant

                account = Account.objects.select_related("owner_user").get(pk=account_id)
                if account.owner_user_id is None:
                    raise DomainError(
                        "PIN_GRANT_REQUIRED",
                        "Account has no owner for PIN confirmation.",
                        http=409,
                    )
                assert_pin_grant(
                    token=rider_pin_grant, user_id=account.owner_user_id
                )

            flag_geo_impossible_if_needed(
                vehicle_id=vehicle.id,
                hub=hub,
                account=account,
                vehicle_type=vehicle.vehicle_model.vehicle_type,
            )

            settled = settle_swap_payment(
                mode=mode,
                fee=fee,
                reservation=reservation,
                account_id=account_id,
                vehicle=vehicle,
                hub=hub,
                agent=agent,
            )

            if reservation:
                reservation.status = Reservation.Status.USED
                reservation.hold_amount_kobo = 0
                reservation.save(
                    update_fields=["status", "hold_amount_kobo", "updated_at"]
                )

            now = timezone.now()
            swap_source = (
                reservation.source
                if reservation is not None
                else Swap.Source.HUB_APP
            )
            swap = Swap.objects.create(
                reservation=reservation,
                account_id=account_id,
                vehicle=vehicle,
                driver_id=driver_id,
                hub=hub,
                agent=agent,
                returned_battery=returned_battery,
                returned_charge_pct=returned_charge_pct,
                issued_battery=issued_battery,
                issued_charge_pct=issued_charge_pct,
                payment_mode=mode,
                payment=settled.payment,
                subscription=settled.subscription,
                source=swap_source,
                amount_kobo=max(fee, 0),
                vat_kobo=vat_kobo,
                mismatch_flag=is_mismatch,
                status=Swap.Status.COMPLETED,
                started_at=now,
                completed_at=now,
            )

            apply_swap_battery_custody(
                hub=hub,
                vehicle=vehicle,
                returned_battery=returned_battery,
                issued_battery=issued_battery,
                returned_charge_pct=returned_charge_pct,
                issued_charge_pct=issued_charge_pct,
                swap=swap,
                is_mismatch=is_mismatch,
                agent=agent,
                first_swap=first_swap and returned_battery is None,
            )

            finalize_completed_swap(
                swap=swap,
                vehicle=vehicle,
                hub=hub,
                returned_battery=returned_battery,
                issued_battery=issued_battery,
                is_mismatch=is_mismatch,
                fee=fee,
                mode=mode,
                first_swap=first_swap and returned_battery is None,
                override=override,
                agent=agent,
            )
            return swap
