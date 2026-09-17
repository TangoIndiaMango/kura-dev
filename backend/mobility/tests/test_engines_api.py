"""Path B retrofit + engine custody API."""
from __future__ import annotations

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from accounts.models import Account
from accounts.services.roles import RoleService
from audit.models import AuditEvent
from mobility.models import (
    BatteryType,
    Hub,
    PetrolEngine,
    Retrofit,
    Vehicle,
    VehicleModel,
)
from support.models import SupportCase

User = get_user_model()


class EngineRetrofitApiTests(TestCase):
    def setUp(self):
        RoleService.sync_catalog()
        self.ops = User.objects.create_user(
            phone="+2348033500001",
            password="x",
            role="OPS_MANAGER",
            first_name="Ops",
            last_name="Mgr",
            is_staff=True,
        )
        self.agent = User.objects.create_user(
            phone="+2348033500002",
            password="x",
            role="HUB_AGENT",
            first_name="Hub",
            last_name="Agent",
            is_staff=True,
        )
        self.driver = User.objects.create_user(
            phone="+2348033500003",
            password="x",
            role="DRIVER",
            first_name="Rider",
            last_name="One",
        )
        self.account = Account.objects.create(
            owner_user=self.driver,
            display_name="Makoko Boat Co",
            kura_id="KR-ENGAPI",
        )
        self.hub = Hub.objects.create(
            code="HUB-API-01", name="Yaba Yard", address="Yaba"
        )
        btype = BatteryType.objects.create(name="Boat Pack", manufacturer="KURA")
        model = VehicleModel.objects.create(
            make="Silversun", model="Canoe EB", battery_type=btype, vehicle_type="BOAT"
        )
        self.vehicle = Vehicle.objects.create(
            account=self.account,
            vehicle_model=model,
            registration_plate="MK-BOAT-99",
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.agent)

    def test_full_wizard_and_release_audit(self):
        create = self.client.post(
            "/api/v1/mobility/retrofits/",
            {
                "account_id": str(self.account.id),
                "vehicle_id": str(self.vehicle.id),
            },
            format="json",
        )
        self.assertEqual(create.status_code, 201, create.content)
        rid = create.json()["id"]
        open_jobs = self.client.get(
            "/api/v1/mobility/retrofits/?awaiting_intake=1"
        )
        self.assertEqual(open_jobs.status_code, 200, open_jobs.content)
        ids = [r["id"] for r in open_jobs.json()["results"]]
        self.assertIn(rid, ids)
        self.vehicle.refresh_from_db()
        self.assertEqual(
            self.vehicle.acquisition_path, Vehicle.AcquisitionPath.ENGINE_SWAP
        )
        self.assertTrue(
            AuditEvent.objects.filter(action="retrofit.created", subject_id=rid).exists()
        )

        intake = self.client.post(
            f"/api/v1/mobility/retrofits/{rid}/engine-intake/",
            {
                "tag": "PE-API-001",
                "make": "Yamaha",
                "model": "15HP",
                "hp": "15",
                "condition_grade": "FAIR",
                "witness_user_id": str(self.ops.id),
                "photo_asset_ids": ["cld_hull_1", "cld_engine_1"],
                "signature_asset_id": "cld_sig_1",
                "storage_hub_id": str(self.hub.id),
                "raw": {"oem_serial": "YMH-SEED"},
            },
            format="json",
        )
        self.assertEqual(intake.status_code, 200, intake.content)
        engine_id = intake.json()["petrol_engine_id"]
        self.assertTrue(
            AuditEvent.objects.filter(
                action="engine.intake", subject_id=engine_id
            ).exists()
        )

        install = self.client.post(
            f"/api/v1/mobility/retrofits/{rid}/install/",
            {"eboarder_serial": "EB-API-900"},
            format="json",
        )
        self.assertEqual(install.status_code, 200, install.content)
        self.assertEqual(install.json()["status"], "INSTALLED")

        checks = {
            "hull": True,
            "mount": True,
            "throttle": True,
            "kill": True,
            "cable": True,
            "float": True,
        }
        checklist = self.client.post(
            f"/api/v1/mobility/retrofits/{rid}/checklist/",
            {"checklist": checks},
            format="json",
        )
        self.assertEqual(checklist.status_code, 200, checklist.content)
        self.assertEqual(checklist.json()["status"], "CHECKED")

        activate = self.client.post(
            f"/api/v1/mobility/retrofits/{rid}/activate/",
            {},
            format="json",
        )
        self.assertEqual(activate.status_code, 200, activate.content)
        self.assertEqual(activate.json()["status"], "ACTIVATED")
        self.assertTrue(
            AuditEvent.objects.filter(
                action="retrofit.activated", subject_id=rid
            ).exists()
        )

        self.client.force_authenticate(user=self.ops)
        release_req = self.client.post(
            f"/api/v1/mobility/engines/{engine_id}/release-request/",
            {"note": "Owner reclaiming for sale"},
            format="json",
        )
        self.assertEqual(release_req.status_code, 200, release_req.content)
        self.assertEqual(release_req.json()["status"], "RELEASE_REQUESTED")
        self.assertTrue(
            SupportCase.objects.filter(
                kind=SupportCase.Kind.ENGINE_RELEASE,
                account=self.account,
            ).exists()
        )

        release = self.client.post(
            f"/api/v1/mobility/engines/{engine_id}/release/",
            {
                "photo_asset_ids": ["cld_release_1"],
                "signature_asset_id": "cld_release_sig",
            },
            format="json",
        )
        self.assertEqual(release.status_code, 200, release.content)
        self.assertEqual(release.json()["status"], "RELEASED")
        self.assertTrue(
            AuditEvent.objects.filter(
                action="engine.released", subject_id=engine_id
            ).exists()
        )

    def test_agent_cannot_release(self):
        engine = PetrolEngine.objects.create(
            account=self.account,
            tag="PE-NOREL",
            status=PetrolEngine.Status.RELEASE_REQUESTED,
        )
        self.client.force_authenticate(user=self.agent)
        res = self.client.post(
            f"/api/v1/mobility/engines/{engine.id}/release/",
            {"photo_asset_ids": ["cld_x"]},
            format="json",
        )
        self.assertEqual(res.status_code, 403)

    def test_driver_lists_own_engines_and_requests_release(self):
        engine = PetrolEngine.objects.create(
            account=self.account,
            tag="PE-OWN-01",
            make="Yamaha",
            model="F15",
            hp="15",
            status=PetrolEngine.Status.STORED,
            storage_hub=self.hub,
        )
        other = Account.objects.create(
            owner_user=User.objects.create_user(
                phone="+2348033500099", password="x", role="DRIVER"
            ),
            display_name="Other",
            kura_id="KR-OTHER",
        )
        PetrolEngine.objects.create(
            account=other,
            tag="PE-OTHER",
            status=PetrolEngine.Status.STORED,
        )
        self.client.force_authenticate(user=self.driver)
        listed = self.client.get("/api/v1/mobility/engines/")
        self.assertEqual(listed.status_code, 200, listed.content)
        tags = {row["tag"] for row in listed.json()["results"]}
        self.assertEqual(tags, {"PE-OWN-01"})
        own_row = next(r for r in listed.json()["results"] if r["tag"] == "PE-OWN-01")
        self.assertIn("eboarder_serial", own_row)
        self.assertEqual(own_row["eboarder_serial"], "")

        req = self.client.post(
            f"/api/v1/mobility/engines/{engine.id}/release-request/",
            {"note": "Need engine back for dry dock"},
            format="json",
        )
        self.assertEqual(req.status_code, 200, req.content)
        self.assertEqual(req.json()["status"], "RELEASE_REQUESTED")
        self.assertTrue(
            SupportCase.objects.filter(
                kind=SupportCase.Kind.ENGINE_RELEASE,
                account=self.account,
            ).exists()
        )
        self.assertTrue(
            AuditEvent.objects.filter(
                action="engine.release_requested",
                subject_id=str(engine.id),
            ).exists()
        )

    def test_driver_cannot_release_ops_only(self):
        engine = PetrolEngine.objects.create(
            account=self.account,
            tag="PE-DRV-REL",
            status=PetrolEngine.Status.RELEASE_REQUESTED,
        )
        self.client.force_authenticate(user=self.driver)
        res = self.client.post(
            f"/api/v1/mobility/engines/{engine.id}/release/",
            {"photo_asset_ids": ["cld_x"]},
            format="json",
        )
        self.assertEqual(res.status_code, 403)

    def test_self_witness_rejected(self):
        create = self.client.post(
            "/api/v1/mobility/retrofits/",
            {
                "account_id": str(self.account.id),
                "vehicle_id": str(self.vehicle.id),
            },
            format="json",
        )
        rid = create.json()["id"]
        bad = self.client.post(
            f"/api/v1/mobility/retrofits/{rid}/engine-intake/",
            {
                "tag": "PE-SAME",
                "witness_user_id": str(self.agent.id),
                "photo_asset_ids": ["cld_1"],
                "signature_asset_id": "cld_sig",
            },
            format="json",
        )
        self.assertEqual(bad.status_code, 400)
        self.assertEqual(Retrofit.objects.get(pk=rid).status, Retrofit.Status.INTAKE)
