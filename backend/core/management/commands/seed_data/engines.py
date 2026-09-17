"""Seed Path B engines and retrofits (impact/telemetry via path_b_impact)."""
from __future__ import annotations

from datetime import timedelta

from django.utils import timezone

from accounts.models import Account, User
from core.management.commands.seed_data.engine_media import (
    SEED_MEDIA,
    refresh_engine_media,
)
from core.management.commands.seed_data.identity_media import (
    SEED_FACE_ALT,
    ensure_verified_identity,
)
from core.management.commands.seed_data.path_b_impact import (
    seed_path_b_impact_telemetry,
)
from finance.models import Wallet
from finance.services.wallets import WalletService
from mobility.models import (
    DEFAULT_SAFETY_CHECKLIST,
    BatteryType,
    EBoarder,
    Hub,
    PetrolEngine,
    Retrofit,
    Vehicle,
    VehicleModel,
)


def seed_engines_impact(
    *,
    users: dict[str, User],
    hubs: list[Hub],
    battery_type: BatteryType,
) -> Account:
    """Realistic Makoko / Lagos lagoon Path B demo (idempotent by tags / plates)."""
    agent = users["agent"]
    ops = users["ops"]
    yaba = hubs[0]

    owner, _ = User.objects.get_or_create(
        phone="+2348088812345",
        defaults={
            "email": "fatima.okoro@yopmail.com",
            "first_name": "Fatima",
            "last_name": "Okoro",
            "role": User.Role.DRIVER,
        },
    )
    account, _ = Account.objects.get_or_create(
        kura_id="KR-PATHB1",
        defaults={
            "owner_user": owner,
            "display_name": "Fatima Okoro (Makoko Ferry)",
            "kind": Account.Kind.INDIVIDUAL,
            "status": Account.Status.ACTIVE,
            "kyc_status": Account.KycStatus.VERIFIED,
            "registration_channel": Account.RegistrationChannel.HUB,
        },
    )
    if account.kyc_status != Account.KycStatus.VERIFIED:
        account.kyc_status = Account.KycStatus.VERIFIED
        account.save(update_fields=["kyc_status", "updated_at"])
    ensure_verified_identity(
        account=account,
        user=owner,
        id_number="22334455667",
        face_url=SEED_FACE_ALT,
    )
    Wallet.objects.get_or_create(
        account=account,
        defaults={"balance_kobo": 850_000, "hold_kobo": 0},
    )
    WalletService.assign_virtual_account(
        account=account,
        nuban="9910482911",
        bank_name="Wema Bank",
        account_name="KURA / Fatima Okoro",
        psp_reference="seed-pathb-dva",
    )

    boat_model, _ = VehicleModel.objects.get_or_create(
        make="Silversun",
        model="Lagoon Canoe EB",
        defaults={"vehicle_type": "BOAT", "battery_type": battery_type},
    )
    boat, boat_created = Vehicle.objects.get_or_create(
        registration_plate="MK-HULL-07",
        defaults={
            "account": account,
            "vehicle_model": boat_model,
            "status": Vehicle.Status.ACTIVE,
            "acquisition_path": Vehicle.AcquisitionPath.ENGINE_SWAP,
            "vin": "KURA-BOAT-MK07",
        },
    )
    # First-swap demo: retrofit leaves no pack on initial creation, bay skips return.
    if boat_created and boat.current_battery_id is not None:
        boat.current_battery = None
        boat.save(update_fields=["current_battery", "updated_at"])

    stored, _ = PetrolEngine.objects.get_or_create(
        tag="PE-YMH-15-8821",
        defaults={
            "account": account,
            "make": "Yamaha",
            "model": "F15CMH",
            "hp": "15",
            "condition_grade": PetrolEngine.ConditionGrade.FAIR,
            "intake_photos": [SEED_MEDIA["hull"], SEED_MEDIA["engine"]],
            "intake_agent": agent,
            "intake_witness": ops,
            "storage_hub": yaba,
            "status": PetrolEngine.Status.STORED,
            "intake_signature": SEED_MEDIA["sig"],
            "raw": {
                "oem_serial": "6AHL-123456",
                "intake_notes": "Light oil seep at lower unit; photos logged.",
                "location": "Makoko waterside",
            },
        },
    )
    if boat.petrol_engine_id != stored.id:
        boat.petrol_engine = stored
        boat.acquisition_path = Vehicle.AcquisitionPath.ENGINE_SWAP
        boat.save(update_fields=["petrol_engine", "acquisition_path", "updated_at"])
    refresh_engine_media(
        stored,
        photos=[SEED_MEDIA["hull"], SEED_MEDIA["engine"]],
        signature=SEED_MEDIA["sig"],
    )

    checks = {k: True for k in DEFAULT_SAFETY_CHECKLIST}
    eboarder, _ = EBoarder.objects.get_or_create(
        serial="EB-LAG-7741",
        defaults={
            "make": "Asobo",
            "model": "Lagoon 6",
            "rated_watts": 6000,
            "petrol_hp_equivalent": "15",
            "nominal_voltage_v": 48,
            "battery_type": battery_type,
            "shaft_length": EBoarder.ShaftLength.LONG,
            "status": EBoarder.Status.ISSUED,
            "vehicle": boat,
            "account": account,
            "issued_at": timezone.now() - timedelta(days=18),
        },
    )
    for serial, watts, hp in (
        ("EB-YBA-1102", 6000, "15"),
        ("EB-YBA-1103", 6000, "15"),
        ("EB-YBA-2201", 10000, "25"),
    ):
        EBoarder.objects.get_or_create(
            serial=serial,
            defaults={
                "make": "Asobo",
                "model": "Lagoon 6" if watts == 6000 else "Lagoon 10",
                "rated_watts": watts,
                "petrol_hp_equivalent": hp,
                "nominal_voltage_v": 48,
                "battery_type": battery_type,
                "shaft_length": EBoarder.ShaftLength.LONG,
                "status": EBoarder.Status.IN_STOCK,
                "current_hub": yaba,
            },
        )

    retrofit, created = Retrofit.objects.get_or_create(
        petrol_engine=stored,
        defaults={
            "account": account,
            "vehicle": boat,
            "eboarder_serial": eboarder.serial,
            "eboarder": eboarder,
            "checklist": checks,
            "agent": agent,
            "status": Retrofit.Status.ACTIVATED,
            "photos": [SEED_MEDIA["install"]],
            "activated_at": timezone.now() - timedelta(days=18),
            "raw": {"commissioned_by": "Yaba Path B bay"},
        },
    )
    if not created and retrofit.status != Retrofit.Status.ACTIVATED:
        retrofit.status = Retrofit.Status.ACTIVATED
        retrofit.checklist = checks
        retrofit.eboarder_serial = retrofit.eboarder_serial or eboarder.serial
        retrofit.eboarder = retrofit.eboarder or eboarder
        retrofit.activated_at = retrofit.activated_at or timezone.now()
        retrofit.save()
    elif not created and not retrofit.eboarder_id:
        retrofit.eboarder = eboarder
        retrofit.eboarder_serial = eboarder.serial
        retrofit.save(update_fields=["eboarder", "eboarder_serial", "updated_at"])
    current_install = list(retrofit.photos or [])
    if (not current_install) or any(
        not str(p).startswith("http") for p in current_install
    ):
        retrofit.photos = [SEED_MEDIA["install"]]
        retrofit.save(update_fields=["photos", "updated_at"])

    suz, _ = PetrolEngine.objects.get_or_create(
        tag="PE-SUZ-40-1102",
        defaults={
            "account": account,
            "make": "Suzuki",
            "model": "DF40A",
            "hp": "40",
            "condition_grade": PetrolEngine.ConditionGrade.GOOD,
            "intake_photos": [SEED_MEDIA["suz"]],
            "intake_agent": agent,
            "intake_witness": ops,
            "storage_hub": yaba,
            "status": PetrolEngine.Status.RELEASE_REQUESTED,
            "intake_signature": SEED_MEDIA["sig"],
            "raw": {"release_note": "Owner selling canoe — awaiting ops release"},
        },
    )
    refresh_engine_media(suz, photos=[SEED_MEDIA["suz"]], signature=SEED_MEDIA["sig"])

    legacy, _ = PetrolEngine.objects.get_or_create(
        tag="PE-YMH-40-4401",
        defaults={
            "account": account,
            "make": "Yamaha",
            "model": "F40FETL",
            "hp": "40",
            "condition_grade": PetrolEngine.ConditionGrade.POOR,
            "intake_photos": [SEED_MEDIA["legacy"]],
            "intake_agent": ops,
            "intake_witness": agent,
            "storage_hub": yaba,
            "status": PetrolEngine.Status.RELEASED,
            "intake_signature": SEED_MEDIA["sig"],
            "released_at": timezone.now() - timedelta(days=90),
            "release_photos": [SEED_MEDIA["release"]],
            "release_by": ops,
            "raw": {"disposition": "Returned to owner after plan exit"},
        },
    )
    refresh_engine_media(
        legacy,
        photos=[SEED_MEDIA["legacy"]],
        signature=SEED_MEDIA["sig"],
        release=[SEED_MEDIA["release"]],
    )

    seed_path_b_impact_telemetry(account=account, boat=boat, yaba=yaba, ops=ops)
    return account
