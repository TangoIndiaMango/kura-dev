"""Price matrix schedule / reject + hub-scope CRM slices."""
from __future__ import annotations

from datetime import timedelta

from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from accounts.models import Account, Driver, StaffMembership, User
from accounts.selectors import accounts_for
from accounts.services.auth import issue_tokens
from accounts.services.roles import RoleService
from audit.models import AuditEvent
from mobility.models import Battery, BatteryType, PriceMatrix, Swap, Vehicle, VehicleModel, VehicleType
from mobility.selectors import vehicles_for
from mobility.services.hubs.service import HubService
from mobility.services.plans.matrix_actions import MatrixLifecycleService
from mobility.services.plans.pricing import PricingService
from operations.models import Alert
from support.models import SupportCase
from support.selectors import cases_for


class MatrixLifecycleTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        RoleService.sync_catalog()
        cls.maker = User.objects.create(
            email="maker@test.local",
            role=User.Role.OPS_MANAGER,
            is_staff=True,
        )
        cls.checker = User.objects.create(
            email="checker@test.local",
            role=User.Role.OPS_MANAGER,
            is_staff=True,
        )

    def _queue(self) -> PriceMatrix:
        return PricingService.queue_matrix(
            vehicle_type=VehicleType.MOTORCYCLE,
            daily_kobo=130_000,
            weekly_kobo=700_000,
            monthly_kobo=2_500_000,
            pay_per_swap_kobo=50_000,
            effective_from=timezone.localdate() + timedelta(days=7),
            actor=self.maker,
        )

    def test_schedule_and_reject(self):
        matrix = self._queue()
        scheduled = MatrixLifecycleService.schedule_matrix(
            matrix=matrix,
            actor=self.checker,
            send_customer_notice=False,
        )
        self.assertEqual(scheduled.status, PriceMatrix.Status.SCHEDULED)
        self.assertTrue(
            AuditEvent.objects.filter(
                action="price_matrix.scheduled", subject_id=str(scheduled.id)
            ).exists()
        )
        rejected = MatrixLifecycleService.reject_matrix(
            matrix=scheduled,
            actor=self.checker,
            reason="Partner rate freeze",
        )
        self.assertEqual(rejected.status, PriceMatrix.Status.REJECTED)
        self.assertTrue(
            AuditEvent.objects.filter(
                action="price_matrix.rejected", subject_id=str(rejected.id)
            ).exists()
        )

    def test_schedule_api(self):
        matrix = self._queue()
        client = APIClient()
        tokens = issue_tokens(self.checker)
        client.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens['access']}")
        res = client.post(
            f"/api/v1/mobility/pricing/matrices/{matrix.id}/schedule/",
            {"send_customer_notice": False},
            format="json",
        )
        self.assertEqual(res.status_code, 200, res.content)
        self.assertEqual(res.json()["status"], "SCHEDULED")


class HubScopeCrmTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        RoleService.sync_catalog()
        cls.yaba = HubService.create_hub(
            code="HUB-CRM-Y", name="Yaba CRM", address="Yaba", slot_count=2
        )
        cls.ikeja = HubService.create_hub(
            code="HUB-CRM-I", name="Ikeja CRM", address="Ikeja", slot_count=2
        )
        cls.agent = User.objects.create(
            email="crm.agent@test.local",
            role=User.Role.HUB_AGENT,
            is_staff=True,
        )
        StaffMembership.objects.create(
            user=cls.agent,
            role=User.Role.HUB_AGENT,
            hub_id=str(cls.yaba.id),
        )
        owner = User.objects.create(
            email="rider@test.local", role=User.Role.DRIVER
        )
        cls.account = Account.objects.create(
            owner_user=owner,
            display_name="Rider",
            status=Account.Status.ACTIVE,
        )
        driver = Driver.objects.create(user=owner, account=cls.account)
        bt = BatteryType.objects.create(name="CRM BT", manufacturer="KURA")
        model = VehicleModel.objects.create(
            make="Kura",
            model="CRM",
            vehicle_type=VehicleType.MOTORCYCLE,
            battery_type=bt,
        )
        bat = Battery.objects.create(
            serial="BAT-CRM-01",
            battery_type=bt,
            charge_pct=90,
            status=Battery.Status.AVAILABLE,
            current_hub=cls.yaba,
        )
        cls.vehicle = Vehicle.objects.create(
            account=cls.account,
            vehicle_model=model,
            registration_plate="CRM-001",
            status=Vehicle.Status.ACTIVE,
            current_battery=bat,
        )
        Swap.objects.create(
            hub=cls.yaba,
            account=cls.account,
            vehicle=cls.vehicle,
            driver=driver,
            status=Swap.Status.COMPLETED,
        )
        Alert.objects.create(
            kind=Alert.Kind.SOLAR_FAULT,
            hub=cls.yaba,
            severity=Alert.Severity.WARNING,
            message="Yaba alert",
            status=Alert.Status.OPEN,
        )
        Alert.objects.create(
            kind=Alert.Kind.SOLAR_FAULT,
            hub=cls.ikeja,
            severity=Alert.Severity.WARNING,
            message="Ikeja alert",
            status=Alert.Status.OPEN,
        )
        SupportCase.objects.create(
            code="CASE-CRM-01",
            account=cls.account,
            kind=SupportCase.Kind.GENERAL,
            priority=SupportCase.Priority.NORMAL,
            status=SupportCase.Status.OPEN,
            subject="Bay help",
        )

    def test_accounts_vehicles_cases_scoped(self):
        self.assertEqual(list(accounts_for(self.agent)), [self.account])
        self.assertEqual(list(vehicles_for(self.agent)), [self.vehicle])
        self.assertEqual(cases_for(self.agent).count(), 1)

    def test_alerts_api_scoped(self):
        client = APIClient()
        tokens = issue_tokens(self.agent)
        client.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens['access']}")
        res = client.get("/api/v1/operations/alerts/")
        self.assertEqual(res.status_code, 200, res.content)
        body = res.json()
        rows = body.get("results") or body
        messages = {row["message"] for row in rows}
        self.assertIn("Yaba alert", messages)
        self.assertNotIn("Ikeja alert", messages)
