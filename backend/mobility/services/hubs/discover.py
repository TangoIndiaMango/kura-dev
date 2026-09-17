"""PRD hub discover — type-ready stock + optional lat/lng distance."""
from __future__ import annotations

from uuid import UUID

from django.db.models import Count, Q

from integrations.ports.geo import DistanceTarget, LatLng
from integrations.providers.haversine.geo import get_geo_port
from mobility.models import Hub, HubSlot, Vehicle
from mobility.selectors import hubs_with_slot_counts


def _hours_label(hub: Hub) -> str:
    hours = hub.operating_hours or {}
    if not hours:
        return "Hours on request"
    for key in ("mon", "monday", "Mon"):
        windows = hours.get(key)
        if windows and isinstance(windows, list) and windows:
            first = windows[0]
            if isinstance(first, (list, tuple)) and len(first) >= 2:
                return f"{first[0]}–{first[1]}"
    return "See schedule"


def _resolve_battery_type_id(
    *,
    vehicle_id: str | None,
    battery_type_id: str | None,
) -> UUID | None:
    if battery_type_id:
        return UUID(str(battery_type_id))
    if not vehicle_id:
        return None
    vehicle = (
        Vehicle.objects.select_related("vehicle_model")
        .filter(pk=vehicle_id)
        .first()
    )
    if vehicle is None:
        return None
    return vehicle.vehicle_model.battery_type_id


def discover_hubs(
    *,
    vehicle_id: str | None = None,
    battery_type_id: str | None = None,
    lat: float | None = None,
    lng: float | None = None,
    radius_km: float | None = None,
    open_now: bool = False,
    limit: int = 50,
) -> list[dict]:
    type_id = _resolve_battery_type_id(
        vehicle_id=vehicle_id, battery_type_id=battery_type_id
    )
    qs = hubs_with_slot_counts()
    if open_now:
        qs = qs.filter(status=Hub.Status.ONLINE)
    else:
        qs = qs.filter(
            status__in=[
                Hub.Status.ONLINE,
                Hub.Status.MAINTENANCE,
                Hub.Status.CLOSED,
            ]
        )

    if type_id is not None:
        qs = qs.annotate(
            type_ready_count=Count(
                "slots",
                filter=Q(
                    slots__state=HubSlot.State.READY,
                    slots__battery__battery_type_id=type_id,
                ),
            )
        ).filter(type_ready_count__gt=0)

    hubs = list(qs[: max(1, min(limit, 100))])
    origin = (
        LatLng(lat=float(lat), lng=float(lng))
        if lat is not None and lng is not None
        else None
    )
    distance_by_id: dict[UUID, tuple[float, int | None]] = {}
    if origin is not None and hubs:
        geo = get_geo_port()
        result = geo.distances(
            origin=origin,
            destinations=[
                DistanceTarget(
                    id=h.id, point=LatLng(lat=float(h.lat), lng=float(h.lng))
                )
                for h in hubs
            ],
        )
        for item in result.items:
            distance_by_id[item.id] = (item.distance_km, item.duration_s)

    rows: list[dict] = []
    for hub in hubs:
        ready = int(getattr(hub, "type_ready_count", None) or getattr(hub, "ready_count", 0) or 0)
        if hub.status == Hub.Status.ONLINE:
            ui_status = "ready" if ready >= 8 else ("low" if ready > 0 else "offline")
        elif hub.status == Hub.Status.MAINTENANCE:
            ui_status = "low"
        else:
            ui_status = "offline"

        dist = distance_by_id.get(hub.id)
        if radius_km is not None and dist is not None and dist[0] > float(radius_km):
            continue

        row = {
            "id": str(hub.id),
            "code": hub.code,
            "name": hub.name,
            "address": hub.address,
            "status": hub.status,
            "ui_status": ui_status,
            "lat": float(hub.lat),
            "lng": float(hub.lng),
            "ready_count": ready,
            "hours_label": _hours_label(hub),
            "distance_km": dist[0] if dist else None,
            "duration_s": dist[1] if dist else None,
            "battery_type_id": str(type_id) if type_id else None,
        }
        rows.append(row)

    if origin is not None:
        rows.sort(
            key=lambda r: (
                r["distance_km"] is None,
                r["distance_km"] if r["distance_km"] is not None else 1e9,
            )
        )
    return rows
