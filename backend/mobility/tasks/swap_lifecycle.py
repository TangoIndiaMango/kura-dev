"""Swap hold expiry + abandoned session cleanup."""
from __future__ import annotations

import logging

from django.tasks import task

logger = logging.getLogger("kura.tasks")


@task
def sweep_swap_lifecycle_task(
    *,
    reservation_limit: int = 200,
    swap_limit: int = 100,
) -> dict:
    from mobility.services.swap.lifecycle import sweep_swap_lifecycle

    result = sweep_swap_lifecycle(
        reservation_limit=reservation_limit,
        swap_limit=swap_limit,
    )
    logger.info("swap_lifecycle_sweep %s", result)
    return result
