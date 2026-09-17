"""Media upload API — stores MediaAsset rows; returns id + delivery URL."""
from __future__ import annotations

from drf_spectacular.utils import OpenApiParameter, extend_schema
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated

from core.responses import created
from core.services.media import MediaService
from core.throttles import MediaUploadThrottle


class MediaViewSet(viewsets.GenericViewSet):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]
    throttle_classes = [MediaUploadThrottle]

    def _collect_files(self, request):
        files = []
        for key in ("file", "files", "file[]", "files[]"):
            files.extend(request.FILES.getlist(key))
        seen = set()
        unique = []
        for f in files:
            marker = id(f)
            if marker in seen:
                continue
            seen.add(marker)
            unique.append(f)
        return unique

    @extend_schema(
        summary="Upload media",
        description=(
            "Accepts one or many files (images, PDF, Word). "
            "Persists a MediaAsset and returns `{id, url, provider, …}`. "
            "Pass `id` to domain endpoints (e.g. face_asset_id); do not store CDN URLs."
        ),
        parameters=[
            OpenApiParameter(
                name="kind",
                type=str,
                location=OpenApiParameter.QUERY,
                required=False,
                description="Optional kind/folder (e.g. identity, face, support).",
            ),
        ],
        request={
            "multipart/form-data": {
                "type": "object",
                "properties": {
                    "file": {"type": "string", "format": "binary"},
                    "files": {
                        "type": "array",
                        "items": {"type": "string", "format": "binary"},
                    },
                    "kind": {"type": "string"},
                },
            }
        },
        responses={201: dict},
    )
    @action(detail=False, methods=["post"], url_path="upload")
    def upload(self, request):
        kind = request.data.get("kind") or request.query_params.get("kind")
        files = self._collect_files(request)
        payload = MediaService.upload_files(
            files=files,
            kind=kind,
            uploaded_by=request.user,
        )
        return created(payload)
