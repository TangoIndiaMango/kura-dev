"""Async report generation."""
from __future__ import annotations

import logging

from django.tasks import task

logger = logging.getLogger("kura.tasks")


@task
def process_report_job_task(*, job_id: str) -> dict:
    from analytics.services.reports import ReportJobService

    job = ReportJobService.process(job_id=job_id)
    logger.info("report_job_done id=%s status=%s", job_id, job.status)
    return {"id": str(job.id), "status": job.status}
