"""Swap discount codes end-to-end: booking consume, cancel release, server PPS."""
from __future__ import annotations

from django.test import TestCase
from rest_framework.test import APIClient

from accounts.models import Account, Driver, User
from finance.models import Wallet
from finance.services import WalletService
from mobility.models import (
    Battery,
    BatteryType,
    DiscountCampaign,
    DiscountRedemption,
    Hub,
    HubSlot,
    Reservation,
    Vehicle,
    VehicleModel,
    VehicleType,
)
from mobility.services import PricingService, ReservationService


class ReservationDiscountTests(TestCase):
    def setUp(self):
        PricingService.ensure_defaults()
        self.pps = PricingService.resolve_pps_kobo(vehicle_type=VehicleType.MOTORCYCLE)

        self.user = User.objects.create(
            phone="+2348015550001",
            role=User.Role.DRIVER,
            first_name="Disc",
            last_name="Rider",
        )
        self.account = Account.objects.create(
            owner_user=self.user,
            display_name="Disc Rider",
            status=Account.Status.ACTIVE,
        )
        self.driver = Driver.objects.create(user=self.user, account=self.account)
        self.wallet = WalletService.get_or_create_wallet(self.account)
        WalletService.fund_wallet(
            account=self.account,
            amount_kobo=500_000,
            channel="CARD",
            psp_reference="fund-disc-1",
        )

        self.battery_type = BatteryType.objects.create(name="72V", manufacturer="KURA")
        self.hub = Hub.objects.create(code="HUB-DISC-01", name="Disc Hub", address="Lagos")
        self.ready = Battery.objects.create(
            serial="BAT-D-READY",
            battery_type=self.battery_type,
            status=Battery.Status.AVAILABLE,
            charge_pct=100,
            current_hub=self.hub,
        )
        HubSlot.objects.create(
            hub=self.hub, slot_no=1, battery=self.ready, state=HubSlot.State.READY
        )
        model = VehicleModel.objects.create(
            make="Kura", model="City", battery_type=self.battery_type
        )
        self.vehicle = Vehicle.objects.create(
            account=self.account,
            vehicle_model=model,
            registration_plate="DSC-001",
            current_battery=Battery.objects.create(
                serial="BAT-D-MOUNT",
                battery_type=self.battery_type,
                status=Battery.Status.ISSUED,
                charge_pct=20,
            ),
        )
        self.discount = DiscountCampaign.objects.create(
            name="Swap 10",
            code="SWAP-10",
            value_type=DiscountCampaign.ValueType.PERCENT,
            value=10,
            status=DiscountCampaign.Status.ACTIVE,
            applies_to_all_plans=True,
            periods=["swap"],
            channels="App · Hub",
        )

    def test_booking_applies_discount_and_holds_due_only(self):
        reservation = ReservationService.create_reservation(
            account=self.account,
            vehicle=self.vehicle,
            driver=self.driver,
            hub=self.hub,
            payment_mode=Reservation.PaymentMode.WALLET,
            discount_code="swap-10",
        )
        expected_off = self.pps * 10 // 100
        self.assertEqual(reservation.list_price_kobo, self.pps)
        self.assertEqual(reservation.discount_code, "SWAP-10")
        self.assertEqual(reservation.discount_kobo, expected_off)
        self.assertEqual(reservation.hold_amount_kobo, self.pps - expected_off)
        self.wallet.refresh_from_db()
        self.assertEqual(self.wallet.hold_kobo, self.pps - expected_off)
        self.discount.refresh_from_db()
        self.assertEqual(self.discount.redemptions_count, 1)
        self.assertTrue(
            DiscountRedemption.objects.filter(
                discount=self.discount, account=self.account
            ).exists()
        )

    def test_cancel_releases_redemption(self):
        reservation = ReservationService.create_reservation(
            account=self.account,
            vehicle=self.vehicle,
            driver=self.driver,
            hub=self.hub,
            payment_mode=Reservation.PaymentMode.WALLET,
            discount_code="SWAP-10",
        )
        ReservationService.cancel_reservation(reservation=reservation)
        self.discount.refresh_from_db()
        self.assertEqual(self.discount.redemptions_count, 0)
        self.assertFalse(DiscountRedemption.objects.exists())
        self.wallet.refresh_from_db()
        self.assertEqual(self.wallet.hold_kobo, 0)

    def test_bay_consume_for_swap_reduces_fee(self):
        from mobility.services.plans.discounts import DiscountService

        fee, quote = DiscountService.consume_for_swap(
            code="SWAP-10",
            reservation=None,
            held_kobo=0,
            mode="CASH",
            fee_kobo=self.pps,
            list_price_kobo=self.pps,
            account=self.account,
            idempotency_key="swap:test-bay-1",
        )
        self.assertIsNotNone(quote)
        self.assertEqual(fee, self.pps - (self.pps * 10 // 100))
        self.discount.refresh_from_db()
        self.assertEqual(self.discount.redemptions_count, 1)

    def test_vehicle_list_exposes_server_pay_per_swap(self):
        client = APIClient()
        client.force_authenticate(user=self.user)
        res = client.get("/api/v1/mobility/vehicles/")
        self.assertEqual(res.status_code, 200, res.content)
        rows = res.json()["results"]
        mine = next(r for r in rows if r["id"] == str(self.vehicle.id))
        self.assertEqual(mine["pay_per_swap_kobo"], self.pps)
        wallet = Wallet.objects.get(pk=self.wallet.pk)
        self.assertEqual(wallet.hold_kobo, 0)
