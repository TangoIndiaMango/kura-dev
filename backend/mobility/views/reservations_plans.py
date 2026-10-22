from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from drf_spectacular.utils import extend_schema

from accounts.permissions import HasCapabilityOrReadOwn
from core.pagination import KuraCursorPagination

from mobility.filters import (
    ReservationFilter,
)
from mobility.models import Hub, Vehicle, Reservation
from mobility.serializers import (
    ReservationSerializer,
)
from mobility.serializers.catalogue import ReservationLookupRequestSerializer
from mobility.selectors import (
    reservations_for,
)
from mobility.services import ReservationService
from mobility.services.reservations.lookup import lookup_reservation


class ReservationViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, HasCapabilityOrReadOwn]
    serializer_class = ReservationSerializer
    pagination_class = KuraCursorPagination
    filterset_class = ReservationFilter
    # No PUT/PATCH/DELETE: ModelViewSet exposed them with a fully writable
    # serializer and no capability (riders could edit status / hold amount).
    http_method_names = ["get", "post", "head", "options"]
    capability_map = {
        "list": "swaps:read",
        "retrieve": "swaps:read",
        "create": "swaps:read",
        "cancel": "swaps:read",
        "extend": "swaps:override",
        "lookup": "swaps:read",
    }

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return Reservation.objects.none()
        return reservations_for(self.request.user)

    def get_object(self):
        obj = super().get_object()
        return ReservationService.ensure_fresh(reservation=obj)

    def create(self, request, *args, **kwargs):
        user = request.user
        driver = getattr(user, "driver_profile", None)
        account_id = request.data.get("account")
        vehicle_id = request.data.get("vehicle")
        hub_id = request.data.get("hub")
        payment_mode = request.data.get("payment_mode", "WALLET")

        if not driver:
            from accounts.models import Driver

            driver = Driver.objects.filter(account_id=account_id).first()

        account = driver.account if driver else None
        vehicle = Vehicle.objects.select_related("vehicle_model").get(id=vehicle_id)
        hub = Hub.objects.get(id=hub_id)

        reservation = ReservationService.create_reservation(
            account=account,
            vehicle=vehicle,
            driver=driver,
            hub=hub,
            payment_mode=payment_mode,
            discount_code=request.data.get("discount_code") or "",
        )
        return Response(
            ReservationSerializer(reservation).data, status=status.HTTP_201_CREATED
        )

    @extend_schema(request=ReservationLookupRequestSerializer, responses={200: dict})
    @action(detail=False, methods=["post"], url_path="lookup")
    def lookup(self, request):
        """Bay scan: token or code (+ optional vehicle_qr / hub) → F4 envelope."""
        ser = ReservationLookupRequestSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        data = ser.validated_data
        payload = lookup_reservation(
            code=data.get("code") or "",
            token=data.get("token") or "",
            vehicle_qr=data.get("vehicle_qr") or "",
            hub_id=data.get("hub_id"),
            reservation_serializer=ReservationSerializer,
        )
        return Response(payload)

    @action(detail=True, methods=["post"])
    def cancel(self, request, pk=None):
        reservation = ReservationService.cancel_reservation(
            reservation=self.get_object(),
            actor=request.user,
        )
        return Response({"status": reservation.status, "id": str(reservation.id)})

    @action(detail=True, methods=["post"])
    def extend(self, request, pk=None):
        minutes = int(request.data.get("minutes") or 0)
        reason = str(request.data.get("reason") or "")
        reservation = ReservationService.extend_reservation(
            reservation=self.get_object(),
            minutes=minutes,
            actor=request.user,
            reason=reason,
        )
        return Response(ReservationSerializer(reservation).data)
