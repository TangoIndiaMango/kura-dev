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
        "export": "finance:read",
        "stats": "finance:read",
    }

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return Payment.objects.none()
        return payments_for(self.request.user)

    @extend_schema(responses={200: dict})
    @action(detail=False, methods=["get"])
    def stats(self, request):
        """Period totals for the same filters as the list/export (not one page)."""
        from django.db.models import Count, Q, Sum

        qs = self.filter_queryset(self.get_queryset())
        agg = qs.aggregate(
            success_kobo=Sum("amount_kobo", filter=Q(status=Payment.Status.SUCCESS)),
            success=Count("id", filter=Q(status=Payment.Status.SUCCESS)),
            pending=Count("id", filter=Q(status=Payment.Status.PENDING)),
            failed=Count("id", filter=Q(status=Payment.Status.FAILED)),
        )
        by_channel = [
            {"channel": row["channel"], "count": row["n"], "amount_kobo": int(row["t"] or 0)}
            for row in qs.filter(status=Payment.Status.SUCCESS)
            .values("channel")
            .annotate(n=Count("id"), t=Sum("amount_kobo"))
            .order_by("-t")
        ]
        return ok(
            {
                "success_kobo": int(agg["success_kobo"] or 0),
                "success_count": agg["success"],
                "pending_count": agg["pending"],
                "failed_count": agg["failed"],
                "by_channel": by_channel,
            }
        )

    @extend_schema(responses={200: bytes})
    @action(detail=False, methods=["get"], url_path="export")
    def export(self, request):
        """Statement for manual reconciliation: same filters as the list
        (hub, start_date/end_date in WAT, channel, account), plus totals by
        channel and by account."""
        from core.helpers.csv_export import table_export_response
        from finance.helpers_statement import STATEMENT_HEADERS, statement_rows

        qs = self.filter_queryset(self.get_queryset())
        params = request.query_params
        stem = "-".join(
            bit for bit in ["kura-payments", params.get("start_date"), params.get("end_date")] if bit
        )
        return table_export_response(
            format=params.get("export") or "csv",
            filename_stem=stem,
            title="Kura payments statement",
            headers=STATEMENT_HEADERS,
            rows=statement_rows(qs),
        )

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
