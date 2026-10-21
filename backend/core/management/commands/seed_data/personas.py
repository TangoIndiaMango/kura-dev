"""Multi-persona operators: fleet+VCU, fleet without VCU, extra riders & agents."""
from __future__ import annotations

from accounts.models import Account, StaffMembership, User
from core.management.commands.seed_data.personas_helpers import (
    attach_peer,
    ensure_account,
    ensure_vehicle,
    upsert_phone_user,
)
from mobility.models import BatteryType, Hub, VehicleModel
from mobility.services.vehicles.assignment import VehicleAssignmentService


def seed_personas(
    *,
    battery_type: BatteryType,
    hubs: list[Hub],
    admin: User,
) -> dict:
    model, _ = VehicleModel.objects.get_or_create(
        make="Silversun",
        model="Titan EV 72V",
        defaults={"vehicle_type": "MOTORCYCLE", "battery_type": battery_type},
    )

    fleet_owner = upsert_phone_user(
        phone="+2348011110001",
        email="fleet.vcu@yopmail.com",
        first_name="Funke",
        last_name="Adeyemi",
        role=User.Role.FLEET_OWNER,
        password="fleetpass123",
    )
    fleet_acct, fleet_owner_driver = ensure_account(
        owner=fleet_owner,
        kura_id="KR-FLEET-VCU",
        display_name="Adeyemi Logistics (VCU fleet)",
        kind=Account.Kind.FLEET,
        balance_kobo=8_000_000,
    )
    vcu_vehicles = [
        ensure_vehicle(
            account=fleet_acct,
            plate=f"FLEET-VCU-{i:02d}",
            model=model,
            battery_type=battery_type,
            with_vcu=True,
            hardware_id=f"VCU-HW-{i:02d}",
        )
        for i in range(1, 4)
    ]
    peer_a = attach_peer(
        account=fleet_acct,
        phone="+2348011110002",
        email="fleet.driver.a@yopmail.com",
        first_name="Segun",
        last_name="Balogun",
        daily_swap_limit=4,
        daily_spend_kobo_limit=600_000,
    )
    peer_b = attach_peer(
        account=fleet_acct,
        phone="+2348011110003",
        email="fleet.driver.b@yopmail.com",
        first_name="Ngozi",
        last_name="Eze",
        daily_swap_limit=2,
        daily_spend_kobo_limit=300_000,
    )
    VehicleAssignmentService.assign(
        vehicle=vcu_vehicles[0], driver_id=peer_a.id, actor=admin, note="seed day shift"
    )
    VehicleAssignmentService.assign(
        vehicle=vcu_vehicles[1], driver_id=peer_b.id, actor=admin, note="seed night"
    )

    novcu_owner = upsert_phone_user(
        phone="+2348022220001",
        email="fleet.novcu@yopmail.com",
        first_name="Emeka",
        last_name="Okonkwo",
        role=User.Role.FLEET_OWNER,
        password="fleetpass123",
    )
    novcu_acct, _ = ensure_account(
        owner=novcu_owner,
        kura_id="KR-FLEET-NOVCU",
        display_name="Okonkwo Delivery (no telematics)",
        kind=Account.Kind.FLEET,
        balance_kobo=3_500_000,
    )
    novcu_vehicles = [
        ensure_vehicle(
            account=novcu_acct,
            plate=f"FLEET-NV-{i:02d}",
            model=model,
            battery_type=battery_type,
            with_vcu=False,
        )
        for i in range(1, 3)
    ]
    attach_peer(
        account=novcu_acct,
        phone="+2348022220002",
        email="fleet.novcu.driver@yopmail.com",
        first_name="Tola",
        last_name="Ajayi",
        daily_swap_limit=3,
        daily_spend_kobo_limit=450_000,
    )

    riders = []
    names = ["Ada", "Bola", "Chika", "Dami", "Efe", "Femi", "Gani", "Hana"]
    for i in range(1, 9):
        user = upsert_phone_user(
            phone=f"+23480333300{i:02d}",
            email=f"rider{i:02d}@yopmail.com",
            first_name=names[i - 1],
            last_name="Rider",
            role=User.Role.DRIVER,
            password="driverpass123",
        )
        acct, drv = ensure_account(
            owner=user,
            kura_id=f"KR-RIDER-{i:02d}",
            display_name=f"{user.first_name} Rider",
            kind=Account.Kind.INDIVIDUAL,
            balance_kobo=400_000 + i * 50_000,
        )
        ensure_vehicle(
            account=acct,
            plate=f"RID-{i:02d}-LAG",
            model=model,
            battery_type=battery_type,
            with_vcu=False,
        )
        riders.append((acct, drv))

    if len(hubs) > 1:
        agent2 = upsert_phone_user(
            phone="+2348098765433",
            email="agent.ikeja@yopmail.com",
            first_name="Yetunde",
            last_name="Lawal",
            role=User.Role.HUB_AGENT,
            password="agentpass123",
        )
        StaffMembership.objects.update_or_create(
            user=agent2,
            role=User.Role.HUB_AGENT,
            defaults={"hub_id": str(hubs[1].id)},
        )

    return {
        "fleet_vcu": {
            "account": fleet_acct,
            "owner_driver": fleet_owner_driver,
            "vehicles": vcu_vehicles,
            "peers": [peer_a, peer_b],
            "user": fleet_owner,
        },
        "fleet_novcu": {
            "account": novcu_acct,
            "vehicles": novcu_vehicles,
            "user": novcu_owner,
        },
        "riders": riders,
    }
