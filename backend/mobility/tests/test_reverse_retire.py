"""T-SWP-11 reverse + vehicle retire + identity mismatch."""
from datetime import timedelta

from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from accounts.models import Account, Driver, User
from accounts.services.auth import issue_tokens
from accounts.services.roles import RoleService
from audit.models import AuditEvent
from core.exceptions import DomainError
from finance.services import WalletService
from mobility.models import (
    Battery,
    BatteryType,
    Hub,
    HubSlot,
    Swap,
    Vehicle,
    VehicleModel,
    VehicleType,
)
from mobility.services import PricingService, SwapService, VehicleService
from risk.models import RiskEvent
from support.models import SupportCase


class ReverseAndRetireTests(TestCase):
    def setUp(self):
        RoleService.sync_catalog()
        PricingService.ensure_defaults()
        self.ops = User.objects.create(
            email="rev.ops@yopmail.com",
            role=User.Role.OPS_MANAGER,
            is_staff=True,
        )
        self.agent = User.objects.create(
            email="rev.agent@yopmail.com",
            role=User.Role.HUB_AGENT,
            is_staff=True,
        )
        self.owner = User.objects.create(
            phone="+2348018880001", role=User.Role.DRIVER, first_name="Rev"
        )
        self.account = Account.objects.create(
            owner_user=self.owner,
            display_name="Rev Rider",
            status=Account.Status.ACTIVE,
            kyc_status=Account.KycStatus.VERIFIED,
        )
        self.driver = Driver.objects.create(user=self.owner, account=self.account)
        WalletService.get_or_create_wallet(self.account)
        self.bt = BatteryType.objects.create(name="RevType", manufacturer="KURA")
        self.hub = Hub.objects.create(code="HUB-REV", name="Rev Hub", address="Lagos")
        self.mounted = Battery.objects.create(
            serial="BAT-REV-MOUNT",
            battery_type=self.bt,
            status=Battery.Status.ISSUED,
            charge_pct=20,
        )
        self.ready = Battery.objects.create(
            serial="BAT-REV-READY",
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
            model="Rev",
            battery_type=self.bt,
            vehicle_type=VehicleType.MOTORCYCLE,
        )
        self.vehicle = Vehicle.objects.create(
            account=self.account,
            vehicle_model=model,
            registration_plate="REV-001",
            current_battery=self.mounted,
            hardware_id="HW-REV-001",
            vin="VINREV001",
        )
        self.client = APIClient()
        tokens = issue_tokens(self.ops)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens['access']}")

    def test_reverse_within_24h(self):
        swap = SwapService.complete_swap(
            hub_id=self.hub.id,
            vehicle_id=self.vehicle.id,
            driver_id=self.driver.id,
            account_id=self.account.id,
            returned_battery_serial="BAT-REV-MOUNT",
            issued_battery_serial="BAT-REV-READY",
            payment_mode="WALLET",
            amount_kobo=0,
            agent=self.agent,
        )
        self.assertEqual(swap.status, Swap.Status.COMPLETED)
        res = self.client.post(
            f"/api/v1/mobility/swaps/{swap.id}/reverse/",
            {"reason": "Wrong pack issued — ops correction"},
            format="json",
        )
        self.assertEqual(res.status_code, 200, res.content)
        swap.refresh_from_db()
        self.assertEqual(swap.status, Swap.Status.REVERSED)
        self.assertTrue(AuditEvent.objects.filter(action="swap.reversed").exists())

    def test_reverse_after_24h_forbidden(self):
        swap = Swap.objects.create(
            account=self.account,
            vehicle=self.vehicle,
            driver=self.driver,
            hub=self.hub,
            status=Swap.Status.COMPLETED,
            amount_kobo=0,
            vat_kobo=0,
            completed_at=timezone.now() - timedelta(hours=25),
        )
        with self.assertRaises(DomainError) as ctx:
            SwapService.reverse(swap=swap, reason="too late", actor=self.ops)
        self.assertEqual(ctx.exception.code, "INVALID_TRANSITION")

    def test_vehicle_retire_blocked_with_pack(self):
        with self.assertRaises(DomainError) as ctx:
            VehicleService.retire(vehicle=self.vehicle, actor=self.ops)
        self.assertEqual(ctx.exception.code, "VEHICLE_HAS_BATTERY")

    def test_vehicle_retire_ok(self):
        self.vehicle.current_battery = None
        self.vehicle.save(update_fields=["current_battery", "updated_at"])
        res = self.client.post(f"/api/v1/mobility/vehicles/{self.vehicle.id}/retire/")
        self.assertEqual(res.status_code, 200, res.content)
        self.vehicle.refresh_from_db()
        self.assertEqual(self.vehicle.status, Vehicle.Status.RETIRED)

    def test_identity_mismatch_opens_case_and_risk(self):
        res = self.client.post(
            "/api/v1/mobility/swaps/identity-mismatch/",
            {
                "account_id": str(self.account.id),
                "reason": "Face does not match photo",
                "subject": "Bay identity mismatch",
                "hub_id": str(self.hub.id),
            },
            format="json",
        )
        self.assertEqual(res.status_code, 200, res.content)
        body = res.json().get("data", res.json())
        self.assertTrue(SupportCase.objects.filter(pk=body["case_id"]).exists())
        self.assertTrue(RiskEvent.objects.filter(pk=body["risk_event_id"]).exists())
        self.assertTrue(
            AuditEvent.objects.filter(
                action="identity.mismatch", subject_id=str(self.account.id)
            ).exists()
        )

    def test_swap_list_filters_by_vehicle(self):
        Swap.objects.create(
            account=self.account,
            vehicle=self.vehicle,
            driver=self.driver,
            hub=self.hub,
            status=Swap.Status.COMPLETED,
            completed_at=timezone.now(),
            client_event_id="rev-filter-1",
        )
        res = self.client.get(
            f"/api/v1/mobility/swaps/?vehicle={self.vehicle.id}"
        )
        self.assertEqual(res.status_code, 200, res.content)
        payload = res.json()
        rows = payload.get("results") or payload.get("data", {}).get("results", [])
        self.assertTrue(any(str(r.get("vehicle")) == str(self.vehicle.id) for r in rows))
        res_empty = self.client.get(
            "/api/v1/mobility/swaps/?vehicle=00000000-0000-0000-0000-000000000099"
        )
        self.assertEqual(res_empty.status_code, 200)
        empty_payload = res_empty.json()
        empty = empty_payload.get("results") or empty_payload.get("data", {}).get(
            "results", []
        )
        self.assertEqual(len(empty), 0)
