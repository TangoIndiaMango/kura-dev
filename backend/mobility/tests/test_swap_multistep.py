"""F4 multi-step swap: start → return → issue → complete (+ abort)."""
from django.test import TestCase
from rest_framework.test import APIClient

from accounts.models import Account, Driver, StaffMembership, User
from accounts.services.auth import issue_tokens
from accounts.services.roles import RoleService
from audit.models import AuditEvent
from finance.services import WalletService
from mobility.models import (
    Battery,
    BatteryType,
    Hub,
    HubSlot,
    Reservation,
    Swap,
    Vehicle,
    VehicleModel,
    VehicleType,
)
from mobility.services import PricingService, ReservationService, SwapService


class MultiStepSwapTests(TestCase):
    def setUp(self):
        RoleService.sync_catalog()
        PricingService.ensure_defaults()
        self.client = APIClient()
        self.agent = User.objects.create(
            email="ms.agent@yopmail.com",
            role=User.Role.HUB_AGENT,
            is_staff=True,
        )
        self.agent.set_password("agentpass123")
        self.agent.set_pin("1234")
        self.agent.save()
        tokens = issue_tokens(self.agent)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens['access']}")

        self.owner = User.objects.create(
            phone="+2348016660001", role=User.Role.DRIVER, first_name="Multi"
        )
        self.account = Account.objects.create(
            owner_user=self.owner,
            display_name="Multi Rider",
            status=Account.Status.ACTIVE,
            kyc_status=Account.KycStatus.VERIFIED,
        )
        self.driver = Driver.objects.create(user=self.owner, account=self.account)
        WalletService.get_or_create_wallet(self.account)
        WalletService.fund_wallet(
            account=self.account,
            amount_kobo=500_000,
            channel="CARD",
            psp_reference="fund-ms-1",
        )

        self.bt = BatteryType.objects.create(name="MSType", manufacturer="KURA")
        self.hub = Hub.objects.create(code="HUB-MS", name="MS Hub", address="Lagos")
        StaffMembership.objects.create(
            user=self.agent,
            role=User.Role.HUB_AGENT,
            hub_id=str(self.hub.id),
        )
        self.mounted = Battery.objects.create(
            serial="BAT-MS-MOUNT",
            battery_type=self.bt,
            status=Battery.Status.ISSUED,
            charge_pct=20,
        )
        self.ready = Battery.objects.create(
            serial="BAT-MS-READY",
            battery_type=self.bt,
            status=Battery.Status.AVAILABLE,
            charge_pct=100,
            current_hub=self.hub,
        )
        HubSlot.objects.create(
            hub=self.hub, slot_no=1, battery=self.ready, state=HubSlot.State.READY
        )
        model = VehicleModel.objects.create(
            make="Kura",
            model="MS",
            battery_type=self.bt,
            vehicle_type=VehicleType.MOTORCYCLE,
        )
        self.vehicle = Vehicle.objects.create(
            account=self.account,
            vehicle_model=model,
            registration_plate="MS-001",
            current_battery=self.mounted,
        )

    def test_full_session_happy_path(self):
        reservation = ReservationService.create_reservation(
            account=self.account,
            vehicle=self.vehicle,
            driver=self.driver,
            hub=self.hub,
            payment_mode=Reservation.PaymentMode.WALLET,
        )
        start = self.client.post(
            "/api/v1/mobility/swaps/start/",
            {
                "hub_id": str(self.hub.id),
                "client_event_id": "01TESTCLIENTEVENT0001",
                "reservation_id": str(reservation.id),
            },
            format="json",
        )
        self.assertEqual(start.status_code, 201)
        swap_id = start.json()["id"]
        self.assertEqual(start.json()["status"], "STARTED")

        ret = self.client.post(
            f"/api/v1/mobility/swaps/{swap_id}/return/",
            {"battery_serial": "BAT-MS-MOUNT", "charge_pct": 18},
            format="json",
        )
        self.assertEqual(ret.status_code, 200)
        self.assertFalse(ret.json()["mismatch"])
        self.assertEqual(ret.json()["status"], "RETURN_RECORDED")

        iss = self.client.post(
            f"/api/v1/mobility/swaps/{swap_id}/issue/",
            {"battery_serial": "BAT-MS-READY", "charge_pct": 100},
            format="json",
        )
        self.assertEqual(iss.status_code, 200)
        self.assertEqual(iss.json()["status"], "ISSUED")

        done = self.client.post(
            f"/api/v1/mobility/swaps/{swap_id}/complete/",
            {"payment_mode": "WALLET"},
            format="json",
        )
        self.assertEqual(done.status_code, 200)
        self.assertEqual(done.json()["status"], "COMPLETED")
        self.vehicle.refresh_from_db()
        self.assertEqual(self.vehicle.current_battery_id, self.ready.id)
        self.assertTrue(
            AuditEvent.objects.filter(action="swap.completed").exists()
        )
        self.assertTrue(AuditEvent.objects.filter(action="swap.started").exists())
        self.assertTrue(
            AuditEvent.objects.filter(action="swap.return_recorded").exists()
        )
        self.assertTrue(AuditEvent.objects.filter(action="swap.issued").exists())
        from notifications.models import Notification

        self.assertTrue(
            Notification.objects.filter(
                user=self.owner,
                template_code="swap.completed",
                channel=Notification.Channel.IN_APP,
            ).exists()
        )
    def test_first_swap_skips_return(self):
        from core.exceptions import DomainError

        self.vehicle.current_battery = None
        self.vehicle.save(update_fields=["current_battery", "updated_at"])
        self.ready.status = Battery.Status.AVAILABLE
        self.ready.save(update_fields=["status", "updated_at"])

        swap = SwapService.start(
            hub_id=self.hub.id,
            client_event_id="01TESTCLIENTEVENT0002",
            vehicle_id=self.vehicle.id,
            driver_id=self.driver.id,
            account_id=self.account.id,
            agent=self.agent,
        )
        with self.assertRaises(DomainError) as ctx:
            SwapService.record_return(
                swap=swap,
                battery_serial="BAT-MS-READY",
                charge_pct=20,
                agent=self.agent,
            )
        self.assertEqual(ctx.exception.code, "FIRST_SWAP_NO_RETURN")

        swap = SwapService.issue(
            swap=swap,
            battery_serial="BAT-MS-READY",
            agent=self.agent,
        )
        self.assertEqual(swap.status, Swap.Status.ISSUED)
        self.assertIsNone(swap.returned_battery_id)

        swap = SwapService.complete_session(
            swap=swap,
            agent=self.agent,
            payment_mode="WALLET",
            amount_kobo=0,
        )
        self.assertEqual(swap.status, Swap.Status.COMPLETED)
        self.vehicle.refresh_from_db()
        self.assertEqual(self.vehicle.current_battery_id, self.ready.id)
        self.assertTrue(
            AuditEvent.objects.filter(action="swap.completed").exists()
        )

    def test_abort_after_issue_restores_pack(self):
        self.vehicle.current_battery = None
        self.vehicle.save(update_fields=["current_battery", "updated_at"])
        swap = SwapService.start(
            hub_id=self.hub.id,
            client_event_id="01TESTCLIENTEVENT0003",
            vehicle_id=self.vehicle.id,
            driver_id=self.driver.id,
            account_id=self.account.id,
            agent=self.agent,
        )
        swap = SwapService.issue(
            swap=swap, battery_serial="BAT-MS-READY", agent=self.agent
        )
        swap = SwapService.abort(swap=swap, reason="rider_left", agent=self.agent)
        self.assertEqual(swap.status, Swap.Status.FAILED)
        self.ready.refresh_from_db()
        self.assertEqual(self.ready.status, Battery.Status.AVAILABLE)
        self.vehicle.refresh_from_db()
        self.assertIsNone(self.vehicle.current_battery_id)
        self.assertTrue(AuditEvent.objects.filter(action="swap.aborted").exists())

    def test_start_idempotent_client_event(self):
        a = SwapService.start(
            hub_id=self.hub.id,
            client_event_id="01TESTCLIENTEVENT0004",
            vehicle_id=self.vehicle.id,
            driver_id=self.driver.id,
            account_id=self.account.id,
            agent=self.agent,
        )
        b = SwapService.start(
            hub_id=self.hub.id,
            client_event_id="01TESTCLIENTEVENT0004",
            vehicle_id=self.vehicle.id,
            driver_id=self.driver.id,
            account_id=self.account.id,
            agent=self.agent,
        )
        self.assertEqual(a.id, b.id)

    def test_start_resumes_open_swap_for_reservation(self):
        reservation = ReservationService.create_reservation(
            account=self.account,
            vehicle=self.vehicle,
            driver=self.driver,
            hub=self.hub,
            payment_mode=Reservation.PaymentMode.WALLET,
        )
        first = SwapService.start(
            hub_id=self.hub.id,
            client_event_id="01TESTCLIENTEVENT0005",
            reservation_id=reservation.id,
            agent=self.agent,
        )
        first = SwapService.record_return(
            swap=first,
            battery_serial="BAT-MS-MOUNT",
            charge_pct=18,
            agent=self.agent,
        )[0]
        first = SwapService.issue(
            swap=first,
            battery_serial="BAT-MS-READY",
            agent=self.agent,
        )
        resumed = SwapService.start(
            hub_id=self.hub.id,
            client_event_id="01TESTCLIENTEVENT0006",
            reservation_id=reservation.id,
            agent=self.agent,
        )
        self.assertEqual(resumed.id, first.id)
        self.assertEqual(resumed.status, Swap.Status.ISSUED)
