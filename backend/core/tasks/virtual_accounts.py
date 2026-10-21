"""Retry NUBAN provisioning that failed or never got its assign webhook (F1 E1.5)."""
from __future__ import annotations

import logging

from django.tasks import task

logger = logging.getLogger("kura.tasks")


@task
def retry_virtual_accounts_task(*, limit: int = 50) -> dict:
    from integrations.services.va import retry_pending_virtual_accounts

    result = retry_pending_virtual_accounts(limit=limit)
    if result["retried"]:
        logger.info("retry_virtual_accounts_done %s", result)
    return result
