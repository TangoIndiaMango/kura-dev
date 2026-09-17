from __future__ import annotations

from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from drf_spectacular.utils import extend_schema

from core.pagination import KuraCursorPagination
from core.responses import ok
from notifications.filters import NotificationFilter
from notifications.selectors import notification_stats, notifications_for
from notifications.serializers import NotificationSerializer
from notifications.services import NotificationService


class NotificationViewSet(viewsets.ReadOnlyModelViewSet):
    """GET /notifications/ — current user's inbox."""

    permission_classes = [IsAuthenticated]
    serializer_class = NotificationSerializer
    pagination_class = KuraCursorPagination
    filterset_class = NotificationFilter

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return notifications_for(self.request.user).none()
        return notifications_for(self.request.user)

    @extend_schema(responses={200: dict})
    @action(detail=False, methods=["get"], url_path="stats")
    def stats(self, request):
        return ok(notification_stats(request.user))

    @extend_schema(responses={200: NotificationSerializer})
    @action(detail=True, methods=["post"], url_path="read")
    def read(self, request, pk=None):
        note = NotificationService.mark_read(
            notification=self.get_object(), user=request.user
        )
        return ok(NotificationSerializer(note).data)

    @extend_schema(responses={200: dict})
    @action(detail=False, methods=["post"], url_path="read-all")
    def read_all(self, request):
        updated = NotificationService.mark_all_read(user=request.user)
        return ok({"updated": updated})
