from django.db import transaction
from django.utils import timezone
from core.exceptions import DomainError
from core.money import split_vat
from core.models import AuditEvent
from .models import Hub, Battery, HubSlot, Vehicle, Reservation, Swap

class ReservationService:
    @staticmethod
    def create_reservation(*, account, vehicle, driver, hub, payment_mode='WALLET') -> Reservation:
        with transaction.atomic():
            # Check if vehicle already has an active reservation
            existing = Reservation.objects.filter(
                vehicle=vehicle,
                status__in=[Reservation.Status.PENDING, Reservation.Status.CONFIRMED],
                expires_at__gt=timezone.now()
            ).first()
            if existing:
                return existing

            # Find ready battery in hub
            ready_slot = HubSlot.objects.select_for_update().filter(
                hub=hub,
                state=HubSlot.State.READY,
                battery__status=Battery.Status.AVAILABLE
            ).first()

            battery = None
            if ready_slot and ready_slot.battery:
                battery = ready_slot.battery
                battery.status = Battery.Status.RESERVED
                battery.save(update_fields=['status'])

            reservation = Reservation.objects.create(
                account=account,
                vehicle=vehicle,
                driver=driver,
                hub=hub,
                battery=battery,
                payment_mode=payment_mode,
                expires_at=timezone.now() + timezone.timedelta(minutes=20)
            )

            AuditEvent.objects.create(
                actor_email=driver.user.phone or driver.user.email or 'system',
                action='reservation.created',
                target_model='Reservation',
                target_id=str(reservation.id),
                metadata={'code': reservation.code, 'hub': hub.code}
            )

            return reservation

class SwapService:
    @staticmethod
    def complete_swap(
        *,
        reservation_id=None,
        hub_id,
        vehicle_id,
        driver_id,
        account_id,
        returned_battery_serial,
        issued_battery_serial,
        returned_charge_pct=15,
        issued_charge_pct=100,
        amount_kobo=150000,
        agent=None
    ) -> Swap:
        with transaction.atomic():
            hub = Hub.objects.get(id=hub_id)
            vehicle = Vehicle.objects.select_for_update().get(id=vehicle_id)

            returned_battery = Battery.objects.select_for_update().filter(serial=returned_battery_serial).first()
            if not returned_battery:
                raise DomainError("BATTERY_NOT_FOUND", f"Returned battery {returned_battery_serial} not found in system.")

            issued_battery = Battery.objects.select_for_update().filter(serial=issued_battery_serial).first()
            if not issued_battery:
                raise DomainError("BATTERY_NOT_FOUND", f"Issued battery {issued_battery_serial} not found in system.")

            # Return-matching check
            is_mismatch = False
            if vehicle.current_battery and vehicle.current_battery.id != returned_battery.id:
                is_mismatch = True

            # Calculate VAT
            net_kobo, vat_kobo = split_vat(amount_kobo)

            reservation = None
            if reservation_id:
                reservation = Reservation.objects.select_for_update().filter(id=reservation_id).first()
                if reservation:
                    reservation.status = Reservation.Status.USED
                    reservation.save(update_fields=['status'])

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
                amount_kobo=amount_kobo,
                vat_kobo=vat_kobo,
                mismatch_flag=is_mismatch,
                status=Swap.Status.COMPLETED
            )

            # Update battery states
            returned_battery.status = Battery.Status.CHARGING
            returned_battery.charge_pct = returned_charge_pct
            returned_battery.current_hub = hub
            returned_battery.cycle_count += 1
            returned_battery.save(update_fields=['status', 'charge_pct', 'current_hub', 'cycle_count'])

            issued_battery.status = Battery.Status.ISSUED
            issued_battery.charge_pct = issued_charge_pct
            issued_battery.current_hub = None
            issued_battery.save(update_fields=['status', 'charge_pct', 'current_hub'])

            # Update slot if returned battery placed in an empty slot
            empty_slot = HubSlot.objects.filter(hub=hub, battery__isnull=True).first()
            if empty_slot:
                empty_slot.battery = returned_battery
                empty_slot.state = HubSlot.State.CHARGING
                empty_slot.save(update_fields=['battery', 'state'])

            # Release issued battery from its slot if it was attached
            if hasattr(issued_battery, 'current_slot') and issued_battery.current_slot:
                slot = issued_battery.current_slot
                slot.battery = None
                slot.state = HubSlot.State.EMPTY
                slot.save(update_fields=['battery', 'state'])

            # Update vehicle with newly issued battery
            vehicle.current_battery = issued_battery
            vehicle.save(update_fields=['current_battery'])

            # Log audit
            actor_email = agent.email if agent else 'system'
            AuditEvent.objects.create(
                actor_email=actor_email,
                action='swap.completed',
                target_model='Swap',
                target_id=str(swap.id),
                metadata={
                    'vehicle': vehicle.registration_plate,
                    'returned': returned_battery.serial,
                    'issued': issued_battery.serial,
                    'mismatch': is_mismatch,
                    'amount_kobo': amount_kobo,
                }
            )

            return swap
