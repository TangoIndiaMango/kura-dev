"""Seed vehicle, plans, sample reservation, and alerts."""
from __future__ import annotations

from django.utils import timezone

from accounts.models import Account, Driver
from mobility.models import (
    Battery,
    BatteryType,
    Hub,
    Plan,
    Reservation,
    Subscription,
    Vehicle,
    VehicleModel,
    VehicleType,
)
from operations.models import Alert

# period, name, duration_days, code_suffix
_PLAN_ROW_SPECS: tuple[tuple[str, str, int | None, str], ...] = (
    (Plan.Period.SWAP, "Pay-per-swap", None, "PAY-SWAP"),
    (Plan.Period.DAY, "Daily", 1, "DAILY"),
    (Plan.Period.WEEK, "Weekly", 7, "WEEKLY"),
    (Plan.Period.MONTH, "Monthly", 30, "MONTHLY"),
)

_MOTORCYCLE_CODES = {
    Plan.Period.SWAP: "PLAN-PAY-SWAP",
    Plan.Period.DAY: "PLAN-DAILY",
    Plan.Period.WEEK: "PLAN-WEEKLY-UNLTD",
    Plan.Period.MONTH: "PLAN-MONTHLY-FLEET",
}

_DEFAULT_ALLOWANCE: dict[str, dict[str, int | None]] = {
    VehicleType.MOTORCYCLE: {
        Plan.Period.DAY: 2,
        Plan.Period.WEEK: None,
        Plan.Period.MONTH: None,
    },
    VehicleType.TRICYCLE: {
        Plan.Period.DAY: 3,
        Plan.Period.WEEK: 18,
        Plan.Period.MONTH: None,
    },
    VehicleType.BOAT: {
        Plan.Period.DAY: 2,
        Plan.Period.WEEK: 12,
        Plan.Period.MONTH: None,
    },
}

_FALLBACK_PRICE_KOBO: dict[str, dict[str, int]] = {
    VehicleType.MOTORCYCLE: {
        Plan.Period.SWAP: 45_000,
        Plan.Period.DAY: 120_000,
        Plan.Period.WEEK: 650_000,
        Plan.Period.MONTH: 2_400_000,
    },
    VehicleType.TRICYCLE: {
        Plan.Period.SWAP: 65_000,
        Plan.Period.DAY: 180_000,
        Plan.Period.WEEK: 950_000,
        Plan.Period.MONTH: 3_500_000,
    },
    VehicleType.BOAT: {
        Plan.Period.SWAP: 120_000,
        Plan.Period.DAY: 350_000,
        Plan.Period.WEEK: 1_800_000,
        Plan.Period.MONTH: 6_500_000,
    },
}


def _plan_code(*, vehicle_type: str, period: str, suffix: str) -> str:
    if vehicle_type == VehicleType.MOTORCYCLE:
        return _MOTORCYCLE_CODES[period]
    prefix = "TRI" if vehicle_type == VehicleType.TRICYCLE else "BOAT"
    return f"PLAN-{prefix}-{suffix}"


def upsert_catalogue_plans() -> None:
    """Ensure Daily/Weekly/Monthly/PPS catalogue rows exist for every vehicle type."""
    for vehicle_type in (
        VehicleType.MOTORCYCLE,
        VehicleType.TRICYCLE,
        VehicleType.BOAT,
    ):
        allowances = _DEFAULT_ALLOWANCE[vehicle_type]
        prices = _FALLBACK_PRICE_KOBO[vehicle_type]
        for period, name, days, suffix in _PLAN_ROW_SPECS:
            code = _plan_code(
                vehicle_type=vehicle_type, period=period, suffix=suffix
            )
            allowance = (
                None if period == Plan.Period.SWAP else allowances.get(period)
            )
            defaults = {
                "name": name,
                "vehicle_type": vehicle_type,
                "period": period,
                "duration_days": days,
                "swap_allowance": allowance,
                "price_kobo": prices[period],
                "is_active": True,
                "status": Plan.Status.ACTIVE,
            }
            plan, created = Plan.objects.get_or_create(code=code, defaults=defaults)
            if created:
                continue
            dirty = False
            for field, value in defaults.items():
                if getattr(plan, field) != value:
                    setattr(plan, field, value)
                    dirty = True
            if dirty:
                plan.save()

    pps = Plan.objects.filter(code="PLAN-PAY-SWAP", period=Plan.Period.SWAP).first()
    if pps is None:
        return
    Subscription.objects.filter(
        plan=pps,
        status=Subscription.Status.ACTIVE,
    ).update(
        status=Subscription.Status.EXPIRED,
        auto_renew=False,
        updated_at=timezone.now(),
    )


def _upsert_motorcycle_plans() -> None:
    """Backward-compatible alias used by PricingService.ensure_defaults."""
    upsert_catalogue_plans()


def seed_vehicle_plans_alerts(
    *,
    account: Account,
    driver: Driver,
    battery_type: BatteryType,
    hubs: list[Hub],
) -> None:
    v_model, _ = VehicleModel.objects.get_or_create(
        make="Silversun",
        model="Titan EV 72V",
        defaults={"vehicle_type": "MOTORCYCLE", "battery_type": battery_type},
    )
    mounted_battery, b_created = Battery.objects.get_or_create(
        serial="BAT-MNT-8819",
        defaults={
            "battery_type": battery_type,
            "status": Battery.Status.ISSUED,
            "charge_pct": 68,
            "health_pct": 99,
            "cycle_count": 22,
            "current_hub": None,
        },
    )
    vehicle, _ = Vehicle.objects.get_or_create(
        registration_plate="LAG-839-XY",
        defaults={
            "account": account,
            "vehicle_model": v_model,
            "current_battery": mounted_battery,
            "status": Vehicle.Status.ACTIVE,
        },
    )
    if vehicle.current_battery_id is None:
        vehicle.current_battery = mounted_battery
        vehicle.save(update_fields=["current_battery", "updated_at"])
    if b_created and mounted_battery.custodian_type != Battery.Custodian.VEHICLE:
        mounted_battery.custodian_type = Battery.Custodian.VEHICLE
        mounted_battery.custodian_id = vehicle.id
        mounted_battery.save(update_fields=["custodian_type", "custodian_id", "updated_at"])

    _upsert_motorcycle_plans()

    yaba = hubs[0]
    Reservation.objects.get_or_create(
        code="KB-4921",
        defaults={
            "account": account,
            "vehicle": vehicle,
            "driver": driver,
            "hub": yaba,
            "payment_mode": Reservation.PaymentMode.WALLET,
            "status": Reservation.Status.CONFIRMED,
            "expires_at": timezone.now() + timezone.timedelta(minutes=18),
        },
    )
    Alert.objects.get_or_create(
        kind=Alert.Kind.LOW_INVENTORY,
        hub=yaba,
        status=Alert.Status.OPEN,
        defaults={
            "severity": Alert.Severity.WARNING,
            "message": "Ready batteries below threshold at Yaba",
        },
    )
