"""Shared helpers for multi-persona seed (users, accounts, vehicles)."""
from __future__ import annotations

from accounts.models import Account, Driver, User
from core.management.commands.seed_data.identity_media import ensure_verified_identity
from finance.models import VirtualAccount, Wallet
from mobility.models import Battery, BatteryType, Vehicle, VehicleModel
from mobility.services.telemetry_iot import TelemetryIotService


def upsert_phone_user(
    *,
    phone: str,
    email: str,
    first_name: str,
    last_name: str,
    role: str,
    password: str,
    pin: str = "1234",
) -> User:
    user, _ = User.objects.get_or_create(
        phone=phone,
        defaults={
            "email": email,
            "first_name": first_name,
            "last_name": last_name,
            "role": role,
        },
    )
    user.email = email
    user.first_name = first_name
    user.last_name = last_name
    user.role = role
    user.set_password(password)
    user.set_pin(pin)
    user.onboarding_step = User.OnboardingStep.DONE
    if role in {User.Role.HUB_AGENT, User.Role.OPS_MANAGER, User.Role.SUPER_ADMIN}:
        user.is_staff = True
    user.save()
    return user


def ensure_account(
    *,
    owner: User,
    kura_id: str,
    display_name: str,
    kind: str,
    balance_kobo: int,
) -> tuple[Account, Driver]:
    account, _ = Account.objects.get_or_create(
        owner_user=owner,
        defaults={
            "kura_id": kura_id,
            "display_name": display_name,
            "kind": kind,
            "status": Account.Status.ACTIVE,
            "kyc_status": Account.KycStatus.VERIFIED,
        },
    )
    if account.kind != kind or account.display_name != display_name:
        account.kind = kind
        account.display_name = display_name
        account.kura_id = account.kura_id or kura_id
        account.save(update_fields=["kind", "display_name", "kura_id", "updated_at"])
    ensure_verified_identity(
        account=account, user=owner, id_number=kura_id[-11:].zfill(11)
    )
    driver, _ = Driver.objects.get_or_create(
        user=owner,
        defaults={"account": account, "status": "ACTIVE"},
    )
    if driver.account_id != account.id:
        driver.account = account
        driver.save(update_fields=["account", "updated_at"])
    Wallet.objects.get_or_create(
        account=account, defaults={"balance_kobo": balance_kobo, "hold_kobo": 0}
    )
    VirtualAccount.objects.get_or_create(
        account=account,
        defaults={
            "nuban": f"{(sum(ord(c) for c in kura_id) * 97) % 9_000_000_000 + 1_000_000_000:010d}",
            "bank_name": "Wema Bank",
            "account_name": f"KURA / {display_name[:40]}",
            "psp_reference": f"seed-dva-{kura_id}",
            "status": VirtualAccount.Status.ACTIVE,
        },
    )
    return account, driver


def ensure_vehicle(
    *,
    account: Account,
    plate: str,
    model: VehicleModel,
    battery_type: BatteryType,
    with_vcu: bool,
    hardware_id: str = "",
) -> Vehicle:
    serial = f"BAT-{plate.replace('-', '')[-6:]}"
    pack, _ = Battery.objects.get_or_create(
        serial=serial,
        defaults={
            "battery_type": battery_type,
            "status": Battery.Status.ISSUED,
            "charge_pct": 55 + (abs(hash(plate)) % 40),
            "health_pct": 97,
            "cycle_count": 10,
        },
    )
    vehicle, created = Vehicle.objects.get_or_create(
        registration_plate=plate,
        defaults={
            "account": account,
            "vehicle_model": model,
            "current_battery": pack,
            "status": Vehicle.Status.ACTIVE,
            "hardware_id": hardware_id or f"HW-{plate}",
        },
    )
    if vehicle.account_id != account.id:
        vehicle.account = account
        vehicle.save(update_fields=["account", "updated_at"])
    if vehicle.current_battery_id is None:
        vehicle.current_battery = pack
        vehicle.save(update_fields=["current_battery", "updated_at"])
    if with_vcu and not vehicle.iot_api_key_hash:
        TelemetryIotService.rotate_api_key(vehicle=vehicle, actor=None)
    if not with_vcu and vehicle.iot_api_key_hash:
        vehicle.iot_api_key_hash = ""
        vehicle.save(update_fields=["iot_api_key_hash", "updated_at"])
    if created or pack.custodian_type != Battery.Custodian.VEHICLE:
        pack.custodian_type = Battery.Custodian.VEHICLE
        pack.custodian_id = vehicle.id
        pack.save(update_fields=["custodian_type", "custodian_id", "updated_at"])
    return vehicle


def attach_peer(
    *,
    account: Account,
    phone: str,
    email: str,
    first_name: str,
    last_name: str,
    daily_swap_limit: int | None,
    daily_spend_kobo_limit: int | None,
) -> Driver:
    user = upsert_phone_user(
        phone=phone,
        email=email,
        first_name=first_name,
        last_name=last_name,
        role=User.Role.DRIVER,
        password="driverpass123",
    )
    driver, _ = Driver.objects.get_or_create(
        user=user,
        defaults={"account": account, "status": "ACTIVE"},
    )
    driver.account = account
    driver.status = "ACTIVE"
    driver.daily_swap_limit = daily_swap_limit
    driver.daily_spend_kobo_limit = daily_spend_kobo_limit
    driver.save(
        update_fields=[
            "account",
            "status",
            "daily_swap_limit",
            "daily_spend_kobo_limit",
            "updated_at",
        ]
    )
    return driver
