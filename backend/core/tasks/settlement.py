"""Hourly cash settlement / lodge sweep."""
from __future__ import annotations

import logging

from django.tasks import task

logger = logging.getLogger("kura.tasks")


@task
def reconcile_cash_settlements_task(*, stale_hours: int = 12) -> dict:
    from operations.services.cash.settlement import CashSettlementService

    result = CashSettlementService.run_settlement_sweep(stale_hours=stale_hours)
    logger.info("reconcile_cash_settlements_done %s", result)
    return result
