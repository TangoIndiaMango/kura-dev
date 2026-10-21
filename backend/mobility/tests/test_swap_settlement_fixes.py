"""Booking discounts at the bay, per-swap cash deposits, reserved-pack release."""
from __future__ import annotations

from django.test import TestCase
from django.utils import timezone

from accounts.models import Account, Driver, User
from core.exceptions import DomainError
from finance.services import WalletService
from mobility.models import (
    Battery,
    BatteryType,
    DiscountCampaign,
    DiscountRedemption,
    Hub,
    HubSlot,
    Reservation,
    Swap,
    Vehicle,
    VehicleModel,
    VehicleType,
)
from mobility.services import PricingService, ReservationService
from mobility.services.swap.abort import abort_swap
from mobility.services.swap.complete import complete_started_swap
from mobility.services.swap.issue import issue_battery
from mobility.services.swap.lifecycle import release_orphaned_reserved_batteries
from mobility.services.swap.settle import settle_swap_payment
from operations.models import CashDeposit


class SwapSettlementFixTests(TestCase):
    def setUp(self):
        PricingService.ensure_defaults()
        self.pps = PricingService.resolve_pps_kobo(vehicle_type=VehicleType.MOTORCYCLE)
        self.user = User.objects.create(phone="+2348015558801", role=User.Role.DRIVER)
        self.account = Account.objects.create(
            owner_user=self.user, display_name="Fleet", status=Account.Status.ACTIVE
        )
        self.driver = Driver.objects.create(user=self.user, account=self.account)
        WalletService.get_or_create_wallet(self.account)
        WalletService.fund_wallet(
            account=self.account,
            amount_kobo=500_000,
            channel="CARD",
            psp_reference="settle-fix-fund",
        )
        self.agent = User.objects.create(
            phone="+2348015558802", role=User.Role.HUB_AGENT
        )
        self.bt = BatteryType.objects.create(name="72V", manufacturer="KURA")
        self.hub = Hub.objects.create(code="HUB-SFX", name="Fix Hub", address="Lagos")
        self.packs = []
        for i in range(3):
            pack = Battery.objects.create(
                serial=f"SFX-R{i}",
                battery_type=self.bt,
                status=Battery.Status.AVAILABLE,
                charge_pct=100,
                current_hub=self.hub,
            )
            HubSlot.objects.create(
                hub=self.hub, slot_no=i + 1, battery=pack, state=HubSlot.State.READY
            )
            self.packs.append(pack)
        self.model = VehicleModel.objects.create(
            make="Kura", model="City", battery_type=self.bt
        )
        self.vehicle = self._vehicle("SFX-001")

    def _vehicle(self, plate):
        return Vehicle.objects.create(
            account=self.account, vehicle_model=self.model, registration_plate=plate
        )

    def _discount(self, code, pct):
        DiscountCampaign.objects.create(
            name=code,
            code=code,
            value_type=DiscountCampaign.ValueType.PERCENT,
            value=pct,
            status=DiscountCampaign.Status.ACTIVE,
            applies_to_all_plans=True,
            periods=["swap"],
            channels="App · Hub",
        )

    def _book(self, mode, code=""):
        return ReservationService.create_reservation(
            account=self.account,
            vehicle=self.vehicle,
            driver=self.driver,
            hub=self.hub,
            payment_mode=mode,
            discount_code=code,
        )

    def _issued_swap(self, reservation, pack, cid):
        return Swap.objects.create(
            reservation=reservation,
            account=self.account,
            vehicle=self.vehicle,
            driver=self.driver,
            hub=self.hub,
            agent=self.agent,
            status=Swap.Status.ISSUED,
            payment_mode=reservation.payment_mode,
            issued_battery=pack,
            started_at=timezone.now(),
            client_event_id=cid,
        )

    def test_discounted_cash_booking_charges_booked_price_at_bay(self):
        self._discount("SFX10", 10)
        rsv = self._book(Reservation.PaymentMode.CASH, "SFX10")
        swap = self._issued_swap(rsv, rsv.battery, "sfx-cash-1")
        # Bay still sends the list price; the booked price wins.
        done = complete_started_swap(swap=swap, amount_kobo=self.pps, agent=self.agent)
        due = self.pps - rsv.discount_kobo
        self.assertEqual(done.amount_kobo, due)
        self.assertEqual(
            CashDeposit.objects.get(payment=done.payment).amount_kobo, due
        )

    def test_full_discount_wallet_booking_holds_nothing_and_completes_free(self):
        self._discount("SFX100", 100)
        rsv = self._book(Reservation.PaymentMode.WALLET, "SFX100")
        self.assertEqual(rsv.hold_amount_kobo, 0)
        swap = self._issued_swap(rsv, rsv.battery, "sfx-free-1")
        done = complete_started_swap(swap=swap, agent=self.agent)
        self.assertEqual(done.amount_kobo, 0)
        self.assertIsNone(done.payment)

    def test_walkin_cash_deposits_are_per_swap(self):
        common = dict(
            mode="CASH",
            fee=self.pps,
            reservation=None,
            account_id=self.account.id,
            hub=self.hub,
            agent=self.agent,
        )
        first = settle_swap_payment(vehicle=self.vehicle, swap_key="swap-a", **common)
        second = settle_swap_payment(
            vehicle=self._vehicle("SFX-002"), swap_key="swap-b", **common
        )
        self.assertEqual(CashDeposit.objects.count(), 2)
        self.assertNotEqual(first.payment.pk, second.payment.pk)
        retry = settle_swap_payment(vehicle=self.vehicle, swap_key="swap-a", **common)
        self.assertEqual(retry.payment.pk, first.payment.pk)

    def test_complete_with_other_pack_releases_reserved_pack(self):
        rsv = self._book(Reservation.PaymentMode.CASH)
        other = next(p for p in self.packs if p.pk != rsv.battery_id)
        swap = self._issued_swap(rsv, other, "sfx-other-1")
        complete_started_swap(swap=swap, amount_kobo=self.pps, agent=self.agent)
        rsv.battery.refresh_from_db()
        self.assertEqual(rsv.battery.status, Battery.Status.AVAILABLE)

    def test_abort_releases_reserved_pack_and_discount(self):
        self._discount("SFX10", 10)
        rsv = self._book(Reservation.PaymentMode.CASH, "SFX10")
        swap = Swap.objects.create(
            reservation=rsv,
            account=self.account,
            vehicle=self.vehicle,
            driver=self.driver,
            hub=self.hub,
            status=Swap.Status.STARTED,
            payment_mode=rsv.payment_mode,
            started_at=timezone.now(),
            client_event_id="sfx-abort-1",
        )
        abort_swap(swap=swap, agent=self.agent)
        rsv.battery.refresh_from_db()
        self.assertEqual(rsv.battery.status, Battery.Status.AVAILABLE)
        self.assertFalse(
            DiscountRedemption.objects.filter(
                idempotency_key=f"reservation:{rsv.id}"
            ).exists()
        )

    def test_issue_refuses_pack_reserved_for_another_hold(self):
        rsv = self._book(Reservation.PaymentMode.CASH)
        swap = Swap.objects.create(
            reservation=None,
            account=self.account,
            vehicle=self._vehicle("SFX-003"),
            driver=self.driver,
            hub=self.hub,
            status=Swap.Status.STARTED,
            payment_mode="CASH",
            started_at=timezone.now(),
            client_event_id="sfx-walkin-1",
        )
        with self.assertRaises(DomainError) as ctx:
            issue_battery(swap=swap, battery_serial=rsv.battery.serial)
        self.assertEqual(ctx.exception.code, "BATTERY_NOT_AVAILABLE")

    def test_sweep_frees_orphaned_reserved_packs_only(self):
        rsv = self._book(Reservation.PaymentMode.CASH)
        orphan = next(p for p in self.packs if p.pk != rsv.battery_id)
        Battery.objects.filter(pk=orphan.pk).update(status=Battery.Status.RESERVED)
        self.assertEqual(release_orphaned_reserved_batteries(), 1)
        orphan.refresh_from_db()
        rsv.battery.refresh_from_db()
        self.assertEqual(orphan.status, Battery.Status.AVAILABLE)
        self.assertEqual(rsv.battery.status, Battery.Status.RESERVED)
