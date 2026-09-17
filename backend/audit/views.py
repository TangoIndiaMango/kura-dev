from __future__ import annotations

from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from drf_spectacular.utils import extend_schema

from accounts.permissions import HasCapability
from audit.filters import AuditEventFilter
from audit.selectors import audit_events_for, audit_events_qs, audit_stats
from audit.serializers import AuditEventSerializer
from core.pagination import KuraCursorPagination
from core.responses import ok


class AuditEventViewSet(viewsets.ReadOnlyModelViewSet):
    """GET /audit/ — cursor feed of privileged actions."""

    permission_classes = [IsAuthenticated, HasCapability]
    serializer_class = AuditEventSerializer
    pagination_class = KuraCursorPagination
    filterset_class = AuditEventFilter
    capability_map = {
        "list": "audit:read",
        "retrieve": "audit:read",
        "stats": "audit:read",
    }

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return audit_events_qs().none()
        return audit_events_for(self.request.user)

    @extend_schema(responses={200: dict})
    @action(detail=False, methods=["get"], url_path="stats")
    def stats(self, request):
        return ok(audit_stats(user=request.user))
