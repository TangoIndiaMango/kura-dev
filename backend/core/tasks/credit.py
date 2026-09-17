"""Credit nightly score + daily auto-debit sweeps."""
from __future__ import annotations

import logging

from django.tasks import task

logger = logging.getLogger("kura.tasks")


@task
def recompute_credit_scores_task(*, limit: int = 200) -> dict:
    from credit.services.jobs import recompute_scores

    result = recompute_scores(limit=limit)
    logger.info("recompute_credit_scores_done %s", result)
    return result


@task
def credit_auto_debit_task(*, limit: int = 200) -> dict:
    from credit.services.jobs import auto_debit_loans

    result = auto_debit_loans(limit=limit)
    logger.info("credit_auto_debit_done %s", result)
    return result
