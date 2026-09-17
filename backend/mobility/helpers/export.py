"""CSV/PDF rows for hubs and batteries export."""
from __future__ import annotations


def hub_export_rows(queryset):
    for hub in queryset.iterator(chunk_size=200):
        yield [
            str(hub.id),
            hub.code,
            hub.name,
            hub.address,
            hub.status,
            hub.slot_count,
            getattr(hub, "ready_count", ""),
            getattr(hub, "charging_count", ""),
            getattr(hub, "empty_count", ""),
            getattr(hub, "fault_count", ""),
            str(hub.solar_capacity_kw),
            hub.created_at.isoformat() if hub.created_at else "",
        ]


def vehicle_export_rows(queryset):
    for v in queryset.select_related("vehicle_model", "account"):
        yield [
            str(v.id),
            v.registration_plate,
            v.vehicle_model.make,
            v.vehicle_model.model,
            v.vehicle_model.vehicle_type,
            v.account.kura_id,
            v.status,
            v.created_at.isoformat(),
        ]


def battery_export_rows(queryset):
    for bat in queryset.iterator(chunk_size=200):
        yield [
            str(bat.id),
            bat.serial,
            bat.battery_type.name if bat.battery_type_id else "",
            bat.status,
            bat.charge_pct,
            bat.health_pct,
            bat.cycle_count,
            bat.current_hub.code if bat.current_hub_id else "",
            bat.current_hub.name if bat.current_hub_id else "",
            bat.created_at.isoformat() if bat.created_at else "",
        ]
