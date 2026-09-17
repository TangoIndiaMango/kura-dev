"""Mobility read queries — capability-scoped vehicles, reservations, swaps."""
from __future__ import annotations

from typing import Any
from uuid import UUID

from django.db.models import Count, Q, QuerySet

from accounts.helpers.staff import STAFF_ROLES
from accounts.permissions import user_has_capability
from accounts.selectors.scope import hub_ids_for, vehicle_q_for_hubs
from mobility.models import (
    Battery,
    Hub,
    HubSlot,
    Reservation,
    Subscription,
    Swap,
    Vehicle,
    VehicleModel,
    VehicleType,
)


def _apply_hub_scope(qs: QuerySet, hub_ids: list[UUID] | None, field: str) -> QuerySet:
    if hub_ids is None:
        return qs
    if not hub_ids:
        return qs.none()
    return qs.filter(**{f"{field}__in": hub_ids})


def hubs_with_slot_counts(user=None) -> QuerySet[Hub]:
    qs = Hub.objects.annotate(
        ready_count=Count("slots", filter=Q(slots__state=HubSlot.State.READY)),
        charging_count=Count(
            "slots", filter=Q(slots__state=HubSlot.State.CHARGING)
        ),
        empty_count=Count("slots", filter=Q(slots__state=HubSlot.State.EMPTY)),
        fault_count=Count("slots", filter=Q(slots__state=HubSlot.State.FAULT)),
    ).order_by("code")
    if user is None:
        return qs
    return _apply_hub_scope(qs, hub_ids_for(user), "id")


def hub_stats(user=None) -> dict[str, Any]:
    qs = hubs_with_slot_counts(user)
    by_status = {
        row["status"]: row["count"]
        for row in qs.values("status").annotate(count=Count("id"))
    }
    inv = qs.aggregate(
        ready=Count("slots", filter=Q(slots__state=HubSlot.State.READY)),
        charging=Count("slots", filter=Q(slots__state=HubSlot.State.CHARGING)),
    )
    return {
        "totals": {
            "all": qs.count(),
            "online": by_status.get(Hub.Status.ONLINE, 0),
            "offline": by_status.get(Hub.Status.OFFLINE, 0),
            "maintenance": by_status.get(Hub.Status.MAINTENANCE, 0),
            "closed": by_status.get(Hub.Status.CLOSED, 0),
        },
        "inventory": {
            "ready": inv["ready"] or 0,
            "charging": inv["charging"] or 0,
        },
        "by_hub_ready": [
            {"code": h.code, "ready": h.ready_count} for h in qs[:20]
        ],
    }


def hub_detail_stats(
    hub: Hub,
    *,
    start_date: str | None = None,
    end_date: str | None = None,
) -> dict[str, Any]:
    from datetime import datetime, timedelta
    from django.utils import timezone
    from django.utils.dateparse import parse_date
    from django.db.models import Count, ExpressionWrapper, F, FloatField, Sum
    from django.db.models.functions import TruncDate

    today = timezone.now().date()
    end_d = parse_date(end_date) if end_date else today
    if not end_d:
        end_d = today

    start_d = parse_date(start_date) if start_date else (end_d - timedelta(days=13))
    if not start_d or start_d > end_d:
        start_d = end_d - timedelta(days=13)

    if (end_d - start_d).days > 90:
        start_d = end_d - timedelta(days=89)

    start_dt = timezone.make_aware(datetime.combine(start_d, datetime.min.time()))
    end_dt = timezone.make_aware(datetime.combine(end_d, datetime.max.time()))

    scoped_swaps = Swap.objects.filter(
        hub=hub,
        status=Swap.Status.COMPLETED,
        completed_at__gte=start_dt,
        completed_at__lte=end_dt,
    )

    total_swaps = scoped_swaps.count()
    days_count = max(1, (end_d - start_d).days + 1)
    swaps_per_day = round(total_swaps / days_count, 1)

    energy_expr = ExpressionWrapper(
        (F("issued_charge_pct") - F("returned_charge_pct")) * 3.24 / 100.0,
        output_field=FloatField(),
    )

    daily_rows = (
        scoped_swaps.annotate(day=TruncDate("completed_at"))
        .values("day")
        .annotate(
            c=Count("id"),
            energy=Sum(energy_expr),
        )
    )
    daily_map = {row["day"]: row for row in daily_rows if row["day"]}

    solar_cap = float(hub.solar_capacity_kw or 10.0)
    solar_base = solar_cap * 0.75

    daily_metrics = []
    cur = start_d
    while cur <= end_d:
        row = daily_map.get(cur)
        c = row["c"] if row else 0
        energy = round(float(row["energy"] or 0.0), 1) if row else 0.0
        daily_metrics.append({
            "date": cur.isoformat(),
            "label": cur.strftime("%d %b"),
            "swaps": c,
            "energy_kwh": energy,
            "solar_kw": round(solar_base, 1),
            "grid_kw": round(max(1.0, energy * 0.3), 1),
        })
        cur += timedelta(days=1)

    total_energy_kwh = round(sum(d["energy_kwh"] for d in daily_metrics), 1)

    slots_qs = HubSlot.objects.filter(hub=hub)
    ready_count = slots_qs.filter(state=HubSlot.State.READY).count()
    charging_count = slots_qs.filter(state=HubSlot.State.CHARGING).count()
    empty_count = slots_qs.filter(state=HubSlot.State.EMPTY).count()
    fault_count = slots_qs.filter(state=HubSlot.State.FAULT).count()
    total_slots = hub.slot_count or (ready_count + charging_count + empty_count + fault_count) or 24

    return {
        "hub_id": str(hub.id),
        "code": hub.code,
        "name": hub.name,
        "status": hub.status,
        "solar_capacity_kw": solar_cap,
        "solar_output_kw": round(solar_base if hub.status == Hub.Status.ONLINE else 0.0, 1),
        "total_slots": total_slots,
        "ready_count": ready_count,
        "charging_count": charging_count,
        "empty_count": empty_count,
        "fault_count": fault_count,
        "swaps_count": total_swaps,
        "swaps_per_day": swaps_per_day,
        "energy_kwh_total": total_energy_kwh,
        "daily_metrics": daily_metrics,
        "start_date": start_d.isoformat(),
        "end_date": end_d.isoformat(),
    }


def batteries_queryset(user=None) -> QuerySet[Battery]:
    qs = Battery.objects.select_related(
        "battery_type", "current_hub", "mounted_vehicle"
    ).order_by("-created_at")
    if user is None:
        return qs
    return _apply_hub_scope(qs, hub_ids_for(user), "current_hub_id")


def battery_stats(user=None) -> dict[str, Any]:
    qs = batteries_queryset(user)
    by_status = {
        row["status"]: row["count"]
        for row in qs.values("status").annotate(count=Count("id"))
    }
    return {
        "totals": {
            "all": qs.count(),
            "available": by_status.get(Battery.Status.AVAILABLE, 0),
            "charging": by_status.get(Battery.Status.CHARGING, 0),
            "issued": by_status.get(Battery.Status.ISSUED, 0),
            "reserved": by_status.get(Battery.Status.RESERVED, 0),
            "faulted": by_status.get(Battery.Status.FAULTED, 0),
            "retired": by_status.get(Battery.Status.RETIRED, 0),
        },
        "by_type": [
            {
                "name": row["battery_type__name"],
                "count": row["count"],
                "available": row["available"],
            }
            for row in qs.values("battery_type__name")
            .annotate(
                count=Count("id"),
                available=Count(
                    "id", filter=Q(status=Battery.Status.AVAILABLE)
                ),
            )
            .order_by("battery_type__name")[:20]
        ],
    }


def _own_account_ids(user) -> list:
    ids: list = []
    driver = getattr(user, "driver_profile", None)
    if driver is not None:
        ids.append(driver.account_id)
    ids.extend(user.accounts.values_list("id", flat=True))
    return list({i for i in ids if i})


def _can_read_all_mobility(user) -> bool:
    if user_has_capability(user, "accounts:read"):
        return True
    if user_has_capability(user, "vehicles:read"):
        return True
    if not user_has_capability(user, "swaps:read"):
        return False
    role = getattr(user, "role", "") or ""
    return bool(getattr(user, "is_staff", False) or role in STAFF_ROLES)


def vehicle_stats() -> dict[str, Any]:
    qs = Vehicle.objects.all()
    by_status = {
        row["status"]: row["count"]
        for row in qs.values("status").annotate(count=Count("id"))
    }
    by_type = list(
        qs.values("vehicle_model__vehicle_type")
        .annotate(count=Count("id"))
        .order_by("-count")
    )
    return {
        "totals": {
            "all": qs.count(),
            "active": by_status.get(Vehicle.Status.ACTIVE, 0),
            "pending": by_status.get(Vehicle.Status.PENDING, 0),
            "suspended": by_status.get(Vehicle.Status.SUSPENDED, 0),
        },
        "by_type": [
            {
                "vehicle_type": row["vehicle_model__vehicle_type"] or "—",
                "count": row["count"],
            }
            for row in by_type
        ],
    }


def vehicle_model_stats() -> dict[str, Any]:
    qs = VehicleModel.objects.all()
    by_type = {
        row["vehicle_type"]: row["count"]
        for row in qs.values("vehicle_type").annotate(count=Count("id"))
    }
    return {
        "totals": {
            "all": qs.count(),
            "motorcycle": by_type.get(VehicleType.MOTORCYCLE, 0),
            "tricycle": by_type.get(VehicleType.TRICYCLE, 0),
            "boat": by_type.get(VehicleType.BOAT, 0),
        },
        "by_type": [
            {"vehicle_type": vt, "count": by_type.get(vt, 0)}
            for vt in (
                VehicleType.MOTORCYCLE,
                VehicleType.TRICYCLE,
                VehicleType.BOAT,
            )
        ],
    }


def eboarder_stats() -> dict[str, Any]:
    from mobility.models import EBoarder

    qs = EBoarder.objects.all()
    by_status = {
        row["status"]: row["count"]
        for row in qs.values("status").annotate(count=Count("id"))
    }
    return {
        "totals": {
            "all": qs.count(),
            "in_stock": by_status.get(EBoarder.Status.IN_STOCK, 0),
            "issued": by_status.get(EBoarder.Status.ISSUED, 0),
            "maintenance": by_status.get(EBoarder.Status.MAINTENANCE, 0),
            "retired": by_status.get(EBoarder.Status.RETIRED, 0),
        },
    }


def vehicles_for(user) -> QuerySet[Vehicle]:
    qs = Vehicle.objects.select_related(
        "vehicle_model", "current_battery", "account"
    ).order_by("-created_at")
    if _can_read_all_mobility(user):
        return qs
    scope = hub_ids_for(user)
    if scope is not None:
        if not scope:
            return qs.none()
        return qs.filter(vehicle_q_for_hubs(scope)).distinct()
    own = _own_account_ids(user)
    if not own:
        return qs.none()
    return qs.filter(account_id__in=own)


def subscriptions_for(user) -> QuerySet[Subscription]:
    qs = Subscription.objects.select_related(
        "plan", "vehicle", "account"
    ).order_by("-created_at")
    if _can_read_all_mobility(user):
        return qs
    own = _own_account_ids(user)
    if not own:
        return qs.none()
    return qs.filter(account_id__in=own)


def reservations_for(user) -> QuerySet[Reservation]:
    qs = Reservation.objects.select_related(
        "hub", "vehicle", "driver__user", "account", "battery"
    ).order_by("-created_at")
    scope = hub_ids_for(user)
    if scope is not None:
        return _apply_hub_scope(qs, scope, "hub_id")
    if _can_read_all_mobility(user):
        return qs
    own = _own_account_ids(user)
    if not own:
        return qs.none()
    return qs.filter(account_id__in=own)


def swaps_for(user) -> QuerySet[Swap]:
    qs = Swap.objects.select_related(
        "hub",
        "vehicle",
        "vehicle__vehicle_model",
        "driver__user",
        "account",
        "returned_battery",
        "issued_battery",
        "reservation",
        "payment",
    ).order_by("-created_at")
    scope = hub_ids_for(user)
    if scope is not None:
        return _apply_hub_scope(qs, scope, "hub_id")
    if _can_read_all_mobility(user):
        return qs
    own = _own_account_ids(user)
    if not own:
        return qs.none()
    return qs.filter(account_id__in=own)
