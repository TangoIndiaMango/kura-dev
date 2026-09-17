"""Hub open/closed evaluation from status + operating_hours (WAT)."""
from __future__ import annotations

from datetime import datetime, time
from zoneinfo import ZoneInfo

from django.utils import timezone

from core.exceptions import DomainError
from mobility.models import Hub

_DAY_KEYS = ("mon", "tue", "wed", "thu", "fri", "sat", "sun")


def _parse_hhmm(value: str) -> time:
    hour, minute = value.split(":")
    return time(int(hour), int(minute))


def hub_is_open(hub: Hub, *, at: datetime | None = None) -> bool:
    if hub.status in {Hub.Status.OFFLINE, Hub.Status.CLOSED, Hub.Status.MAINTENANCE}:
        return False
    hours = hub.operating_hours or {}
    if not hours:
        return hub.status == Hub.Status.ONLINE
    tz = ZoneInfo(hub.timezone or "Africa/Lagos")
    now = (at or timezone.now()).astimezone(tz)
    day = _DAY_KEYS[now.weekday()]
    windows = hours.get(day) or hours.get(day.upper()) or []
    if not windows:
        return False
    local_t = now.timetz().replace(tzinfo=None)
    for window in windows:
        if not isinstance(window, (list, tuple)) or len(window) != 2:
            continue
        start, end = _parse_hhmm(str(window[0])), _parse_hhmm(str(window[1]))
        if start <= local_t <= end:
            return True
    return False


def assert_hub_accepts_reservations(hub: Hub) -> None:
    if not hub_is_open(hub):
        raise DomainError(
            "HUB_CLOSED",
            f"Hub {hub.code} is closed or outside operating hours.",
            http=409,
        )
