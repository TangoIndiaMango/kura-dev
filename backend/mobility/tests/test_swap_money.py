from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from accounts.models import Account, Driver, User
from accounts.services.auth import issue_tokens
from core.exceptions import DomainError
from finance.models import Payment, Wallet
from finance.services import WalletService
from mobility.models import (
    Battery,
    BatteryType,
    Hub,
    HubSlot,
    Reservation,
    Vehicle,
    VehicleModel,
    VehicleType,
)
from mobility.services import PricingService, ReservationService, SwapService


class SwapMoneyPathTests(TestCase):
    def setUp(self):
        PricingService.ensure_defaults()
        self.pps = PricingService.resolve_pps_kobo(vehicle_type=VehicleType.MOTORCYCLE)

        self.user = User.objects.create(
            phone="+2348014440001",
            role=User.Role.DRIVER,
            first_name="Money",
            last_name="Rider",
        )
        self.account = Account.objects.create(
            owner_user=self.user,
            display_name="Money Rider",
            status=Account.Status.ACTIVE,
        )
        self.driver = Driver.objects.create(user=self.user, account=self.account)
        self.wallet = WalletService.get_or_create_wallet(self.account)
        WalletService.fund_wallet(
            account=self.account,
            amount_kobo=500_000,
            channel="CARD",
            psp_reference="fund-money-path-1",
        )
        self.wallet.refresh_from_db()

        self.battery_type = BatteryType.objects.create(name="72V", manufacturer="KURA")
        self.hub = Hub.objects.create(
            code="HUB-MONEY-01", name="Money Hub", address="Lagos"
        )
        self.mounted = Battery.objects.create(
            serial="BAT-M-MOUNT",
            battery_type=self.battery_type,
            status=Battery.Status.ISSUED,
            charge_pct=20,
        )
        self.ready = Battery.objects.create(
            serial="BAT-M-READY",
            battery_type=self.battery_type,
            status=Battery.Status.AVAILABLE,
            charge_pct=100,
            current_hub=self.hub,
        )
        HubSlot.objects.create(
            hub=self.hub,
            slot_no=1,
            battery=self.ready,
            state=HubSlot.State.READY,
        )
        model = VehicleModel.objects.create(
            make="Kura", model="City", battery_type=self.battery_type
        )
        self.vehicle = Vehicle.objects.create(
            account=self.account,
            vehicle_model=model,
            registration_plate="MNY-001",
            current_battery=self.mounted,
        )

    def test_reserve_holds_wallet_and_cancel_releases(self):
        before = Wallet.objects.get(pk=self.wallet.pk)
        reservation = ReservationService.create_reservation(
            account=self.account,
            vehicle=self.vehicle,
            driver=self.driver,
            hub=self.hub,
            payment_mode=Reservation.PaymentMode.WALLET,
        )
        self.wallet.refresh_from_db()
        self.assertEqual(reservation.hold_amount_kobo, self.pps)
        self.assertEqual(self.wallet.hold_kobo, before.hold_kobo + self.pps)
        self.assertEqual(self.wallet.balance_kobo, before.balance_kobo)

        ReservationService.cancel_reservation(reservation=reservation)
        self.wallet.refresh_from_db()
        reservation.refresh_from_db()
        self.assertEqual(reservation.status, Reservation.Status.CANCELLED)
        self.assertEqual(reservation.hold_amount_kobo, 0)
        self.assertEqual(self.wallet.hold_kobo, before.hold_kobo)
        self.assertEqual(self.wallet.balance_kobo, before.balance_kobo)

    def test_insufficient_balance_blocks_reservation(self):
        thin_user = User.objects.create(phone="+2348014440099", role=User.Role.DRIVER)
        thin_account = Account.objects.create(
            owner_user=thin_user,
            display_name="Thin",
            status=Account.Status.ACTIVE,
        )
        thin_driver = Driver.objects.create(user=thin_user, account=thin_account)
        WalletService.get_or_create_wallet(thin_account)
        ready2 = Battery.objects.create(
            serial="BAT-M-READY-2",
            battery_type=self.battery_type,
            status=Battery.Status.AVAILABLE,
            charge_pct=100,
            current_hub=self.hub,
        )
        HubSlot.objects.create(
            hub=self.hub, slot_no=2, battery=ready2, state=HubSlot.State.READY
        )
        vehicle2 = Vehicle.objects.create(
            account=thin_account,
            vehicle_model=self.vehicle.vehicle_model,
            registration_plate="MNY-THIN",
            current_battery=Battery.objects.create(
                serial="BAT-M-THIN",
                battery_type=self.battery_type,
                status=Battery.Status.ISSUED,
            ),
        )
        with self.assertRaises(DomainError) as ctx:
            ReservationService.create_reservation(
                account=thin_account,
                vehicle=vehicle2,
                driver=thin_driver,
                hub=self.hub,
                payment_mode=Reservation.PaymentMode.WALLET,
            )
        self.assertEqual(ctx.exception.code, "WALLET_INSUFFICIENT")

    def test_complete_captures_hold(self):
        reservation = ReservationService.create_reservation(
            account=self.account,
            vehicle=self.vehicle,
            driver=self.driver,
            hub=self.hub,
            payment_mode=Reservation.PaymentMode.WALLET,
        )
        before_balance = Wallet.objects.get(pk=self.wallet.pk).balance_kobo
        swap = SwapService.complete_swap(
            reservation_id=reservation.id,
            hub_id=self.hub.id,
            vehicle_id=self.vehicle.id,
            driver_id=self.driver.id,
            account_id=self.account.id,
            returned_battery_serial="BAT-M-MOUNT",
            issued_battery_serial="BAT-M-READY",
        )
        self.wallet.refresh_from_db()
        reservation.refresh_from_db()
        self.assertEqual(swap.amount_kobo, self.pps)
        self.assertEqual(swap.payment_mode, "WALLET")
        self.assertEqual(reservation.status, Reservation.Status.USED)
        self.assertEqual(reservation.hold_amount_kobo, 0)
        self.assertEqual(self.wallet.hold_kobo, 0)
        self.assertEqual(self.wallet.balance_kobo, before_balance - self.pps)
        self.assertTrue(
            Payment.objects.filter(
                account=self.account, purpose="SWAP", channel="WALLET_DEBIT"
            ).exists()
        )

    def test_expire_releases_hold(self):
        reservation = ReservationService.create_reservation(
            account=self.account,
            vehicle=self.vehicle,
            driver=self.driver,
            hub=self.hub,
            payment_mode=Reservation.PaymentMode.WALLET,
        )
        Reservation.objects.filter(pk=reservation.pk).update(
            expires_at=timezone.now() - timezone.timedelta(minutes=1)
        )
        reservation.refresh_from_db()
        ReservationService.expire_reservation(reservation=reservation)
        self.wallet.refresh_from_db()
        reservation.refresh_from_db()
        self.assertEqual(reservation.status, Reservation.Status.EXPIRED)
        self.assertEqual(reservation.hold_amount_kobo, 0)
        self.assertEqual(self.wallet.hold_kobo, 0)

    def test_extend_respects_hold_policy_max(self):
        from mobility.models import Plan, Subscription

        plan = Plan.objects.filter(
            vehicle_type=VehicleType.MOTORCYCLE,
            period=Plan.Period.DAY,
            is_active=True,
        ).first()
        self.assertIsNotNone(plan)
        Subscription.objects.create(
            account=self.account,
            vehicle=self.vehicle,
            plan=plan,
            starts_at=timezone.now() - timezone.timedelta(hours=1),
            ends_at=timezone.now() + timezone.timedelta(days=1),
            swaps_allowance=plan.swap_allowance,
            status=Subscription.Status.ACTIVE,
        )
        reservation = ReservationService.create_reservation(
            account=self.account,
            vehicle=self.vehicle,
            driver=self.driver,
            hub=self.hub,
            payment_mode=Reservation.PaymentMode.PLAN,
        )
        policy = PricingService.get_hold_policy()
        with self.assertRaises(DomainError):
            ReservationService.extend_reservation(
                reservation=reservation,
                minutes=policy.max_extend_minutes + 1,
            )
        before = reservation.expires_at
        extended = ReservationService.extend_reservation(
            reservation=reservation,
            minutes=policy.max_extend_minutes,
        )
        self.assertEqual(
            extended.expires_at,
            before + timezone.timedelta(minutes=policy.max_extend_minutes),
        )

    def test_first_swap_allows_empty_return(self):
        self.vehicle.current_battery = None
        self.vehicle.save(update_fields=["current_battery", "updated_at"])
        reservation = ReservationService.create_reservation(
            account=self.account,
            vehicle=self.vehicle,
            driver=self.driver,
            hub=self.hub,
            payment_mode=Reservation.PaymentMode.WALLET,
        )
        swap = SwapService.complete_swap(
            reservation_id=reservation.id,
            hub_id=self.hub.id,
            vehicle_id=self.vehicle.id,
            driver_id=self.driver.id,
            account_id=self.account.id,
            returned_battery_serial="",
            issued_battery_serial="BAT-M-READY",
        )
        self.vehicle.refresh_from_db()
        self.assertIsNone(swap.returned_battery_id)
        self.assertEqual(swap.issued_battery_id, self.ready.id)
        self.assertEqual(self.vehicle.current_battery_id, self.ready.id)
        from audit.models import AuditEvent

        self.assertTrue(
            AuditEvent.objects.filter(
                action="swap.completed", subject_id=str(swap.id)
            ).exists()
        )

    def test_return_required_when_vehicle_has_pack(self):
        with self.assertRaises(DomainError) as ctx:
            SwapService.complete_swap(
                hub_id=self.hub.id,
                vehicle_id=self.vehicle.id,
                driver_id=self.driver.id,
                account_id=self.account.id,
                returned_battery_serial="",
                issued_battery_serial="BAT-M-READY",
                payment_mode=Reservation.PaymentMode.WALLET,
                amount_kobo=self.pps,
                rider_pin_grant="unused",
            )
        self.assertEqual(ctx.exception.code, "RETURN_REQUIRED")


class PricingApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = User.objects.create(
            email="pricing-admin@test.eco",
            role=User.Role.SUPER_ADMIN,
            is_staff=True,
            is_superuser=True,
        )
        tokens = issue_tokens(self.admin)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens['access']}")
        PricingService.ensure_defaults()

    def test_hold_policy_get_put(self):
        res = self.client.get("/api/v1/mobility/pricing/hold-policy/")
        self.assertEqual(res.status_code, 200)
        body = res.json()
        self.assertEqual(body["default_hold_minutes"], 15)
        self.assertEqual(body["max_extend_minutes"], 15)

        res = self.client.put(
            "/api/v1/mobility/pricing/hold-policy/",
            {"default_hold_minutes": 20, "max_extend_minutes": 10},
            format="json",
        )
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()["default_hold_minutes"], 20)
        self.assertEqual(res.json()["max_extend_minutes"], 10)

    def test_matrix_list_seeded_active(self):
        res = self.client.get(
            "/api/v1/mobility/pricing/matrices/",
            {"status": "ACTIVE"},
        )
        self.assertEqual(res.status_code, 200)
        rows = res.json()["results"]
        self.assertGreaterEqual(len(rows), 3)
        moto = next(r for r in rows if r["vehicle_type"] == "MOTORCYCLE")
        self.assertEqual(moto["pay_per_swap_kobo"], 45_000)
        self.assertEqual(moto["daily_kobo"], 120_000)
