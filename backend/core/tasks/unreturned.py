"""Hourly unreturned battery sweep."""
from __future__ import annotations

import logging

from django.tasks import task

logger = logging.getLogger("kura.tasks")


@task
def flag_unreturned_batteries_task(*, limit: int = 200) -> dict:
    from mobility.services.batteries.unreturned import process_unreturned_batteries

    result = process_unreturned_batteries(limit=limit)
    logger.info("flag_unreturned_done %s", result)
    return result
