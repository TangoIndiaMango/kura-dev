"""Rider PIN grant for bay wallet debit + agent override PIN gate."""
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from accounts.models import Account, Driver, User
from accounts.services.auth import AuthService, issue_pin_grant, issue_tokens
from accounts.services.roles import RoleService
from audit.models import AuditEvent
from core.exceptions import DomainError
from mobility.models import (
    Battery,
    BatteryType,
    Hub,
    HubSlot,
    Vehicle,
    VehicleModel,
    VehicleType,
)
from mobility.services import PricingService, SwapService
from operations.models import Alert, Override
from operations.services.overrides import OverrideService


class RiderPinGrantTests(TestCase):
    def setUp(self):
        RoleService.sync_catalog()
        PricingService.ensure_defaults()
        self.client = APIClient()
        self.agent = User.objects.create(
            email="pin.agent@yopmail.com",
            role=User.Role.HUB_AGENT,
            is_staff=True,
        )
        self.agent.set_password("agentpass123")
        self.agent.set_pin("1234")
        self.agent.save()
        tokens = issue_tokens(self.agent)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens['access']}")

        self.owner = User.objects.create(
            phone="+2348015550001", role=User.Role.DRIVER
        )
        self.owner.set_pin("5678")
        self.owner.save()
        self.account = Account.objects.create(
            owner_user=self.owner,
            display_name="Pin Rider",
            status=Account.Status.ACTIVE,
        )
        self.driver = Driver.objects.create(user=self.owner, account=self.account)

        bt = BatteryType.objects.create(name="PinType", manufacturer="KURA")
        self.hub = Hub.objects.create(code="HUB-PIN", name="Pin Hub", address="Lagos")
        self.ready = Battery.objects.create(
            serial="BAT-PIN-READY",
            battery_type=bt,
            status=Battery.Status.AVAILABLE,
            charge_pct=100,
            current_hub=self.hub,
        )
        HubSlot.objects.create(
            hub=self.hub, slot_no=1, battery=self.ready, state=HubSlot.State.READY
        )
        model = VehicleModel.objects.create(
            make="Kura",
            model="Pin",
            battery_type=bt,
            vehicle_type=VehicleType.MOTORCYCLE,
        )
        self.vehicle = Vehicle.objects.create(
            account=self.account,
            vehicle_model=model,
            registration_plate="PIN-001",
        )
        self.pps = PricingService.resolve_pps_kobo(
            vehicle_type=VehicleType.MOTORCYCLE
        )

    def test_verify_rider_pin_returns_grant(self):
        res = self.client.post(
            "/api/v1/mobility/swaps/verify-rider-pin/",
            {"account_id": str(self.account.id), "pin": "5678"},
            format="json",
        )
        self.assertEqual(res.status_code, 200)
        body = res.json()
        data = body.get("data", body)
        self.assertIn("pin_grant", data)

    def test_wallet_walkin_without_grant_rejected(self):
        with self.assertRaises(DomainError) as ctx:
            SwapService.complete_swap(
                hub_id=self.hub.id,
                vehicle_id=self.vehicle.id,
                driver_id=self.driver.id,
                account_id=self.account.id,
                returned_battery_serial="",
                issued_battery_serial="BAT-PIN-READY",
                payment_mode="WALLET",
                amount_kobo=self.pps,
                rider_pin_grant="",
                agent=self.agent,
            )
        self.assertEqual(ctx.exception.code, "PIN_GRANT_REQUIRED")

    def test_wallet_reservation_without_hold_requires_pin(self):
        """Booked WALLET with hold_amount_kobo=0 is an unheld debit — PIN required."""
        from mobility.models import Reservation

        reservation = Reservation.objects.create(
            account=self.account,
            vehicle=self.vehicle,
            driver=self.driver,
            hub=self.hub,
            code="KB-NOHOLD",
            payment_mode=Reservation.PaymentMode.WALLET,
            status=Reservation.Status.CONFIRMED,
            hold_amount_kobo=0,
            expires_at=timezone.now() + timezone.timedelta(minutes=15),
        )
        with self.assertRaises(DomainError) as ctx:
            SwapService.complete_swap(
                reservation_id=reservation.id,
                hub_id=self.hub.id,
                vehicle_id=self.vehicle.id,
                driver_id=self.driver.id,
                account_id=self.account.id,
                returned_battery_serial="",
                issued_battery_serial="BAT-PIN-READY",
                payment_mode="WALLET",
                amount_kobo=self.pps,
                rider_pin_grant="",
                agent=self.agent,
            )
        self.assertEqual(ctx.exception.code, "PIN_GRANT_REQUIRED")

    def test_set_pin_emits_audit(self):
        AuthService.set_pin(user=self.agent, pin="9999", pin_confirm="9999")
        self.assertTrue(
            AuditEvent.objects.filter(
                action="auth.pin_reset", subject_id=str(self.agent.id)
            ).exists()
        )

    def test_override_requires_pin_grant(self):
        with self.assertRaises(DomainError) as ctx:
            OverrideService.record(
                agent=self.agent,
                reason="DISCRETION",
                note="Bay triage",
                pin_grant="",
            )
        self.assertEqual(ctx.exception.code, "PIN_GRANT_REQUIRED")

    def test_override_with_grant_and_third_alerts(self):
        for i in range(3):
            grant = issue_pin_grant(self.agent)["pin_grant"]
            OverrideService.record(
                agent=self.agent,
                reason="DISCRETION",
                note=f"Override {i + 1}",
                pin_grant=grant,
                hub=self.hub,
            )
        self.assertEqual(Override.objects.filter(agent=self.agent).count(), 3)
        self.assertTrue(
            Alert.objects.filter(kind=Alert.Kind.AGENT_OVERRIDE_LIMIT).exists()
        )
        self.assertTrue(
            AuditEvent.objects.filter(action="override.recorded").exists()
        )
