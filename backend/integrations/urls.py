from django.urls import include, path
from rest_framework.routers import DefaultRouter

from integrations.views.psp_events import PspWebhookEventViewSet
from integrations.views.webhooks import nomba_webhook, paystack_webhook

router = DefaultRouter()
router.register(r"events", PspWebhookEventViewSet, basename="psp-webhook-events")

urlpatterns = [
    path("paystack", paystack_webhook, name="webhook-paystack"),
    path("nomba", nomba_webhook, name="webhook-nomba"),
    path("", include(router.urls)),
]
