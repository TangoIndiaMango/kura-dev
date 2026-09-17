"""Segment CRM + criteria preview."""
from __future__ import annotations

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from accounts.models import Account
from audit.models import AuditEvent
from credit.models import Segment
from credit.services.segment_crud import SegmentService
from credit.services.segments import preview_segment, resolve_account_ids_for_segment

User = get_user_model()


class SegmentCriteriaTests(TestCase):
    def setUp(self):
        self.owner = User.objects.create_user(
            phone="+2348033300001", password="x", first_name="A", last_name="B"
        )
        self.account = Account.objects.create(
            owner_user=self.owner,
            display_name="Seg Rider",
            kyc_status=Account.KycStatus.VERIFIED,
            status=Account.Status.ACTIVE,
        )

    def test_preview_counts_matches(self):
        data = preview_segment(
            segment_criteria={"status": "ACTIVE", "kyc_status": "VERIFIED"}
        )
        self.assertGreaterEqual(data["count"], 1)
        self.assertIn(str(self.account.id), data["sample_account_ids"])
        sample_ids = {row["id"] for row in data["sample"]}
        self.assertIn(str(self.account.id), sample_ids)
        row = next(r for r in data["sample"] if r["id"] == str(self.account.id))
        self.assertEqual(row["display_name"], "Seg Rider")
        self.assertEqual(row["phone"], "+2348033300001")

    def test_resolve_via_saved_segment(self):
        seg = SegmentService.create(
            name="Verified active",
            criteria={"status": "ACTIVE", "kyc_status": "VERIFIED"},
            status=Segment.Status.ACTIVE,
            actor=self.owner,
        )
        ids = resolve_account_ids_for_segment(
            segment_criteria={"segment_id": str(seg.id)}
        )
        self.assertIn(self.account.id, ids)


class SegmentApiTests(TestCase):
    def setUp(self):
        self.ops = User.objects.create_user(
            phone="+2348033300002",
            password="x",
            role="COMMERCIAL_ADMIN",
            first_name="C",
            last_name="A",
            is_staff=True,
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.ops)
        self.owner = User.objects.create_user(
            phone="+2348033300003", password="x", first_name="R", last_name="I"
        )
        Account.objects.create(
            owner_user=self.owner,
            display_name="Target",
            kyc_status=Account.KycStatus.VERIFIED,
            status=Account.Status.ACTIVE,
        )

    def test_create_list_preview_and_audit(self):
        preview = self.client.post(
            "/api/v1/segments/preview/",
            {"criteria": {"status": "ACTIVE"}},
            format="json",
        )
        self.assertEqual(preview.status_code, 200)
        self.assertIn("count", preview.json())

        create = self.client.post(
            "/api/v1/segments/",
            {
                "name": "Active riders",
                "criteria": {"status": "ACTIVE"},
                "status": "ACTIVE",
            },
            format="json",
        )
        self.assertEqual(create.status_code, 201, create.content)
        body = create.json()
        self.assertEqual(body["name"], "Active riders")
        self.assertGreaterEqual(body["last_count"], 1)

        listing = self.client.get("/api/v1/segments/")
        self.assertEqual(listing.status_code, 200)
        payload = listing.json()
        count = payload.get("count", len(payload.get("results", [])))
        self.assertGreaterEqual(count, 1)

        self.assertTrue(
            AuditEvent.objects.filter(
                action="segment.created", subject_id=body["id"]
            ).exists()
        )

        members = self.client.get(f"/api/v1/segments/{body['id']}/members/")
        self.assertEqual(members.status_code, 200, members.content)
        payload = members.json()
        results = payload.get("results", payload if isinstance(payload, list) else [])
        self.assertGreaterEqual(len(results), 1)
        self.assertIn("display_name", results[0])
        self.assertIn("phone", results[0])
