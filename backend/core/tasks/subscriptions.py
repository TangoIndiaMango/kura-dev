"""Hourly subscription expire + auto-renew sweeps."""
from __future__ import annotations

import logging

from django.tasks import task

logger = logging.getLogger("kura.tasks")


@task
def renew_subscriptions_task(*, limit: int = 100) -> dict:
    from mobility.services.plans.jobs import (
        expire_due_subscriptions,
        notify_price_change_before_renew,
        renew_due_subscriptions,
    )

    expired = expire_due_subscriptions(limit=limit)
    renewed = renew_due_subscriptions(limit=limit)
    warned = notify_price_change_before_renew(within_hours=24, limit=limit)
    result = {**expired, **renewed, **warned}
    logger.info("renew_subscriptions_done %s", result)
    return result
