"""Discount campaign admin API."""
from __future__ import annotations

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from audit.models import AuditEvent

User = get_user_model()


class DiscountApiTests(TestCase):
    def setUp(self):
        self.ops = User.objects.create_user(
            phone="+2348033400001",
            password="x",
            role="COMMERCIAL_ADMIN",
            first_name="C",
            last_name="A",
            is_staff=True,
        )
        self.approver = User.objects.create_user(
            phone="+2348033400002",
            password="x",
            role="OPS_MANAGER",
            first_name="O",
            last_name="M",
            is_staff=True,
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.ops)

    def test_create_list_and_audit(self):
        create = self.client.post(
            "/api/v1/mobility/discounts/",
            {
                "name": "Fleet 8",
                "code": "FLEET-8",
                "value_type": "PERCENT",
                "value": 8,
                "applies_to_all_plans": True,
                "plan_option_ids": [],
                "periods": ["weekly", "monthly"],
                "audience": "ALL",
                "channels": "App · USSD · Hub",
                "summary": "8% fleet test",
            },
            format="json",
        )
        self.assertEqual(create.status_code, 201, create.content)
        body = create.json()
        self.assertEqual(body["code"], "FLEET-8")
        self.assertEqual(body["status"], "DRAFT")

        listing = self.client.get("/api/v1/mobility/discounts/")
        self.assertEqual(listing.status_code, 200)
        payload = listing.json()
        count = payload.get("count", len(payload.get("results", [])))
        self.assertGreaterEqual(count, 1)

        self.assertTrue(
            AuditEvent.objects.filter(
                action="discount.created", subject_id=body["id"]
            ).exists()
        )

        self.client.force_authenticate(user=self.approver)
        activate = self.client.post(
            f"/api/v1/mobility/discounts/{body['id']}/activate/",
            {},
            format="json",
        )
        self.assertEqual(activate.status_code, 200, activate.content)
        self.assertEqual(activate.json()["status"], "ACTIVE")
        self.assertTrue(
            AuditEvent.objects.filter(
                action="discount.activated", subject_id=body["id"]
            ).exists()
        )

    def test_creator_cannot_self_activate(self):
        from core.exceptions import DomainError
        from mobility.models import DiscountCampaign
        from mobility.services.plans.discounts import DiscountService

        discount = DiscountCampaign.objects.create(
            name="Self block",
            code="SELF-BLOCK",
            value_type=DiscountCampaign.ValueType.PERCENT,
            value=5,
            status=DiscountCampaign.Status.DRAFT,
            created_by=self.approver,
            audience=DiscountCampaign.Audience.ALL,
            periods=["weekly"],
        )
        with self.assertRaises(DomainError) as ctx:
            DiscountService.activate(discount=discount, actor=self.approver)
        self.assertEqual(ctx.exception.code, "APPROVAL_FORBIDDEN")

    def test_super_admin_can_self_activate(self):
        super_admin = User.objects.create_user(
            phone="+2348033400003",
            password="x",
            role="SUPER_ADMIN",
            first_name="S",
            last_name="A",
            is_staff=True,
            is_superuser=True,
        )
        self.client.force_authenticate(user=super_admin)
        create = self.client.post(
            "/api/v1/mobility/discounts/",
            {
                "name": "Super self",
                "code": "SUPER-SELF",
                "value_type": "PERCENT",
                "value": 5,
                "applies_to_all_plans": True,
                "plan_option_ids": [],
                "periods": ["weekly"],
                "audience": "ALL",
                "channels": "App",
            },
            format="json",
        )
        self.assertEqual(create.status_code, 201, create.content)
        discount_id = create.json()["id"]
        activate = self.client.post(
            f"/api/v1/mobility/discounts/{discount_id}/activate/",
            {},
            format="json",
        )
        self.assertEqual(activate.status_code, 200, activate.content)
        self.assertEqual(activate.json()["status"], "ACTIVE")
        audit = AuditEvent.objects.filter(
            action="discount.activated", subject_id=discount_id
        ).first()
        self.assertIsNotNone(audit)
        self.assertTrue(audit.metadata.get("self_approved"))
        self.assertTrue(audit.metadata.get("maker_checker_bypass"))
