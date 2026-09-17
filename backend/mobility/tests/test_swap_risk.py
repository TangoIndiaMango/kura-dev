"""T-SWP-07 — swap velocity / geo + ops velocity grant."""
from datetime import timedelta

from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from accounts.models import Account, Driver, StaffMembership, User
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
from mobility.services import PricingService, SwapService
from notifications.models import Notification
from risk.models import RiskEvent, RiskRule, RiskVelocityGrant
from risk.services import RiskService


class SwapRiskTests(TestCase):
    def setUp(self):
        RoleService.sync_catalog()
        PricingService.ensure_defaults()
        RiskService.ensure_rules()
        self.owner = User.objects.create(
            phone="+2348017770001", role=User.Role.DRIVER, first_name="Vel"
        )
        self.account = Account.objects.create(
            owner_user=self.owner,
            display_name="Vel Rider",
            status=Account.Status.ACTIVE,
            kyc_status=Account.KycStatus.VERIFIED,
        )
        self.driver = Driver.objects.create(user=self.owner, account=self.account)
        WalletService.get_or_create_wallet(self.account)
        self.agent = User.objects.create(
            email="vel.agent@yopmail.com",
            role=User.Role.HUB_AGENT,
            is_staff=True,
        )
        self.ops = User.objects.create(
            email="vel.ops@yopmail.com",
            role=User.Role.OPS_MANAGER,
            is_staff=True,
        )
        self.bt = BatteryType.objects.create(name="VelType", manufacturer="KURA")
        self.hub_a = Hub.objects.create(
            code="HUB-VEL-A", name="Vel A", address="Yaba", lat=6.5095, lng=3.3711
        )
        self.hub_b = Hub.objects.create(
            code="HUB-VEL-B", name="Vel B", address="Ikeja", lat=6.6018, lng=3.3515
        )
        StaffMembership.objects.bulk_create(
            [
                StaffMembership(
                    user=self.agent,
                    role=User.Role.HUB_AGENT,
                    hub_id=str(hub.id),
                )
                for hub in (self.hub_a, self.hub_b)
            ]
        )
        self.mounted = Battery.objects.create(
            serial="BAT-VEL-MOUNT",
            battery_type=self.bt,
            status=Battery.Status.ISSUED,
            charge_pct=20,
        )
        self.ready = Battery.objects.create(
            serial="BAT-VEL-READY",
            battery_type=self.bt,
            status=Battery.Status.AVAILABLE,
            charge_pct=100,
            current_hub=self.hub_a,
        )
        HubSlot.objects.create(
            hub=self.hub_a, slot_no=1, battery=self.ready, state=HubSlot.State.READY
        )
        model = VehicleModel.objects.create(
            make="Kura",
            model="Vel",
            battery_type=self.bt,
            vehicle_type=VehicleType.MOTORCYCLE,
        )
        self.vehicle = Vehicle.objects.create(
            account=self.account,
            vehicle_model=model,
            registration_plate="VEL-001",
            current_battery=self.mounted,
        )

    def _seed_completed(self, *, hub: Hub, completed_at, n: int = 1) -> None:
        for i in range(n):
            Swap.objects.create(
                account=self.account,
                vehicle=self.vehicle,
                driver=self.driver,
                hub=hub,
                agent=self.agent,
                status=Swap.Status.COMPLETED,
                amount_kobo=0,
                vat_kobo=0,
                started_at=completed_at - timedelta(minutes=5),
                completed_at=completed_at - timedelta(seconds=i),
            )

    def test_velocity_min_gap_blocks_start(self):
        self._seed_completed(hub=self.hub_a, completed_at=timezone.now())
        with self.assertRaises(DomainError) as ctx:
            SwapService.start(
                hub_id=self.hub_a.id,
                client_event_id="01VELGAP000000000001",
                vehicle_id=self.vehicle.id,
                driver_id=self.driver.id,
                account_id=self.account.id,
                agent=self.agent,
            )
        self.assertEqual(ctx.exception.code, "THROTTLED")
        self.assertEqual(ctx.exception.http_status, 429)
        self.assertTrue(
            RiskEvent.objects.filter(rule__code="SWAP_VELOCITY").exists()
        )
        self.assertTrue(
            AuditEvent.objects.filter(action="risk_event.opened").exists()
        )

    def test_velocity_daily_cap_blocks_start(self):
        base = timezone.now() - timedelta(hours=2)
        self._seed_completed(hub=self.hub_a, completed_at=base, n=4)
        with self.assertRaises(DomainError) as ctx:
            SwapService.start(
                hub_id=self.hub_a.id,
                client_event_id="01VELDAY000000000001",
                vehicle_id=self.vehicle.id,
                driver_id=self.driver.id,
                account_id=self.account.id,
                agent=self.agent,
            )
        self.assertEqual(ctx.exception.code, "THROTTLED")
        self.assertEqual(
            RiskEvent.objects.filter(rule__code="SWAP_VELOCITY")
            .latest("created_at")
            .context.get("reason"),
            "MAX_SWAPS_PER_VEHICLE_DAY",
        )

    def test_ops_grant_allows_blocked_start(self):
        self._seed_completed(hub=self.hub_a, completed_at=timezone.now())
        with self.assertRaises(DomainError):
            SwapService.start(
                hub_id=self.hub_a.id,
                client_event_id="01VELGRANT0000000001",
                vehicle_id=self.vehicle.id,
                driver_id=self.driver.id,
                account_id=self.account.id,
                agent=self.agent,
            )
        event = RiskEvent.objects.filter(rule__code="SWAP_VELOCITY").latest(
            "created_at"
        )
        client = APIClient()
        tokens = issue_tokens(self.ops)
        client.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens['access']}")
        res = client.post(
            f"/api/v1/risk/events/{event.id}/review/",
            {
                "status": "REVIEWED_OK",
                "note": "Fleet owner confirmed multi-hub day — allow one",
                "allow_swap": True,
                "ttl_hours": 2,
                "max_uses": 1,
            },
            format="json",
        )
        self.assertEqual(res.status_code, 200, res.content)
        self.assertIsNotNone(res.json().get("active_velocity_grant"))
        self.assertTrue(
            RiskVelocityGrant.objects.filter(
                vehicle_id=self.vehicle.id, status=RiskVelocityGrant.Status.ACTIVE
            ).exists()
        )
        self.assertTrue(
            AuditEvent.objects.filter(action="risk.velocity_grant.created").exists()
        )
        self.assertTrue(
            Notification.objects.filter(
                template_code="risk.velocity_grant.created"
            ).exists()
        )

        swap = SwapService.start(
            hub_id=self.hub_a.id,
            client_event_id="01VELGRANT0000000002",
            vehicle_id=self.vehicle.id,
            driver_id=self.driver.id,
            account_id=self.account.id,
            agent=self.agent,
        )
        self.assertEqual(swap.status, Swap.Status.STARTED)
        grant = RiskVelocityGrant.objects.get(risk_event=event)
        self.assertEqual(grant.status, RiskVelocityGrant.Status.CONSUMED)
        self.assertTrue(
            AuditEvent.objects.filter(action="risk.velocity_grant.consumed").exists()
        )

    def test_disabled_velocity_rule_skips(self):
        RiskRule.objects.filter(code="SWAP_VELOCITY").update(enabled=False)
        self._seed_completed(hub=self.hub_a, completed_at=timezone.now())
        swap = SwapService.start(
            hub_id=self.hub_a.id,
            client_event_id="01VELSKIP00000000001",
            vehicle_id=self.vehicle.id,
            driver_id=self.driver.id,
            account_id=self.account.id,
            agent=self.agent,
        )
        self.assertEqual(swap.status, Swap.Status.STARTED)

    def test_geo_impossible_flags_but_completes(self):
        self._seed_completed(
            hub=self.hub_a,
            completed_at=timezone.now() - timedelta(minutes=5),
        )
        ready_b = Battery.objects.create(
            serial="BAT-VEL-READY-B",
            battery_type=self.bt,
            status=Battery.Status.AVAILABLE,
            charge_pct=100,
            current_hub=self.hub_b,
        )
        HubSlot.objects.create(
            hub=self.hub_b, slot_no=1, battery=ready_b, state=HubSlot.State.READY
        )
        RiskRule.objects.filter(code="SWAP_VELOCITY").update(
            params={
                "MAX_SWAPS_PER_VEHICLE_DAY": 20,
                "MIN_MINUTES_BETWEEN_SWAPS": 1,
            }
        )
        swap = SwapService.complete_swap(
            hub_id=self.hub_b.id,
            vehicle_id=self.vehicle.id,
            driver_id=self.driver.id,
            account_id=self.account.id,
            returned_battery_serial="BAT-VEL-MOUNT",
            issued_battery_serial="BAT-VEL-READY-B",
            payment_mode="WALLET",
            amount_kobo=0,
            agent=self.agent,
        )
        self.assertEqual(swap.status, Swap.Status.COMPLETED)
        geo = RiskEvent.objects.filter(rule__code="GEO_IMPOSSIBLE").first()
        self.assertIsNotNone(geo)
        self.assertEqual(geo.severity, "HIGH")
        self.assertEqual(geo.context.get("from_hub"), "HUB-VEL-A")
        self.assertEqual(geo.context.get("to_hub"), "HUB-VEL-B")
