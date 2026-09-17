"""Bay reservation lookup F4 envelope + hub mismatch."""
from datetime import timedelta

from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from accounts.models import Account, Driver, User
from accounts.services.auth import issue_tokens
from accounts.services.roles import RoleService
from mobility.models import BatteryType, Hub, Reservation, Vehicle, VehicleModel
from mobility.services.reservations.qr_token import issue_reservation_qr


class ReservationLookupTests(TestCase):
    def setUp(self):
        RoleService.sync_catalog()
        self.client = APIClient()
        self.agent = User.objects.create(
            email="bay.agent@yopmail.com",
            role=User.Role.HUB_AGENT,
            is_staff=True,
        )
        self.agent.set_password("agentpass123")
        self.agent.save()
        tokens = issue_tokens(self.agent)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens['access']}")

        self.hub = Hub.objects.create(
            code="HUB-BAY-01",
            name="Bay Hub",
            address="Lagos",
            lat=6.5,
            lng=3.3,
            slot_count=4,
            status=Hub.Status.ONLINE,
        )
        self.other_hub = Hub.objects.create(
            code="HUB-BAY-02",
            name="Other Hub",
            address="Lagos",
            status=Hub.Status.ONLINE,
        )
        owner = User.objects.create(
            phone="+2348011112233",
            role=User.Role.DRIVER,
            first_name="Bay",
            last_name="Rider",
        )
        self.account = Account.objects.create(
            owner_user=owner,
            kura_id="KR-BAY01",
            display_name="Bay Rider",
            status=Account.Status.ACTIVE,
            kyc_status=Account.KycStatus.VERIFIED,
        )
        self.driver = Driver.objects.create(user=owner, account=self.account)
        bt = BatteryType.objects.create(name="BayType", manufacturer="KURA")
        vm = VehicleModel.objects.create(make="Kura", model="Bay", battery_type=bt)
        self.vehicle = Vehicle.objects.create(
            account=self.account,
            vehicle_model=vm,
            registration_plate="LAG-BAY-1",
            status=Vehicle.Status.ACTIVE,
        )

    def _reservation(self, **kwargs) -> Reservation:
        defaults = dict(
            account=self.account,
            vehicle=self.vehicle,
            driver=self.driver,
            hub=self.hub,
            code="KB-BAY99",
            status=Reservation.Status.CONFIRMED,
            payment_mode=Reservation.PaymentMode.WALLET,
            expires_at=timezone.now() + timedelta(hours=1),
            hold_amount_kobo=45_000,
        )
        defaults.update(kwargs)
        return Reservation.objects.create(**defaults)

    def test_lookup_by_code_f4_envelope(self):
        reservation = self._reservation()
        res = self.client.post(
            "/api/v1/mobility/reservations/lookup/",
            {"code": reservation.code, "hub_id": str(self.hub.id)},
            format="json",
        )
        self.assertEqual(res.status_code, 200)
        body = res.json()
        self.assertEqual(body["reservation"]["code"], reservation.code)
        self.assertEqual(body["driver"]["name"], "Bay Rider")
        self.assertEqual(body["vehicle"]["registration"], "LAG-BAY-1")
        self.assertIn(body["triage"], {"GREEN", "AMBER", "RED"})
        self.assertTrue(body["first_swap"])

    def test_lookup_hub_mismatch(self):
        reservation = self._reservation()
        res = self.client.post(
            "/api/v1/mobility/reservations/lookup/",
            {"code": reservation.code, "hub_id": str(self.other_hub.id)},
            format="json",
        )
        self.assertEqual(res.status_code, 409)
        self.assertEqual(res.json()["error"]["code"], "RESERVATION_HUB_MISMATCH")

    def test_lookup_by_token(self):
        reservation = self._reservation()
        token = issue_reservation_qr(reservation=reservation)
        reservation.save(update_fields=["token_hash", "token_ciphertext"])
        res = self.client.post(
            "/api/v1/mobility/reservations/lookup/",
            {"token": token, "hub_id": str(self.hub.id)},
            format="json",
        )
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()["reservation"]["id"], str(reservation.id))
        self.assertEqual(res.json()["reservation"]["qr"], token)
