"""POST /reports + GET status/download."""
from __future__ import annotations

from drf_spectacular.utils import extend_schema
from rest_framework import serializers
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView

from accounts.permissions import HasCapability
from analytics.models import ReportJob
from analytics.services.reports import ReportJobService
from core.exceptions import DomainError
from core.responses import created, ok
from django.core.files.storage import default_storage
from django.http import FileResponse
from django.utils import timezone


class ReportCreateSerializer(serializers.Serializer):
    kind = serializers.ChoiceField(choices=ReportJob.Kind.choices)
    params = serializers.DictField(required=False)
    idempotency_key = serializers.CharField(
        required=False, allow_blank=True, max_length=64
    )


class ReportCreateView(APIView):
    permission_classes = [IsAuthenticated, HasCapability]
    required_capability = "analytics:impact"

    @extend_schema(request=ReportCreateSerializer, responses={201: dict})
    def post(self, request):
        ser = ReportCreateSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        data = ser.validated_data
        kind = data["kind"]
        job = ReportJobService.create(
            kind=kind,
            params=data.get("params") or {},
            actor=request.user,
            idempotency_key=data.get("idempotency_key") or "",
        )
        job.refresh_from_db()
        # TestCase / deferred on_commit: finish sync if still queued.
        if job.status == ReportJob.Status.QUEUED:
            ReportJobService.process(job_id=str(job.id))
            job.refresh_from_db()
        return created(ReportJobService.serialize(job))


class ReportDetailView(APIView):
    permission_classes = [IsAuthenticated, HasCapability]
    required_capability = "analytics:impact"

    @extend_schema(responses={200: dict})
    def get(self, request, report_id):
        try:
            job = ReportJob.objects.get(pk=report_id)
        except ReportJob.DoesNotExist as exc:
            raise DomainError("NOT_FOUND", "Report not found.", http=404) from exc
        return ok(ReportJobService.serialize(job))


class ReportDownloadView(APIView):
    permission_classes = [IsAuthenticated, HasCapability]
    required_capability = "analytics:impact"

    def get(self, request, report_id):
        try:
            job = ReportJob.objects.get(pk=report_id)
        except ReportJob.DoesNotExist as exc:
            raise DomainError("NOT_FOUND", "Report not found.", http=404) from exc
        if job.status != ReportJob.Status.READY or not job.file_public_id:
            raise DomainError(
                "NOT_READY",
                "Report is not ready for download.",
                http=409,
            )
        if job.expires_at and job.expires_at < timezone.now():
            raise DomainError("EXPIRED", "Report download link has expired.", http=410)
        if not default_storage.exists(job.file_public_id):
            raise DomainError("NOT_FOUND", "Report file missing.", http=404)
        handle = default_storage.open(job.file_public_id, "rb")
        filename = (job.raw or {}).get("filename") or f"kura-report-{job.id}.pdf"
        return FileResponse(
            handle,
            as_attachment=True,
            filename=str(filename),
            content_type=(job.raw or {}).get("content_type") or "application/pdf",
        )
