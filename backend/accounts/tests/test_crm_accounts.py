"""Accounts CRM list/detail contracts — owned fields + related ids only."""
from django.test import TestCase
from rest_framework.test import APIClient

from accounts.models import Account, Driver, IdentityDocument, Permission, Role, User
from accounts.services.auth import issue_tokens
from mobility.models import BatteryType, Vehicle, VehicleModel


class AccountsCrmApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = User.objects.create(
            email="crm-admin@test.eco",
            role=User.Role.SUPER_ADMIN,
            is_staff=True,
            is_superuser=True,
            first_name="Crm",
            last_name="Admin",
        )
        self.admin.set_password("adminpass123")
        self.admin.save()
        tokens = issue_tokens(self.admin)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens['access']}")

        self.owner = User.objects.create(
            phone="+2348012220001",
            email="rider@test.eco",
            role=User.Role.DRIVER,
            first_name="Yusuf",
            last_name="Abdullahi",
        )
        self.account = Account.objects.create(
            owner_user=self.owner,
            display_name="Yusuf Abdullahi",
            status=Account.Status.ACTIVE,
            kyc_status=Account.KycStatus.PENDING,
            kind=Account.Kind.INDIVIDUAL,
            registration_channel=Account.RegistrationChannel.APP,
        )
        self.driver = Driver.objects.create(user=self.owner, account=self.account)
        IdentityDocument.objects.create(
            account=self.account,
            doc_type=IdentityDocument.DocType.NIN,
            number_last4="4321",
            status=IdentityDocument.Status.PENDING,
        )

    def test_list_is_accounts_owned_scalars(self):
        res = self.client.get("/api/v1/accounts/")
        self.assertEqual(res.status_code, 200)
        body = res.json()
        self.assertGreaterEqual(body["count"], 1)
        row = next(r for r in body["results"] if r["id"] == str(self.account.id))

        self.assertEqual(row["kura_id"], self.account.kura_id)
        self.assertEqual(row["display_name"], "Yusuf Abdullahi")
        self.assertEqual(row["phone"], "+2348012220001")
        self.assertEqual(row["email"], "rider@test.eco")
        self.assertEqual(row["kyc_status"], "PENDING")
        self.assertEqual(row["id_type"], "NIN")
        self.assertEqual(row["id_last4"], "4321")
        self.assertEqual(row["registration_channel"], "APP")

        forbidden = {
            "wallet_id",
            "vehicle_ids",
            "driver_ids",
            "owner_user_id",
        }
        self.assertTrue(forbidden.isdisjoint(row.keys()))
        self.assertIn("primary_vehicle_reg", row)
        self.assertIn("active_plan_name", row)
        self.assertIn("wallet_available_kobo", row)

    def test_detail_adds_related_ids_only(self):
        res = self.client.get(f"/api/v1/accounts/{self.account.id}/")
        self.assertEqual(res.status_code, 200)
        row = res.json()

        self.assertEqual(row["owner_user_id"], str(self.owner.id))
        self.assertEqual(row["driver_ids"], [str(self.driver.id)])
        self.assertIn("wallet_id", row)
        self.assertIn("vehicle_ids", row)
        self.assertIsInstance(row["vehicle_ids"], list)

        forbidden = {
            "wallet_status",
            "wallet_standing",
        }
        self.assertTrue(forbidden.isdisjoint(row.keys()))
        self.assertIn("primary_vehicle_reg", row)
        self.assertIn("active_plan_name", row)
        self.assertIn("wallet_available_kobo", row)

    def test_detail_stats_accounts_owned(self):
        res = self.client.get(f"/api/v1/accounts/{self.account.id}/stats/")
        self.assertEqual(res.status_code, 200)
        body = res.json()
        self.assertEqual(body["status"], "ACTIVE")
        self.assertEqual(body["kyc_status"], "PENDING")
        self.assertEqual(body["drivers_count"], 1)
        self.assertEqual(body["identity_docs_count"], 1)
        self.assertIn("swaps_count", body)
        self.assertIn("daily_metrics", body)
        self.assertIn("energy_kwh_total", body)
        self.assertIn("fuel_saved_kobo", body)
        self.assertNotIn("standing", body)
        self.assertNotIn("wallet_balance_kobo", body)
        self.assertNotIn("primary_vehicle_reg", body)
        self.assertNotIn("active_plan_name", body)

        # Test bounded query params
        res_bounded = self.client.get(
            f"/api/v1/accounts/{self.account.id}/stats/?start_date=2026-09-01&end_date=2026-09-07"
        )
        self.assertEqual(res_bounded.status_code, 200)
        bounded_body = res_bounded.json()
        self.assertEqual(bounded_body["start_date"], "2026-09-01")
        self.assertEqual(bounded_body["end_date"], "2026-09-07")
        self.assertEqual(len(bounded_body["daily_metrics"]), 7)

    def test_search_by_vehicle_hardware_id(self):
        battery_type = BatteryType.objects.create(
            name="CRM Search Pack",
            manufacturer="KURA",
        )
        model = VehicleModel.objects.create(
            make="Kura",
            model="Search",
            battery_type=battery_type,
        )
        Vehicle.objects.create(
            account=self.account,
            vehicle_model=model,
            registration_plate="CRM-908-X",
            hardware_id="MCU-CRM-908",
        )

        response = self.client.get(
            "/api/v1/accounts/",
            {"q": "MCU-CRM-908"},
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["results"][0]["id"], str(self.account.id))

    def test_export_accounts_columns_only(self):
        res = self.client.get("/api/v1/accounts/export/")
        self.assertEqual(res.status_code, 200)
        header = res.content.decode().splitlines()[0]
        self.assertIn("kura_id", header)
        self.assertIn("registration_channel", header)
        self.assertNotIn("wallet_standing", header)
        self.assertNotIn("primary_vehicle_reg", header)
        self.assertNotIn("active_plan_name", header)

    def test_staff_cannot_patch_display_name(self):
        res = self.client.patch(
            f"/api/v1/accounts/{self.account.id}/",
            {"display_name": "Yusuf Rider"},
            format="json",
        )
        self.assertEqual(res.status_code, 403)
        self.account.refresh_from_db()
        self.assertEqual(self.account.display_name, "Yusuf Abdullahi")

    def test_wallet_balance_hidden_from_crm(self):
        res = self.client.get("/api/v1/accounts/")
        self.assertEqual(res.status_code, 200)
        row = next(r for r in res.json()["results"] if r["id"] == str(self.account.id))
        self.assertIsNone(row["wallet_available_kobo"])
