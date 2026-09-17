"""Seed driver account, wallet, KYC docs with real Unsplash preview URLs."""
from __future__ import annotations

from accounts.models import Account, Driver, User
from core.management.commands.seed_data.identity_media import ensure_verified_identity
from finance.models import VirtualAccount, Wallet
from mobility.models import BatteryType


def seed_account_and_wallet(*, driver_user: User) -> tuple[Account, Driver, BatteryType]:
    account, _ = Account.objects.get_or_create(
        owner_user=driver_user,
        defaults={
            "kura_id": "KR-882194",
            "display_name": "Ibrahim Musa (Express Rider)",
            "kind": Account.Kind.INDIVIDUAL,
            "status": Account.Status.ACTIVE,
            "kyc_status": Account.KycStatus.VERIFIED,
        },
    )
    ensure_verified_identity(
        account=account,
        user=driver_user,
        id_number="12345678901",
    )
    driver_profile = Driver.objects.get(user=driver_user)
    if not driver_profile.license_number:
        driver_profile.license_number = "LS-8921-OK"
        driver_profile.save(update_fields=["license_number", "updated_at"])

    Wallet.objects.get_or_create(
        account=account,
        defaults={"balance_kobo": 1_500_000, "hold_kobo": 0},
    )
    VirtualAccount.objects.get_or_create(
        account=account,
        defaults={
            "nuban": "9910482910",
            "bank_name": "Wema Bank",
            "account_name": "KURA / Ibrahim Musa",
            "psp_reference": "seed-demo-dva",
            "status": VirtualAccount.Status.ACTIVE,
        },
    )
    b_type, created = BatteryType.objects.get_or_create(
        name="Kura PowerCore 72V 45Ah",
        defaults={
            "manufacturer": "KURA Energy Labs",
            "capacity_kwh": 3.24,
            "nominal_voltage": 72,
            "vehicle_type": "MOTORCYCLE",
            "usable_energy_wh": 2900,
            "wh_per_km": 50,
        },
    )
    if not created:
        b_type.usable_energy_wh = 2900
        b_type.wh_per_km = 50
        b_type.manufacturer = "KURA Energy Labs"
        b_type.save(
            update_fields=[
                "usable_energy_wh",
                "wh_per_km",
                "manufacturer",
                "updated_at",
            ]
        )
    return account, driver_profile, b_type
