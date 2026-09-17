"""Seed Lagos hubs with slots and batteries — close cluster + one far hub."""
from __future__ import annotations

from mobility.models import Battery, BatteryType, Hub, HubSlot

HUBS_DATA = [
    {
        "code": "HUB-YBA-01",
        "name": "Yaba Commercial Hub",
        "address": "Commercial Ave & Herbert Macaulay Way, Yaba, Lagos",
        "lat": 6.5173,
        "lng": 3.3734,
        "slots": 16,
        "solar": 15.0,
    },
    {
        "code": "HUB-SUR-01",
        "name": "Surulere Transit Hub",
        "address": "Adeniran Ogunsanya St, Surulere, Lagos",
        "lat": 6.5010,
        "lng": 3.3580,
        "slots": 12,
        "solar": 12.0,
    },
    {
        "code": "HUB-IKJ-01",
        "name": "Ikeja Mobility Station",
        "address": "Awolowo Way, Ikeja, Lagos",
        "lat": 6.5954,
        "lng": 3.3448,
        "slots": 16,
        "solar": 18.0,
    },
    {
        "code": "HUB-VI-01",
        "name": "Victoria Island Central Hub",
        "address": "Ahmadu Bello Way, VI, Lagos",
        "lat": 6.4281,
        "lng": 3.4219,
        "slots": 12,
        "solar": 22.0,
    },
    {
        "code": "HUB-EPE-01",
        "name": "Epe Waterside Hub",
        "address": "Epe–Ikorodu Rd, Epe, Lagos",
        "lat": 6.5840,
        "lng": 3.9830,
        "slots": 8,
        "solar": 10.0,
    },
]


def seed_hubs(*, battery_type: BatteryType) -> list[Hub]:
    if not battery_type.usable_energy_wh:
        battery_type.usable_energy_wh = 2900
    if not battery_type.wh_per_km:
        battery_type.wh_per_km = 50
    battery_type.usable_energy_wh = 2900
    battery_type.wh_per_km = 50
    battery_type.save(update_fields=["usable_energy_wh", "wh_per_km", "updated_at"])

    created_hubs: list[Hub] = []
    for h in HUBS_DATA:
        hub, created = Hub.objects.get_or_create(
            code=h["code"],
            defaults={
                "name": h["name"],
                "address": h["address"],
                "lat": h["lat"],
                "lng": h["lng"],
                "slot_count": h["slots"],
                "solar_capacity_kw": h["solar"],
                "status": Hub.Status.ONLINE,
            },
        )
        if not created:
            dirty = False
            for field, value in (
                ("name", h["name"]),
                ("address", h["address"]),
                ("lat", h["lat"]),
                ("lng", h["lng"]),
                ("slot_count", h["slots"]),
                ("status", Hub.Status.ONLINE),
            ):
                if getattr(hub, field) != value:
                    setattr(hub, field, value)
                    dirty = True
            if dirty:
                hub.save()
        created_hubs.append(hub)
        if hub.slots.count() > 0:
            continue
        for slot_idx in range(1, h["slots"] + 1):
            if slot_idx <= int(h["slots"] * 0.7):
                bat, _ = Battery.objects.get_or_create(
                    serial=f"BAT-{hub.code.split('-')[1]}-{slot_idx:02d}",
                    defaults={
                        "battery_type": battery_type,
                        "status": Battery.Status.AVAILABLE,
                        "charge_pct": 95 + (slot_idx % 6),
                        "health_pct": 97,
                        "cycle_count": 14 + slot_idx,
                        "current_hub": hub,
                    },
                )
                slot = HubSlot.objects.create(
                    hub=hub, slot_no=slot_idx, battery=bat, state=HubSlot.State.READY
                )
                bat.custodian_type = Battery.Custodian.HUB_SLOT
                bat.custodian_id = slot.id
                bat.save(update_fields=["custodian_type", "custodian_id", "updated_at"])
            elif slot_idx <= int(h["slots"] * 0.9):
                bat, _ = Battery.objects.get_or_create(
                    serial=f"BAT-{hub.code.split('-')[1]}-{slot_idx:02d}",
                    defaults={
                        "battery_type": battery_type,
                        "status": Battery.Status.CHARGING,
                        "charge_pct": 35 + (slot_idx * 4),
                        "health_pct": 98,
                        "cycle_count": 8 + slot_idx,
                        "current_hub": hub,
                    },
                )
                slot = HubSlot.objects.create(
                    hub=hub,
                    slot_no=slot_idx,
                    battery=bat,
                    state=HubSlot.State.CHARGING,
                )
                bat.custodian_type = Battery.Custodian.HUB_SLOT
                bat.custodian_id = slot.id
                bat.save(update_fields=["custodian_type", "custodian_id", "updated_at"])
            else:
                HubSlot.objects.create(
                    hub=hub, slot_no=slot_idx, battery=None, state=HubSlot.State.EMPTY
                )
    return created_hubs
