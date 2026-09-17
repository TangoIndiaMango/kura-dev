"""Driver read ViewSet."""
from __future__ import annotations

from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from accounts.filters import DriverFilter
from accounts.models import Driver
from accounts.permissions import HasCapabilityOrReadOwn
from accounts.selectors import drivers_for
from accounts.serializers import DriverSerializer
from core.pagination import KuraPageNumberPagination


class DriverViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [IsAuthenticated, HasCapabilityOrReadOwn]
    serializer_class = DriverSerializer
    pagination_class = KuraPageNumberPagination
    filterset_class = DriverFilter
    search_fields = ["user__first_name", "user__last_name", "user__phone", "license_number"]
    capability_map = {"list": "accounts:read", "retrieve": "accounts:read"}

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return Driver.objects.none()
        return drivers_for(self.request.user)
