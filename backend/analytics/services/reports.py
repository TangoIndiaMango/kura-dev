"""ReportJob create + process (IMPACT_PDF + CSV kinds)."""
from __future__ import annotations

import logging
from datetime import timedelta

from django.core.files.base import ContentFile
from django.core.files.storage import default_storage
from django.db import transaction
from django.utils import timezone

from analytics.models import ReportJob
from analytics.services.impact_pdf import render_impact_pdf
from analytics.services.report_csvs import (
    render_fleet_csv,
    render_ops_csv,
    render_revenue_csv,
)
from core.exceptions import DomainError
from core.services.events import emit_event

logger = logging.getLogger(__name__)

TTL_HOURS = 24
SUPPORTED_KINDS = frozenset(
    {
        ReportJob.Kind.IMPACT_PDF,
        ReportJob.Kind.OPS_CSV,
        ReportJob.Kind.FLEET_CSV,
        ReportJob.Kind.REVENUE_CSV,
    }
)


def _render_payload(*, kind: str, params: dict) -> tuple[bytes, str, str]:
    if kind == ReportJob.Kind.IMPACT_PDF:
        period = params.get("period")
        data = render_impact_pdf(period=period)
        return data, f"kura-impact-{period or 'latest'}.pdf", "application/pdf"
    if kind == ReportJob.Kind.OPS_CSV:
        data, name = render_ops_csv(params=params)
        return data, name, "text/csv; charset=utf-8"
    if kind == ReportJob.Kind.FLEET_CSV:
        data, name = render_fleet_csv(params=params)
        return data, name, "text/csv; charset=utf-8"
    if kind == ReportJob.Kind.REVENUE_CSV:
        data, name = render_revenue_csv(params=params)
        return data, name, "text/csv; charset=utf-8"
    raise DomainError(
        "UNSUPPORTED",
        f"Report kind {kind} is not implemented yet.",
        http=501,
    )


class ReportJobService:
    @staticmethod
    @transaction.atomic
    def create(
        *,
        kind: str,
        params: dict | None = None,
        actor=None,
        idempotency_key: str = "",
    ) -> ReportJob:
        if kind not in ReportJob.Kind.values:
            raise DomainError(
                "VALIDATION", f"Unsupported report kind '{kind}'.", http=400
            )
        if kind not in SUPPORTED_KINDS:
            raise DomainError(
                "UNSUPPORTED",
                f"Report kind {kind} is not available in this release.",
                http=501,
            )
        key = (idempotency_key or "").strip()
        if key:
            existing = ReportJob.objects.filter(
                idempotency_key=key, requested_by=actor
            ).first()
            if existing is not None:
                return existing

        job = ReportJob.objects.create(
            kind=kind,
            params=dict(params or {}),
            requested_by=actor,
            status=ReportJob.Status.QUEUED,
            idempotency_key=key,
            expires_at=timezone.now() + timedelta(hours=TTL_HOURS),
        )
        emit_event(
            action="report.queued",
            subject_type="report_job",
            subject_id=str(job.id),
            subject_label=kind,
            actor=actor,
            after={"kind": kind, "params": job.params, "status": job.status},
        )

        def _enqueue() -> None:
            from analytics.tasks.reports import process_report_job_task

            process_report_job_task.enqueue(job_id=str(job.id))

        transaction.on_commit(_enqueue)
        return job

    @staticmethod
    def process(*, job_id: str) -> ReportJob:
        with transaction.atomic():
            job = ReportJob.objects.select_for_update().get(pk=job_id)
            if job.status in (
                ReportJob.Status.READY,
                ReportJob.Status.RUNNING,
            ):
                return job
            if job.status == ReportJob.Status.EXPIRED:
                raise DomainError("INVALID_STATE", "Report job expired.", http=409)
            job.status = ReportJob.Status.RUNNING
            job.save(update_fields=["status", "updated_at"])

        try:
            payload, filename, content_type = _render_payload(
                kind=job.kind, params=job.params or {}
            )
            folder = "impact" if job.kind == ReportJob.Kind.IMPACT_PDF else "csv"
            ext = "pdf" if content_type.startswith("application/pdf") else "csv"
            storage_key = f"reports/{folder}/{job.id}.{ext}"
            default_storage.save(storage_key, ContentFile(payload))
            with transaction.atomic():
                locked = ReportJob.objects.select_for_update().get(pk=job.pk)
                locked.file_public_id = storage_key
                locked.status = ReportJob.Status.READY
                locked.expires_at = timezone.now() + timedelta(hours=TTL_HOURS)
                locked.raw = {
                    **(locked.raw or {}),
                    "content_type": content_type,
                    "bytes": len(payload),
                    "filename": filename,
                }
                locked.save(
                    update_fields=[
                        "file_public_id",
                        "status",
                        "expires_at",
                        "raw",
                        "updated_at",
                    ]
                )
                emit_event(
                    action="report.ready",
                    subject_type="report_job",
                    subject_id=str(locked.id),
                    subject_label=locked.kind,
                    after={
                        "status": locked.status,
                        "file_public_id": locked.file_public_id,
                    },
                )
                return locked
        except Exception as exc:
            logger.exception("report_job_failed id=%s", job_id)
            with transaction.atomic():
                locked = ReportJob.objects.select_for_update().get(pk=job_id)
                locked.status = ReportJob.Status.FAILED
                locked.raw = {**(locked.raw or {}), "error": str(exc)[:500]}
                locked.save(update_fields=["status", "raw", "updated_at"])
                emit_event(
                    action="report.failed",
                    subject_type="report_job",
                    subject_id=str(locked.id),
                    subject_label=locked.kind,
                    after={"status": locked.status, "error": str(exc)[:200]},
                )
            raise

    @staticmethod
    def serialize(job: ReportJob) -> dict:
        expired = bool(
            job.expires_at
            and job.expires_at < timezone.now()
            and job.status == ReportJob.Status.READY
        )
        status = ReportJob.Status.EXPIRED if expired else job.status
        download_path = ""
        if status == ReportJob.Status.READY and job.file_public_id:
            download_path = f"/api/v1/reports/{job.id}/download/"
        return {
            "id": str(job.id),
            "kind": job.kind,
            "params": job.params or {},
            "status": status,
            "file_public_id": job.file_public_id,
            "download_path": download_path,
            "expires_at": job.expires_at.isoformat() if job.expires_at else None,
            "raw": {
                k: v
                for k, v in (job.raw or {}).items()
                if k in ("content_type", "filename", "bytes", "error")
            },
            "created_at": job.created_at.isoformat(),
        }
