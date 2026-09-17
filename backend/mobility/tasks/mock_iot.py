"""Enqueue mock IoT ticks via Django Tasks worker."""
from __future__ import annotations

import logging

from django.tasks import task

logger = logging.getLogger("kura.tasks")


@task
def tick_mock_iot_task(*, limit: int = 200) -> dict:
    from integrations.services.mock_iot_tick import tick_mock_iot

    result = tick_mock_iot(limit=limit)
    logger.info("tick_mock_iot_task %s", result)
    return result
