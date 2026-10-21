"""Admin list of ingested PSP webhook events — live audit of Paystack/Nomba."""
from __future__ import annotations

from rest_framework import serializers, viewsets
from rest_framework.permissions import IsAuthenticated

from accounts.permissions import HasCapability
from core.pagination import KuraCursorPagination
from integrations.models import PspWebhookEvent


class PspWebhookEventSerializer(serializers.ModelSerializer):
    class Meta:
        model = PspWebhookEvent
        fields = [
            "id",
            "psp",
            "psp_event_id",
            "event_kind",
            "status",
            "error",
            "created_at",
        ]
        read_only_fields = fields


class PspWebhookEventViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [IsAuthenticated, HasCapability]
    serializer_class = PspWebhookEventSerializer
    pagination_class = KuraCursorPagination
    required_capability = "finance:read"
    filterset_fields = ["psp", "status", "event_kind"]
    ordering = ["-created_at"]

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return PspWebhookEvent.objects.none()
        return PspWebhookEvent.objects.all().order_by("-created_at")
