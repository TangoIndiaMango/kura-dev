from __future__ import annotations

from django.http import HttpResponse
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from drf_spectacular.utils import extend_schema

from accounts.permissions import HasCapabilityOrReadOwn
from core.pagination import KuraCursorPagination
from core.responses import ok
from finance.filters import PaymentFilter
from finance.models import Payment
from finance.selectors import payments_for
from finance.serializers import PaymentSerializer
from finance.services.receipts import build_payment_receipt_document, render_receipt_pdf


class PaymentViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [IsAuthenticated, HasCapabilityOrReadOwn]
    serializer_class = PaymentSerializer
    pagination_class = KuraCursorPagination
    filterset_class = PaymentFilter
    capability_map = {
        "list": "finance:read",
        "retrieve": "finance:read",
        "receipt": "finance:read",
    }

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return Payment.objects.none()
        return payments_for(self.request.user)

    @extend_schema(responses={200: dict})
    @action(detail=True, methods=["get"])
    def receipt(self, request, pk=None):
        payment = self.get_object()
        doc = build_payment_receipt_document(payment=payment)
        if request.query_params.get("as") == "pdf":
            pdf = render_receipt_pdf(doc)
            resp = HttpResponse(pdf, content_type="application/pdf")
            resp["Content-Disposition"] = (
                f'attachment; filename="{payment.receipt_code}.pdf"'
            )
            return resp
        return ok(doc)
