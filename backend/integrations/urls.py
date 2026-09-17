from django.urls import path

from integrations.views.webhooks import nomba_webhook, paystack_webhook

urlpatterns = [
    path("paystack", paystack_webhook, name="webhook-paystack"),
    path("nomba", nomba_webhook, name="webhook-nomba"),
]
