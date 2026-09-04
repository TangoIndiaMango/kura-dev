from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from drf_spectacular.utils import extend_schema

from .models import (
    BatteryType, Hub, Battery, HubSlot, VehicleModel,
    Vehicle, Plan, Subscription, Reservation, Swap
)
from .serializers import (
    BatteryTypeSerializer, HubSerializer, BatterySerializer,
    VehicleModelSerializer, VehicleSerializer, PlanSerializer,
    SubscriptionSerializer, ReservationSerializer, SwapSerializer,
    SwapCompleteRequestSerializer
)
from .services import ReservationService, SwapService

class HubViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = HubSerializer
    queryset = Hub.objects.prefetch_related('slots__battery').all().order_by('code')
    filterset_fields = ['status']
    search_fields = ['code', 'name', 'address']

    @action(detail=True, methods=['get'])
    def slots(self, request, pk=None):
        hub = self.get_object()
        serializer = HubSerializer(hub)
        return Response(serializer.data['slots'])

class BatteryViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = BatterySerializer
    queryset = Battery.objects.select_related('battery_type', 'current_hub').all().order_by('-created_at')
    filterset_fields = ['status', 'battery_type', 'current_hub']
    search_fields = ['serial']

class VehicleViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = VehicleSerializer
    queryset = Vehicle.objects.select_related('vehicle_model', 'current_battery', 'account').all().order_by('-created_at')

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return Vehicle.objects.none()
        user = self.request.user
        if not user or not user.is_authenticated:
            return Vehicle.objects.none()
        qs = Vehicle.objects.select_related('vehicle_model', 'current_battery', 'account').all()
        if hasattr(user, 'role') and user.role == 'DRIVER' and hasattr(user, 'driver_profile'):
            return qs.filter(account=user.driver_profile.account)
        return qs.order_by('-created_at')

class PlanViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = PlanSerializer
    queryset = Plan.objects.filter(is_active=True).order_by('price_kobo')
    filterset_fields = ['vehicle_type']

class SubscriptionViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = SubscriptionSerializer
    queryset = Subscription.objects.select_related('plan', 'vehicle', 'account').all().order_by('-created_at')

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return Subscription.objects.none()
        user = self.request.user
        if not user or not user.is_authenticated:
            return Subscription.objects.none()
        qs = Subscription.objects.select_related('plan', 'vehicle', 'account').all()
        if hasattr(user, 'role') and user.role == 'DRIVER' and hasattr(user, 'driver_profile'):
            return qs.filter(account=user.driver_profile.account)
        return qs.order_by('-created_at')

class ReservationViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = ReservationSerializer
    queryset = Reservation.objects.select_related('hub', 'vehicle', 'driver__user', 'account').all().order_by('-created_at')

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return Reservation.objects.none()
        user = self.request.user
        if not user or not user.is_authenticated:
            return Reservation.objects.none()
        qs = Reservation.objects.select_related('hub', 'vehicle', 'driver__user', 'account').all()
        if hasattr(user, 'role') and user.role == 'DRIVER' and hasattr(user, 'driver_profile'):
            return qs.filter(account=user.driver_profile.account)
        return qs.order_by('-created_at')

    def create(self, request, *args, **kwargs):
        user = request.user
        driver = getattr(user, 'driver_profile', None)
        account_id = request.data.get('account')
        vehicle_id = request.data.get('vehicle')
        hub_id = request.data.get('hub')
        payment_mode = request.data.get('payment_mode', 'WALLET')

        if not driver:
            from accounts.models import Driver
            driver = Driver.objects.filter(account_id=account_id).first()

        account = driver.account if driver else None
        vehicle = Vehicle.objects.get(id=vehicle_id)
        hub = Hub.objects.get(id=hub_id)

        reservation = ReservationService.create_reservation(
            account=account,
            vehicle=vehicle,
            driver=driver,
            hub=hub,
            payment_mode=payment_mode
        )
        return Response(ReservationSerializer(reservation).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        reservation = self.get_object()
        reservation.status = Reservation.Status.CANCELLED
        reservation.save(update_fields=['status'])
        if reservation.battery:
            reservation.battery.status = Battery.Status.AVAILABLE
            reservation.battery.save(update_fields=['status'])
        return Response({"status": "cancelled", "id": str(reservation.id)})

class SwapViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = SwapSerializer
    queryset = Swap.objects.select_related(
        'hub', 'vehicle', 'driver__user', 'account', 'returned_battery', 'issued_battery'
    ).all().order_by('-created_at')

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return Swap.objects.none()
        user = self.request.user
        if not user or not user.is_authenticated:
            return Swap.objects.none()
        qs = Swap.objects.select_related(
            'hub', 'vehicle', 'driver__user', 'account', 'returned_battery', 'issued_battery'
        ).all()
        if hasattr(user, 'role') and user.role == 'DRIVER' and hasattr(user, 'driver_profile'):
            return qs.filter(account=user.driver_profile.account)
        return qs.order_by('-created_at')

    @extend_schema(request=SwapCompleteRequestSerializer, responses={201: SwapSerializer})
    @action(detail=False, methods=['post'])
    def complete(self, request):
        serializer = SwapCompleteRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        swap = SwapService.complete_swap(
            reservation_id=data.get('reservation_id'),
            hub_id=data['hub_id'],
            vehicle_id=data['vehicle_id'],
            driver_id=data['driver_id'],
            account_id=data['account_id'],
            returned_battery_serial=data['returned_battery_serial'],
            issued_battery_serial=data['issued_battery_serial'],
            returned_charge_pct=data.get('returned_charge_pct', 15),
            issued_charge_pct=data.get('issued_charge_pct', 100),
            amount_kobo=data.get('amount_kobo', 150000),
            agent=request.user
        )
        return Response(SwapSerializer(swap).data, status=status.HTTP_201_CREATED)
