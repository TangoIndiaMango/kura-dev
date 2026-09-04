from rest_framework.generics import GenericAPIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from drf_spectacular.utils import extend_schema, OpenApiTypes
from django.utils import timezone
from django.db.models import Sum, Count

from mobility.models import Hub, Battery, HubSlot, Swap, Vehicle
from finance.models import Payment, Wallet
from operations.models import Alert

class DashboardStatsView(GenericAPIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(responses={200: OpenApiTypes.OBJECT})
    def get(self, request):
        today_start = timezone.now().replace(hour=0, minute=0, second=0, microsecond=0)

        total_hubs = Hub.objects.count()
        online_hubs = Hub.objects.filter(status=Hub.Status.ONLINE).count()

        total_batteries = Battery.objects.count()
        ready_batteries = Battery.objects.filter(status=Battery.Status.AVAILABLE, charge_pct__gte=90).count()
        charging_batteries = Battery.objects.filter(status=Battery.Status.CHARGING).count()
        issued_batteries = Battery.objects.filter(status=Battery.Status.ISSUED).count()

        total_swaps = Swap.objects.count()
        today_swaps = Swap.objects.filter(created_at__gte=today_start).count()
        today_mismatches = Swap.objects.filter(created_at__gte=today_start, mismatch_flag=True).count()

        today_revenue_agg = Payment.objects.filter(created_at__gte=today_start, status='SUCCESS').aggregate(total=Sum('amount_kobo'))
        today_revenue_kobo = today_revenue_agg['total'] or 0

        active_alerts = Alert.objects.filter(is_resolved=False).count()
        active_vehicles = Vehicle.objects.filter(status='ACTIVE').count()

        slots_by_state = HubSlot.objects.values('state').annotate(count=Count('id'))
        slot_map = {item['state']: item['count'] for item in slots_by_state}

        return Response({
            "hubs": {
                "total": total_hubs,
                "online": online_hubs,
            },
            "batteries": {
                "total": total_batteries,
                "ready": ready_batteries,
                "charging": charging_batteries,
                "issued": issued_batteries,
            },
            "swaps": {
                "total": total_swaps,
                "today": today_swaps,
                "today_mismatches": today_mismatches,
            },
            "finance": {
                "today_revenue_kobo": today_revenue_kobo,
                "today_revenue_naira": today_revenue_kobo / 100.0,
            },
            "operations": {
                "active_alerts": active_alerts,
                "active_vehicles": active_vehicles,
                "slots_distribution": slot_map,
            }
        })
