from django.urls import path

from analytics.views.reports import (
    ReportCreateView,
    ReportDetailView,
    ReportDownloadView,
)

urlpatterns = [
    path("reports/", ReportCreateView.as_view(), name="reports-create"),
    path("reports/<uuid:report_id>/", ReportDetailView.as_view(), name="reports-detail"),
    path(
        "reports/<uuid:report_id>/download/",
        ReportDownloadView.as_view(),
        name="reports-download",
    ),
]
