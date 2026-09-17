"""Reservation create + lifecycle façade."""
from __future__ import annotations

from django.db import IntegrityError, transaction
from django.utils import timezone

from core.exceptions import DomainError
from core.ids import reservation_code
from core.services.events import NotifySpec, emit_event
from finance.services import WalletHoldService
from mobility.models import Battery, BatteryEvent, HubSlot, Reservation
from mobility.services.batteries.custody import record_battery_event
from mobility.services.batteries.unreturned import assert_no_unreturned_battery
from mobility.services.hubs.hours import assert_hub_accepts_reservations
from mobility.services.plans.pricing import PricingService
from mobility.services.reservations.lifecycle import (
    cancel_reservation,
    ensure_fresh,
    expire_reservation,
    extend_reservation,
)
from mobility.services.reservations.qr_token import issue_reservation_qr
from notifications.models import Notification


class ReservationService:
    cancel_reservation = staticmethod(cancel_reservation)
    expire_reservation = staticmethod(expire_reservation)
    ensure_fresh = staticmethod(ensure_fresh)
    extend_reservation = staticmethod(extend_reservation)

    @staticmethod
    def create_reservation(
        *,
        account,
        vehicle,
        driver,
        hub,
        payment_mode: str = Reservation.PaymentMode.WALLET,
        source: str = Reservation.Source.APP,
    ) -> Reservation:
        mode = (payment_mode or Reservation.PaymentMode.WALLET).upper()
        vehicle_type = vehicle.vehicle_model.vehicle_type
        hold_policy = PricingService.get_hold_policy()
        hold_minutes = hold_policy.default_hold_minutes
        fee = 0
        if mode == Reservation.PaymentMode.WALLET:
            fee = PricingService.resolve_pps_kobo(vehicle_type=vehicle_type)

        with transaction.atomic():
            existing = (
                Reservation.objects.select_for_update()
                .filter(
                    vehicle=vehicle,
                    status__in=[
                        Reservation.Status.PENDING,
                        Reservation.Status.CONFIRMED,
                    ],
                    expires_at__gt=timezone.now(),
                )
                .first()
            )
            if existing:
                return existing

            if account.status != account.Status.ACTIVE:
                raise DomainError(
                    "ACCOUNT_RESTRICTED",
                    "Account cannot reserve while not ACTIVE.",
                    http=409,
                )
            from mobility.services.swap.recovery import clear_incomplete_swaps_for_vehicle

            clear_incomplete_swaps_for_vehicle(
                vehicle=vehicle,
                actor=getattr(driver, "user", None),
            )
            assert_no_unreturned_battery(account=account)
            assert_hub_accepts_reservations(hub)

            if mode == Reservation.PaymentMode.PLAN:
                from mobility.services.plans.entitlements import assert_plan_covers_swap

                assert_plan_covers_swap(vehicle=vehicle)

            if mode == Reservation.PaymentMode.CREDIT:
                from core.services.config import ConfigService
                from credit.services.loans import LoanService

                ConfigService.require_enabled("credit")
                available = LoanService.active_swap_credit_kobo(account)
                fee_needed = PricingService.resolve_pps_kobo(vehicle_type=vehicle_type)
                if available < fee_needed:
                    raise DomainError(
                        "CREDIT_INSUFFICIENT",
                        "Swap credit remaining is less than the swap fee.",
                        details={
                            "available_kobo": available,
                            "shortfall_kobo": fee_needed - available,
                        },
                        http=409,
                    )

            ready_slot = (
                HubSlot.objects.select_for_update()
                .filter(
                    hub=hub,
                    state=HubSlot.State.READY,
                    battery__status=Battery.Status.AVAILABLE,
                )
                .select_related("battery", "battery__battery_type")
            )
            vehicle_bt = getattr(vehicle.vehicle_model, "battery_type_id", None)
            if vehicle_bt:
                ready_slot = ready_slot.filter(battery__battery_type_id=vehicle_bt)
            ready_slot = ready_slot.first()
            if ready_slot is None or ready_slot.battery is None:
                raise DomainError(
                    "NO_BATTERY_AVAILABLE",
                    (
                        "No ready battery of this vehicle’s type at this hub."
                        if vehicle_bt
                        else "No ready battery at this hub."
                    ),
                    http=409,
                )

            battery = ready_slot.battery
            from_type, from_id = battery.custodian_type, battery.custodian_id
            battery.status = Battery.Status.RESERVED
            battery.save(update_fields=["status", "updated_at"])
            record_battery_event(
                battery=battery,
                event=BatteryEvent.Event.RESERVED,
                actor=driver.user,
                hub=hub,
                from_type=from_type,
                from_id=from_id,
                to_type=battery.custodian_type,
                to_id=battery.custodian_id,
                source=BatteryEvent.Source.APP,
            )

            expires_at = timezone.now() + timezone.timedelta(minutes=hold_minutes)
            reservation = None
            for _ in range(8):
                try:
                    with transaction.atomic():
                        reservation = Reservation.objects.create(
                            account=account,
                            vehicle=vehicle,
                            driver=driver,
                            hub=hub,
                            battery=battery,
                            code=reservation_code(),
                            payment_mode=mode,
                            hold_amount_kobo=0,
                            status=Reservation.Status.CONFIRMED,
                            expires_at=expires_at,
                            source=(source or Reservation.Source.APP).upper(),
                        )
                    break
                except IntegrityError:
                    continue
            if reservation is None:
                raise DomainError(
                    "RESERVATION_CODE_EXHAUSTED",
                    "Could not allocate a unique reservation code.",
                    http=503,
                )
            qr = issue_reservation_qr(reservation=reservation)
            reservation.save(
                update_fields=["token_hash", "token_ciphertext", "updated_at"]
            )
            reservation._qr_token = qr

            if mode == Reservation.PaymentMode.WALLET:
                WalletHoldService.hold(
                    account=account,
                    amount_kobo=fee,
                    reference=reservation.code,
                )
                reservation.hold_amount_kobo = fee
                reservation.save(update_fields=["hold_amount_kobo", "updated_at"])

            rider = getattr(account, "owner_user", None) or getattr(
                driver, "user", None
            )
            plate = getattr(vehicle, "registration_plate", "") or ""
            notify_specs: list[NotifySpec] = []
            if rider is not None:
                notify_specs.append(
                    NotifySpec(
                        user=rider,
                        title="Hold confirmed",
                        body=(
                            f"{reservation.code} at {hub.name} · "
                            f"{hold_minutes} min to arrive."
                        ),
                        source="Swaps",
                        severity=Notification.Severity.INFO,
                        channels=(Notification.Channel.IN_APP,),
                        template_code="reservation.created",
                        link_path="/swap",
                        params={
                            "reservation_id": str(reservation.id),
                            "code": reservation.code,
                            "hub_code": hub.code,
                            "hold_minutes": hold_minutes,
                        },
                        dedupe_key=f"reservation.created:{reservation.id}",
                    )
                )
            from accounts.services.memberships import users_for_hub

            agent_body = (
                f"{reservation.code} · {plate or 'vehicle'} · "
                f"{hold_minutes} min · Attend at bay"
            )
            agent_link = (
                f"/hubs/{hub.id}/swap?code={reservation.code}"
            )
            for agent in users_for_hub(hub.id):
                if rider is not None and agent.pk == rider.pk:
                    continue
                notify_specs.append(
                    NotifySpec(
                        user=agent,
                        title=f"Incoming hold · {hub.code}",
                        body=agent_body,
                        source="Swaps",
                        severity=Notification.Severity.INFO,
                        channels=(Notification.Channel.IN_APP,),
                        template_code="reservation.created.agent",
                        link_path=agent_link,
                        params={
                            "reservation_id": str(reservation.id),
                            "code": reservation.code,
                            "hub_id": str(hub.id),
                            "hub_code": hub.code,
                            "vehicle_plate": plate,
                            "hold_minutes": hold_minutes,
                        },
                        dedupe_key=(
                            f"reservation.created:{reservation.id}:agent:{agent.id}"
                        ),
                    )
                )
            emit_event(
                action="reservation.created",
                subject_type="reservation",
                subject_id=str(reservation.id),
                subject_label=reservation.code,
                actor=getattr(driver, "user", None),
                metadata={
                    "code": reservation.code,
                    "hub": hub.code,
                    "payment_mode": mode,
                    "hold_amount_kobo": reservation.hold_amount_kobo,
                    "hold_minutes": hold_minutes,
                },
                notify=notify_specs or None,
            )
            return reservation
