from django.test import TestCase
from rest_framework.test import APIClient

from accounts.models import Account, User
from audit.models import AuditEvent
from mobility.models import BatteryType, Vehicle, VehicleModel
from mobility.services.vehicles.service import VehicleService


class VehicleAdminApiTests(TestCase):
    def setUp(self):
        self.admin = User.objects.create(
            email="veh-admin@test.eco",
            role=User.Role.SUPER_ADMIN,
            is_staff=True,
            is_superuser=True,
        )
        self.owner = User.objects.create(phone="+2348099990001", role=User.Role.DRIVER)
        self.account = Account.objects.create(
            owner_user=self.owner,
            display_name="Fleet One",
            kura_id="KR-VEH1",
        )
        self.btype = BatteryType.objects.create(name="Veh Pack", manufacturer="KURA")
        self.model = VehicleModel.objects.create(
            make="Spiro", model="E1", battery_type=self.btype
        )
        self.client = APIClient()
        self.client.force_authenticate(self.admin)

    def test_create_lists_and_audits(self):
        vehicle = VehicleService.create(
            data={
                "account_id": self.account.id,
                "vehicle_model_id": self.model.id,
                "registration_plate": "ABC-123-XY",
                "hardware_id": "mcu-admin-44",
            },
            actor=self.admin,
        )
        self.assertTrue(
            AuditEvent.objects.filter(
                action="vehicle.created", subject_id=str(vehicle.id)
            ).exists()
        )
        res = self.client.get("/api/v1/mobility/vehicles/")
        self.assertEqual(res.status_code, 200)
        plates = [r["registration_plate"] for r in res.data["results"]]
        self.assertIn("ABC-123-XY", plates)
        search = self.client.get(
            "/api/v1/mobility/vehicles/",
            {"search": "MCU-ADMIN-44"},
        )
        self.assertEqual(search.status_code, 200)
        self.assertEqual(search.data["results"][0]["id"], str(vehicle.id))

    def test_stats_and_status(self):
        vehicle = Vehicle.objects.create(
            account=self.account,
            vehicle_model=self.model,
            registration_plate="STS-001-XY",
        )
        res = self.client.get("/api/v1/mobility/vehicles/stats/")
        self.assertEqual(res.status_code, 200)
        self.assertGreaterEqual(res.data["totals"]["all"], 1)
        res = self.client.post(
            f"/api/v1/mobility/vehicles/{vehicle.id}/status/",
            {"status": "SUSPENDED"},
            format="json",
        )
        self.assertEqual(res.status_code, 200)
        vehicle.refresh_from_db()
        self.assertEqual(vehicle.status, Vehicle.Status.SUSPENDED)


class VehicleRiderCreateTests(TestCase):
    def setUp(self):
        self.owner = User.objects.create(
            phone="+2348099990011",
            role=User.Role.DRIVER,
            onboarding_step=User.OnboardingStep.VEHICLE,
        )
        self.account = Account.objects.create(
            owner_user=self.owner,
            display_name="Rider Fleet",
            kura_id="KR-RDR1",
        )
        self.btype = BatteryType.objects.create(name="Rider Pack", manufacturer="KURA")
        self.model = VehicleModel.objects.create(
            make="Spiro", model="Rider", battery_type=self.btype
        )
        self.client = APIClient()
        self.client.force_authenticate(self.owner)

    def test_rider_creates_own_vehicle(self):
        res = self.client.post(
            "/api/v1/mobility/vehicles/",
            {
                "vehicle_model_id": str(self.model.id),
                "registration_plate": "LSR-900-AB",
                "hardware_id": "mcu-rider-19",
            },
            format="json",
        )
        self.assertEqual(res.status_code, 201, res.content)
        body = res.json()
        self.assertEqual(body["registration_plate"], "LSR-900-AB")
        self.assertEqual(body["hardware_id"], "MCU-RIDER-19")
        self.assertEqual(body["account_id"], str(self.account.id))
        self.owner.refresh_from_db()
        self.assertEqual(
            self.owner.onboarding_step,
            User.OnboardingStep.PLAN,
        )
        self.assertTrue(
            AuditEvent.objects.filter(
                action="vehicle.created", subject_id=body["id"]
            ).exists()
        )


class HubDiscoverTests(TestCase):
    def setUp(self):
        self.driver = User.objects.create(phone="+2348099990002", role=User.Role.DRIVER)
        from mobility.models import Hub

        Hub.objects.create(
            code="HUB-DISC-1",
            name="Discover Hub",
            address="Lagos",
            status="ONLINE",
        )
        self.client = APIClient()
        self.client.force_authenticate(self.driver)

    def test_driver_can_discover_hubs(self):
        res = self.client.get("/api/v1/mobility/hubs/discover/")
        self.assertEqual(res.status_code, 200)
        self.assertTrue(any(r["code"] == "HUB-DISC-1" for r in res.data))
