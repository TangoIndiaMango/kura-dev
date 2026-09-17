"""Hub last_sync_at writers — heartbeat until device twin / offline sync ships."""
from __future__ import annotations

from django.utils import timezone

from mobility.models import Hub


def touch_hub_last_sync(hub: Hub | None) -> None:
    if hub is None:
        return
    Hub.objects.filter(pk=hub.pk).update(last_sync_at=timezone.now())
