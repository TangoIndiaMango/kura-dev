"""Daily price matrix activation when scheduled effective_from arrives."""
from __future__ import annotations

import logging

from django.tasks import task

logger = logging.getLogger("kura.tasks")


@task
def activate_due_price_matrices_task(*, limit: int = 100) -> dict:
    from mobility.services.plans.jobs import activate_due_price_matrices

    result = activate_due_price_matrices(limit=limit)
    logger.info("activate_due_price_matrices_done %s", result)
    return result
