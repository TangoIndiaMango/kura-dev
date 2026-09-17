"""Hub domain workflows — provision slots, set status."""
from __future__ import annotations

from decimal import Decimal
from typing import Any

from django.db import transaction

from core.exceptions import DomainError
from core.services.events import NotifySpec, emit_event
from mobility.models import Hub, HubSlot
from notifications.models import Notification


def _hub_snapshot(hub: Hub) -> dict[str, Any]:
    return {
        "code": hub.code,
        "name": hub.name,
        "address": hub.address,
        "status": hub.status,
        "slot_count": hub.slot_count,
        "solar_capacity_kw": str(hub.solar_capacity_kw),
        "lat": hub.lat,
        "lng": hub.lng,
        "timezone": hub.timezone,
        "operating_hours": hub.operating_hours or {},
    }


class HubService:
    @staticmethod
    @transaction.atomic
    def create_hub(
        *,
        code: str,
        name: str,
        address: str,
        lat: float = 6.5173,
        lng: float = 3.3734,
        slot_count: int = 16,
        solar_capacity_kw: Decimal | str = "12.50",
        status: str = Hub.Status.ONLINE,
        actor=None,
    ) -> Hub:
        code_norm = (code or "").strip().upper()
        if not code_norm:
            raise DomainError("VALIDATION_ERROR", "Hub code is required.")
        if Hub.objects.filter(code=code_norm).exists():
            raise DomainError("CONFLICT", f"Hub code {code_norm} already exists.")
        hub = Hub.objects.create(
            code=code_norm,
            name=name.strip(),
            address=address.strip(),
            lat=lat,
            lng=lng,
            slot_count=slot_count,
            solar_capacity_kw=Decimal(str(solar_capacity_kw)),
            status=status,
        )
        HubService._ensure_slots(hub)
        emit_event(
            action="hub.created",
            subject_type="hub",
            subject_id=str(hub.id),
            subject_label=hub.code,
            actor=actor,
            after=_hub_snapshot(hub),
        )
        return hub

    @staticmethod
    @transaction.atomic
    def update_hub(hub: Hub, *, actor=None, **fields) -> Hub:
        locked = Hub.objects.select_for_update().get(pk=hub.pk)
        before = _hub_snapshot(locked)
        if "name" in fields and fields["name"] is not None:
            locked.name = str(fields["name"]).strip()
        if "address" in fields and fields["address"] is not None:
            locked.address = str(fields["address"]).strip()
        if "lat" in fields and fields["lat"] is not None:
            locked.lat = float(fields["lat"])
        if "lng" in fields and fields["lng"] is not None:
            locked.lng = float(fields["lng"])
        if "solar_capacity_kw" in fields and fields["solar_capacity_kw"] is not None:
            locked.solar_capacity_kw = Decimal(str(fields["solar_capacity_kw"]))
        if "status" in fields and fields["status"] is not None:
            locked.status = fields["status"]
        if "slot_count" in fields and fields["slot_count"] is not None:
            new_count = int(fields["slot_count"])
            if new_count < locked.slot_count:
                raise DomainError(
                    "VALIDATION_ERROR",
                    "Reducing slot_count is not supported; retire slots via ops.",
                )
            locked.slot_count = new_count
        if "timezone" in fields and fields["timezone"] is not None:
            locked.timezone = str(fields["timezone"]).strip() or "Africa/Lagos"
        if "operating_hours" in fields and fields["operating_hours"] is not None:
            locked.operating_hours = fields["operating_hours"] or {}
        locked.save()
        HubService._ensure_slots(locked)
        emit_event(
            action="hub.updated",
            subject_type="hub",
            subject_id=str(locked.id),
            subject_label=locked.code,
            actor=actor,
            before=before,
            after=_hub_snapshot(locked),
        )
        return locked

    @staticmethod
    @transaction.atomic
    def set_status(*, hub: Hub, status: str, actor=None, note: str = "") -> Hub:
        if status not in Hub.Status.values:
            raise DomainError("VALIDATION_ERROR", f"Invalid hub status '{status}'.")
        locked = Hub.objects.select_for_update().get(pk=hub.pk)
        before = {"status": locked.status}
        locked.status = status
        locked.save(update_fields=["status", "updated_at"])
        unavailable = status in (
            Hub.Status.OFFLINE,
            Hub.Status.MAINTENANCE,
            Hub.Status.CLOSED,
        )
        cancelled_count = 0
        if unavailable and before["status"] != status:
            from mobility.models import Reservation
            from mobility.services.reservations.lifecycle import cancel_reservation

            reservations = Reservation.objects.select_for_update().filter(
                hub_id=locked.id,
                status__in=(
                    Reservation.Status.PENDING,
                    Reservation.Status.CONFIRMED,
                ),
            )
            reason = f"{locked.name} is temporarily {status.lower()}."
            for reservation in reservations:
                cancel_reservation(
                    reservation=reservation,
                    actor=actor,
                    reason=reason,
                )
                cancelled_count += 1
        from mobility.services.hubs.sync import touch_hub_last_sync

        touch_hub_last_sync(locked)
        emit_event(
            action="hub.status_changed",
            subject_type="hub",
            subject_id=str(locked.id),
            subject_label=locked.code,
            actor=actor,
            before=before,
            after={"status": locked.status},
            metadata={
                "note": note,
                "cancelled_reservations": cancelled_count,
            },
        )
        if unavailable and before["status"] != status:
            from accounts.services.memberships import users_for_hub

            for operator in users_for_hub(locked.id):
                emit_event(
                    action="hub.status_operator_notified",
                    subject_type="hub",
                    subject_id=str(locked.id),
                    subject_label=locked.code,
                    actor=actor,
                    metadata={"status": status},
                    notify=NotifySpec(
                        user=operator,
                        title=f"Hub {locked.code} → {status}",
                        body=(note or f"{locked.name} set to {status}")[:200],
                        source="Hubs",
                        severity=Notification.Severity.WARNING,
                        link_path=f"/hubs/{locked.id}",
                        template_code="hub.status_changed",
                        dedupe_key=f"hub.status:{locked.id}:{status}:{operator.id}",
                    ),
                )
        return locked

    @staticmethod
    def _ensure_slots(hub: Hub) -> None:
        existing = set(
            HubSlot.objects.filter(hub=hub).values_list("slot_no", flat=True)
        )
        to_create = [
            HubSlot(hub=hub, slot_no=n, state=HubSlot.State.EMPTY)
            for n in range(1, hub.slot_count + 1)
            if n not in existing
        ]
        if to_create:
            HubSlot.objects.bulk_create(to_create)
