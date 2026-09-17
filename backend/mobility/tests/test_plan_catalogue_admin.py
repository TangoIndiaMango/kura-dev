"""Plan catalogue admin write API tests."""
from __future__ import annotations

from django.test import TestCase
from rest_framework.test import APIClient

from accounts.models import User
from accounts.services.auth import issue_tokens
from audit.models import AuditEvent
from mobility.models import Plan, VehicleType
from mobility.services.plans.pricing import PricingService


class PlanCatalogueAdminTests(TestCase):
    def setUp(self):
        PricingService.ensure_defaults()
        self.admin = User.objects.create(
            email="plans.admin@test.eco",
            role=User.Role.SUPER_ADMIN,
            is_staff=True,
            is_superuser=True,
        )
        self.admin.set_password("x")
        self.admin.save()
        tokens = issue_tokens(self.admin)
        self.client = APIClient()
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens['access']}")

    def test_create_deactivate_activate_emits_audit(self):
        res = self.client.post(
            "/api/v1/mobility/plans/",
            {
                "code": "PLAN-TEST-DAY",
                "name": "Test Daily",
                "vehicle_type": VehicleType.MOTORCYCLE,
                "period": Plan.Period.DAY,
                "duration_days": 1,
                "swap_allowance": 2,
                "price_kobo": 99_000,
                "description": "test",
                "auto_renew_default": False,
            },
            format="json",
        )
        self.assertEqual(res.status_code, 201, res.content)
        plan_id = res.data["id"]
        self.assertTrue(
            AuditEvent.objects.filter(
                action="plan.created", subject_id=str(plan_id)
            ).exists()
        )

        de = self.client.post(f"/api/v1/mobility/plans/{plan_id}/deactivate/")
        self.assertEqual(de.status_code, 200, de.content)
        self.assertEqual(de.data["status"], "DEACTIVATED")
        self.assertFalse(de.data["is_active"])
        self.assertTrue(
            AuditEvent.objects.filter(
                action="plan.deactivated", subject_id=str(plan_id)
            ).exists()
        )

        ac = self.client.post(f"/api/v1/mobility/plans/{plan_id}/activate/")
        self.assertEqual(ac.status_code, 200, ac.content)
        self.assertEqual(ac.data["status"], "ACTIVE")
        self.assertTrue(ac.data["is_active"])
        self.assertTrue(
            AuditEvent.objects.filter(
                action="plan.activated", subject_id=str(plan_id)
            ).exists()
        )

    def test_operator_can_list_active_but_not_create(self):
        rider = User.objects.create(phone="+2348019990001", role=User.Role.DRIVER)
        tokens = issue_tokens(rider)
        client = APIClient()
        client.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens['access']}")
        listed = client.get("/api/v1/mobility/plans/")
        self.assertEqual(listed.status_code, 200)
        created = client.post(
            "/api/v1/mobility/plans/",
            {
                "code": "NOPE",
                "name": "Nope",
                "vehicle_type": VehicleType.BOAT,
                "period": Plan.Period.DAY,
                "price_kobo": 1,
            },
            format="json",
        )
        self.assertIn(created.status_code, (403, 401))
