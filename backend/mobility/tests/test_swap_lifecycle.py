"""Swap display + lifecycle sweep tests."""
from __future__ import annotations

from datetime import timedelta

from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from accounts.models import Account, Driver, User
from accounts.services.auth import issue_tokens
from finance.services import WalletService
from mobility.helpers.swap_display import (
    swap_display_amount_kobo,
    swap_ui_status,
)
from mobility.models import (
    Battery,
    BatteryType,
    Hub,
    HubSlot,
    Reservation,
    Swap,
    Vehicle,
    VehicleModel,
)
from mobility.services.plans.pricing import PricingService
from mobility.services.reservations.service import ReservationService
from mobility.services.swap.lifecycle import (
    abandon_incomplete_swaps,
    expire_stale_reservations,
    sweep_swap_lifecycle,
)
from mobility.services.swap.start import start_swap


def _fixture(*, phone: str, hub_code: str, plate: str):
    PricingService.ensure_defaults()
    owner = User.objects.create(phone=phone, role=User.Role.DRIVER)
    account = Account.objects.create(
        owner_user=owner,
        display_name=f"Rider {phone[-4:]}",
        status=Account.Status.ACTIVE,
    )
    driver = Driver.objects.create(user=owner, account=account)
    battery_type = BatteryType.objects.create(name=f"72V-{hub_code}", manufacturer="KURA")
    hub = Hub.objects.create(
        code=hub_code,
        name=f"Hub {hub_code}",
        address="Lagos",
        status=Hub.Status.ONLINE,
    )
    ready = Battery.objects.create(
        serial=f"BAT-R-{hub_code}",
        battery_type=battery_type,
        status=Battery.Status.AVAILABLE,
        charge_pct=100,
        current_hub=hub,
    )
    HubSlot.objects.create(
        hub=hub,
        slot_no=1,
        battery=ready,
        state=HubSlot.State.READY,
    )
    model = VehicleModel.objects.create(
        make="Kura",
        model=hub_code,
        battery_type=battery_type,
    )
    mounted = Battery.objects.create(
        serial=f"BAT-M-{hub_code}",
        battery_type=battery_type,
        status=Battery.Status.ISSUED,
        charge_pct=20,
    )
    vehicle = Vehicle.objects.create(
        account=account,
        vehicle_model=model,
        registration_plate=plate,
        status=Vehicle.Status.ACTIVE,
        current_battery=mounted,
    )
    WalletService.get_or_create_wallet(account)
    WalletService.fund_wallet(
        account=account,
        amount_kobo=5_000_000,
        channel="CARD",
        psp_reference=f"fund-{hub_code}",
    )
    return account, driver, hub, vehicle


class SwapDisplayHelperTests(TestCase):
    def setUp(self):
        self.account, self.driver, self.hub, self.vehicle = _fixture(
            phone="+2348015550001",
            hub_code="LC1",
            plate="LAG-LC-1",
        )
        self.pps = PricingService.resolve_pps_kobo(
            vehicle_type=self.vehicle.vehicle_model.vehicle_type
        )

    def test_started_with_live_hold_is_in_progress_with_hold_amount(self):
        rsv = ReservationService.create_reservation(
            account=self.account,
            vehicle=self.vehicle,
            driver=self.driver,
            hub=self.hub,
            payment_mode=Reservation.PaymentMode.WALLET,
        )
        swap = start_swap(
            hub_id=self.hub.id,
            client_event_id="life-start-1",
            reservation_id=rsv.id,
        )
        swap = Swap.objects.select_related(
            "reservation", "vehicle__vehicle_model"
        ).get(pk=swap.pk)
        self.assertEqual(swap_ui_status(swap), "IN_PROGRESS")
        self.assertEqual(swap_display_amount_kobo(swap), self.pps)
        self.assertEqual(swap_display_amount_kobo(swap), rsv.hold_amount_kobo)

    def test_started_with_expired_hold_is_incomplete_zero_amount(self):
        rsv = ReservationService.create_reservation(
            account=self.account,
            vehicle=self.vehicle,
            driver=self.driver,
            hub=self.hub,
            payment_mode=Reservation.PaymentMode.WALLET,
        )
        Reservation.objects.filter(pk=rsv.pk).update(
            expires_at=timezone.now() - timedelta(minutes=5)
        )
        rsv.refresh_from_db()
        ReservationService.expire_reservation(reservation=rsv)
        rsv.refresh_from_db()
        swap = Swap.objects.create(
            reservation=rsv,
            account=self.account,
            vehicle=self.vehicle,
            driver=self.driver,
            hub=self.hub,
            status=Swap.Status.STARTED,
            payment_mode=Reservation.PaymentMode.WALLET,
            amount_kobo=0,
            started_at=timezone.now() - timedelta(minutes=30),
            client_event_id="life-expired-1",
        )
        swap = Swap.objects.select_related(
            "reservation", "vehicle__vehicle_model"
        ).get(pk=swap.pk)
        self.assertEqual(swap_ui_status(swap), "INCOMPLETE")
        self.assertEqual(swap_display_amount_kobo(swap), 0)

    def test_stale_started_without_reservation_is_incomplete(self):
        swap = Swap.objects.create(
            reservation=None,
            account=self.account,
            vehicle=self.vehicle,
            driver=self.driver,
            hub=self.hub,
            status=Swap.Status.STARTED,
            payment_mode=Reservation.PaymentMode.WALLET,
            amount_kobo=0,
            started_at=timezone.now() - timedelta(hours=3),
            client_event_id="life-stale-1",
        )
        swap = Swap.objects.select_related(
            "reservation", "vehicle__vehicle_model"
        ).get(pk=swap.pk)
        self.assertEqual(swap_ui_status(swap), "INCOMPLETE")
        self.assertEqual(swap_display_amount_kobo(swap), 0)


class SwapLifecycleSweepTests(TestCase):
    def setUp(self):
        self.account, self.driver, self.hub, self.vehicle = _fixture(
            phone="+2348015550002",
            hub_code="SW1",
            plate="LAG-SW-1",
        )

    def test_expire_stale_reservations(self):
        rsv = Reservation.objects.create(
            account=self.account,
            vehicle=self.vehicle,
            driver=self.driver,
            hub=self.hub,
            code="KB-SWEEP1",
            status=Reservation.Status.CONFIRMED,
            payment_mode=Reservation.PaymentMode.WALLET,
            hold_amount_kobo=0,
            expires_at=timezone.now() - timedelta(minutes=1),
        )
        out = expire_stale_reservations(limit=50)
        rsv.refresh_from_db()
        self.assertEqual(rsv.status, Reservation.Status.EXPIRED)
        self.assertGreaterEqual(out["expired"], 1)

    def test_abandon_incomplete_marks_failed(self):
        swap = Swap.objects.create(
            reservation=None,
            account=self.account,
            vehicle=self.vehicle,
            driver=self.driver,
            hub=self.hub,
            status=Swap.Status.STARTED,
            payment_mode=Reservation.PaymentMode.WALLET,
            amount_kobo=0,
            started_at=timezone.now() - timedelta(hours=3),
            client_event_id="sweep-abandon-1",
        )
        out = abandon_incomplete_swaps(limit=50)
        swap.refresh_from_db()
        self.assertEqual(swap.status, Swap.Status.FAILED)
        self.assertGreaterEqual(out["abandoned"], 1)

    def test_sweep_combined(self):
        result = sweep_swap_lifecycle(reservation_limit=50, swap_limit=50)
        self.assertIn("reservations", result)
        self.assertIn("swaps", result)


class SwapListApiDisplayTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = User.objects.create(
            email="swap-life-admin@test.eco",
            role=User.Role.SUPER_ADMIN,
            is_staff=True,
            is_superuser=True,
        )
        self.admin.set_password("adminpass123")
        self.admin.save()
        tokens = issue_tokens(self.admin)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens['access']}")

        self.account, self.driver, self.hub, self.vehicle = _fixture(
            phone="+2348015550003",
            hub_code="AP1",
            plate="LAG-AP-1",
        )

    def test_list_exposes_ui_status_and_zero_for_incomplete(self):
        Swap.objects.create(
            reservation=None,
            account=self.account,
            vehicle=self.vehicle,
            driver=self.driver,
            hub=self.hub,
            status=Swap.Status.STARTED,
            payment_mode=Reservation.PaymentMode.WALLET,
            amount_kobo=0,
            started_at=timezone.now() - timedelta(hours=3),
            client_event_id="api-incomplete-1",
        )
        res = self.client.get("/api/v1/mobility/swaps/")
        self.assertEqual(res.status_code, 200)
        body = res.json()
        rows = body.get("results") or body.get("data") or []
        self.assertTrue(rows)
        row = rows[0]
        self.assertEqual(row["ui_status"], "INCOMPLETE")
        self.assertEqual(row["display_amount_kobo"], 0)
        self.assertIsNone(row.get("payment_id"))

    def test_admin_can_abort_open_swap(self):
        swap = Swap.objects.create(
            reservation=None,
            account=self.account,
            vehicle=self.vehicle,
            driver=self.driver,
            hub=self.hub,
            status=Swap.Status.STARTED,
            payment_mode=Reservation.PaymentMode.WALLET,
            amount_kobo=0,
            started_at=timezone.now(),
            client_event_id="api-abort-1",
        )
        res = self.client.post(
            f"/api/v1/mobility/swaps/{swap.id}/abort/",
            {"reason": "ops clear stuck session"},
            format="json",
        )
        self.assertEqual(res.status_code, 200)
        swap.refresh_from_db()
        self.assertEqual(swap.status, Swap.Status.FAILED)


class SwapRecoveryTests(TestCase):
    def setUp(self):
        self.account, self.driver, self.hub, self.vehicle = _fixture(
            phone="+2348015550004",
            hub_code="RC1",
            plate="LAG-RC-1",
        )

    def test_cancel_hold_aborts_linked_open_swap(self):
        rsv = ReservationService.create_reservation(
            account=self.account,
            vehicle=self.vehicle,
            driver=self.driver,
            hub=self.hub,
            payment_mode=Reservation.PaymentMode.WALLET,
        )
        swap = start_swap(
            hub_id=self.hub.id,
            client_event_id="rec-cancel-1",
            reservation_id=rsv.id,
        )
        ReservationService.cancel_reservation(reservation=rsv, actor=self.account.owner_user)
        swap.refresh_from_db()
        rsv.refresh_from_db()
        self.assertEqual(swap.status, Swap.Status.FAILED)
        self.assertEqual(rsv.status, Reservation.Status.CANCELLED)

    def test_cancelled_hold_is_incomplete_immediately(self):
        rsv = Reservation.objects.create(
            account=self.account,
            vehicle=self.vehicle,
            driver=self.driver,
            hub=self.hub,
            code="KB-RC-CAN",
            status=Reservation.Status.CANCELLED,
            payment_mode=Reservation.PaymentMode.WALLET,
            hold_amount_kobo=0,
            expires_at=timezone.now() + timedelta(minutes=20),
        )
        swap = Swap.objects.create(
            reservation=rsv,
            account=self.account,
            vehicle=self.vehicle,
            driver=self.driver,
            hub=self.hub,
            status=Swap.Status.STARTED,
            payment_mode=Reservation.PaymentMode.WALLET,
            amount_kobo=0,
            started_at=timezone.now(),
            client_event_id="rec-can-ui-1",
        )
        swap = Swap.objects.select_related(
            "reservation", "vehicle__vehicle_model"
        ).get(pk=swap.pk)
        self.assertEqual(swap_ui_status(swap), "INCOMPLETE")

    def test_rebook_clears_incomplete_orphan(self):
        from mobility.models import Battery, HubSlot

        Swap.objects.create(
            reservation=None,
            account=self.account,
            vehicle=self.vehicle,
            driver=self.driver,
            hub=self.hub,
            status=Swap.Status.STARTED,
            payment_mode=Reservation.PaymentMode.WALLET,
            amount_kobo=0,
            started_at=timezone.now() - timedelta(hours=3),
            client_event_id="rec-orphan-1",
        )
        # Fresh ready pack for the new hold (first pack was taken by fixture).
        bt = self.vehicle.vehicle_model.battery_type
        ready = Battery.objects.create(
            serial="BAT-R-RC1-B",
            battery_type=bt,
            status=Battery.Status.AVAILABLE,
            charge_pct=100,
            current_hub=self.hub,
        )
        HubSlot.objects.create(
            hub=self.hub, slot_no=2, battery=ready, state=HubSlot.State.READY
        )
        rsv = ReservationService.create_reservation(
            account=self.account,
            vehicle=self.vehicle,
            driver=self.driver,
            hub=self.hub,
            payment_mode=Reservation.PaymentMode.WALLET,
        )
        self.assertEqual(rsv.status, Reservation.Status.CONFIRMED)
        orphan = Swap.objects.get(client_event_id="rec-orphan-1")
        self.assertEqual(orphan.status, Swap.Status.FAILED)

    def test_rebook_blocks_live_in_progress_walk_in(self):
        from core.exceptions import DomainError

        Swap.objects.create(
            reservation=None,
            account=self.account,
            vehicle=self.vehicle,
            driver=self.driver,
            hub=self.hub,
            status=Swap.Status.STARTED,
            payment_mode=Reservation.PaymentMode.WALLET,
            amount_kobo=0,
            started_at=timezone.now(),
            client_event_id="rec-live-1",
        )
        with self.assertRaises(DomainError) as ctx:
            ReservationService.create_reservation(
                account=self.account,
                vehicle=self.vehicle,
                driver=self.driver,
                hub=self.hub,
                payment_mode=Reservation.PaymentMode.WALLET,
            )
        self.assertEqual(ctx.exception.code, "SWAP_IN_PROGRESS")
