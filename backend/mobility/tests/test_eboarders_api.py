"""E-boarder fleet API tests."""
from __future__ import annotations

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from accounts.models import Account
from accounts.services.roles import RoleService
from audit.models import AuditEvent
from mobility.models import (
    BatteryType,
    EBoarder,
    Hub,
    Retrofit,
    Vehicle,
    VehicleModel,
)

User = get_user_model()


class EBoarderApiTests(TestCase):
    def setUp(self):
        RoleService.sync_catalog()
        self.ops = User.objects.create_user(
            phone="+2348033500201",
            password="x",
            role="OPS_MANAGER",
            first_name="Ops",
            last_name="Mgr",
            is_staff=True,
        )
        self.agent = User.objects.create_user(
            phone="+2348033500202",
            password="x",
            role="HUB_AGENT",
            first_name="Hub",
            last_name="Agent",
            is_staff=True,
        )
        self.driver = User.objects.create_user(
            phone="+2348033500203",
            password="x",
            role="DRIVER",
            first_name="Rider",
            last_name="One",
        )
        self.account = Account.objects.create(
            owner_user=self.driver,
            display_name="EBoard Co",
            kura_id="KR-EBAPI",
        )
        self.hub = Hub.objects.create(code="HUB-EB-01", name="Yard", address="Yaba")
        self.btype = BatteryType.objects.create(name="Marine Pack", manufacturer="KURA")
        model = VehicleModel.objects.create(
            make="Silversun",
            model="Canoe",
            battery_type=self.btype,
            vehicle_type="BOAT",
        )
        self.vehicle = Vehicle.objects.create(
            account=self.account,
            vehicle_model=model,
            registration_plate="MK-EB-01",
        )
        self.client = APIClient()

    def test_create_list_and_install_issues_unit(self):
        self.client.force_authenticate(user=self.ops)
        created = self.client.post(
            "/api/v1/mobility/eboarders/",
            {
                "serial": "eb-stock-01",
                "make": "Asobo",
                "model": "Lagoon 6",
                "rated_watts": 6000,
                "petrol_hp_equivalent": "15",
                "nominal_voltage_v": 48,
                "battery_type": str(self.btype.id),
                "shaft_length": "LONG",
                "current_hub": str(self.hub.id),
            },
            format="json",
        )
        self.assertEqual(created.status_code, 201, created.content)
        eid = created.json()["id"]
        self.assertEqual(created.json()["serial"], "EB-STOCK-01")
        self.assertEqual(created.json()["rated_kw"], "6")
        self.assertTrue(
            AuditEvent.objects.filter(
                action="eboarder.created", subject_id=eid
            ).exists()
        )

        listing = self.client.get("/api/v1/mobility/eboarders/?status=IN_STOCK")
        self.assertEqual(listing.status_code, 200)
        self.assertGreaterEqual(listing.json()["count"], 1)

        stats = self.client.get("/api/v1/mobility/eboarders/stats/")
        self.assertEqual(stats.status_code, 200)
        self.assertGreaterEqual(stats.json()["totals"]["in_stock"], 1)

        self.client.force_authenticate(user=self.agent)
        retrofit = Retrofit.objects.create(
            account=self.account,
            vehicle=self.vehicle,
            status=Retrofit.Status.INTAKE,
        )
        # Minimal engine link so install is allowed
        from mobility.models import PetrolEngine

        engine = PetrolEngine.objects.create(
            account=self.account,
            tag="PE-EB-TEST-1",
            storage_hub=self.hub,
            intake_agent=self.agent,
            intake_witness=self.ops,
            intake_photos=["p1"],
            intake_signature="s1",
        )
        retrofit.petrol_engine = engine
        retrofit.save(update_fields=["petrol_engine", "updated_at"])

        install = self.client.post(
            f"/api/v1/mobility/retrofits/{retrofit.id}/install/",
            {"eboarder_id": eid, "photo_asset_ids": ["inst1"]},
            format="json",
        )
        self.assertEqual(install.status_code, 200, install.content)
        self.assertEqual(install.json()["status"], "INSTALLED")
        self.assertEqual(install.json()["eboarder_serial"], "EB-STOCK-01")

        unit = EBoarder.objects.get(pk=eid)
        self.assertEqual(unit.status, EBoarder.Status.ISSUED)
        self.assertEqual(str(unit.vehicle_id), str(self.vehicle.id))
        self.assertTrue(
            AuditEvent.objects.filter(
                action="eboarder.issued", subject_id=eid
            ).exists()
        )

    def test_cap_gate(self):
        self.client.force_authenticate(user=self.driver)
        res = self.client.get("/api/v1/mobility/eboarders/")
        self.assertIn(res.status_code, (403, 404))
