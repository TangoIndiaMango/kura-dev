"""Reservation QR is minted once, sealed, and revealed identically on read."""
from datetime import timedelta

from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from accounts.models import Account, Driver, User
from accounts.services.auth import issue_tokens
from accounts.services.roles import RoleService
from core.helpers.crypto_qr import token_hash
from mobility.models import (
    Battery,
    BatteryType,
    Hub,
    HubSlot,
    Reservation,
    Vehicle,
    VehicleModel,
)
from mobility.services.plans.pricing import PricingService
from mobility.services.reservations.qr_token import (
    issue_reservation_qr,
    reveal_reservation_qr,
)
from mobility.services.reservations.service import ReservationService


class ReservationQrPersistTests(TestCase):
    def setUp(self):
        RoleService.sync_catalog()
        PricingService.ensure_defaults()
        self.owner = User.objects.create(
            phone="+2348099900100",
            role=User.Role.DRIVER,
            first_name="Qr",
            last_name="Driver",
        )
        self.owner.set_password("driverpass123")
        self.owner.save()
        self.account = Account.objects.create(
            owner_user=self.owner,
            kura_id="KR-QR01",
            display_name="QR Driver",
            status=Account.Status.ACTIVE,
            kyc_status=Account.KycStatus.VERIFIED,
        )
        self.driver = Driver.objects.create(user=self.owner, account=self.account)
        self.hub = Hub.objects.create(
            code="HUB-QR-01",
            name="QR Hub",
            address="Lagos",
            lat=6.5,
            lng=3.3,
            slot_count=4,
            status=Hub.Status.ONLINE,
        )
        bt = BatteryType.objects.create(name="QrType", manufacturer="KURA")
        self.ready = Battery.objects.create(
            serial="BAT-QR-READY",
            battery_type=bt,
            status=Battery.Status.AVAILABLE,
            charge_pct=100,
            current_hub=self.hub,
        )
        HubSlot.objects.create(
            hub=self.hub,
            slot_no=1,
            battery=self.ready,
            state=HubSlot.State.READY,
        )
        vm = VehicleModel.objects.create(make="Kura", model="Qr", battery_type=bt)
        self.vehicle = Vehicle.objects.create(
            account=self.account,
            vehicle_model=vm,
            registration_plate="LAG-QR-1",
            status=Vehicle.Status.ACTIVE,
        )
        tokens = issue_tokens(self.owner)
        self.client = APIClient()
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens['access']}")

    def test_create_seals_and_retrieve_returns_same_qr(self):
        reservation = ReservationService.create_reservation(
            account=self.account,
            vehicle=self.vehicle,
            driver=self.driver,
            hub=self.hub,
            payment_mode=Reservation.PaymentMode.CASH,
        )
        issued = reveal_reservation_qr(reservation)
        self.assertTrue(issued)
        self.assertTrue(issued.startswith("v1."))
        self.assertEqual(reservation.token_hash, token_hash(issued))
        self.assertTrue(reservation.token_ciphertext)

        res = self.client.get(f"/api/v1/mobility/reservations/{reservation.id}/")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()["qr"], issued)

        fresh = Reservation.objects.get(pk=reservation.id)
        self.assertIsNone(getattr(fresh, "_qr_token", None))
        self.assertEqual(reveal_reservation_qr(fresh), issued)

    def test_extend_reissues_qr_once(self):
        reservation = ReservationService.create_reservation(
            account=self.account,
            vehicle=self.vehicle,
            driver=self.driver,
            hub=self.hub,
            payment_mode=Reservation.PaymentMode.CASH,
        )
        before = reveal_reservation_qr(reservation)
        extended = ReservationService.extend_reservation(
            reservation=reservation,
            minutes=5,
            actor=self.owner,
        )
        after = reveal_reservation_qr(extended)
        self.assertTrue(after)
        self.assertNotEqual(before, after)
        self.assertEqual(extended.token_hash, token_hash(after))
        self.assertEqual(
            self.client.get(f"/api/v1/mobility/reservations/{extended.id}/").json()[
                "qr"
            ],
            after,
        )

    def test_reveal_rejects_hash_mismatch(self):
        reservation = Reservation.objects.create(
            account=self.account,
            vehicle=self.vehicle,
            driver=self.driver,
            hub=self.hub,
            code="KB-QRBAD",
            status=Reservation.Status.CONFIRMED,
            payment_mode=Reservation.PaymentMode.CASH,
            expires_at=timezone.now() + timedelta(minutes=15),
        )
        issue_reservation_qr(reservation=reservation)
        reservation.save(update_fields=["token_hash", "token_ciphertext"])
        reservation.token_hash = "0" * 64
        reservation.save(update_fields=["token_hash"])
        self.assertIsNone(reveal_reservation_qr(reservation))
