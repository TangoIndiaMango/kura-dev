from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from .models import Shift, Override, Alert
from .serializers import ShiftSerializer, OverrideSerializer, AlertSerializer

class ShiftViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = ShiftSerializer
    queryset = Shift.objects.select_related('agent', 'hub').all().order_by('-opened_at')

class OverrideViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = OverrideSerializer
    queryset = Override.objects.select_related('agent', 'swap').all().order_by('-created_at')

class AlertViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = AlertSerializer
    queryset = Alert.objects.select_related('hub').all().order_by('-created_at')
    filterset_fields = ['severity', 'is_resolved', 'kind']

    @action(detail=True, methods=['post'])
    def resolve(self, request, pk=None):
        alert = self.get_object()
        alert.is_resolved = True
        alert.resolved_at = timezone.now()
        alert.save(update_fields=['is_resolved', 'resolved_at'])
        return Response(AlertSerializer(alert).data)
