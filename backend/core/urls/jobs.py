from django.urls import path

from core.views.jobs import (
    ActivateDueMatricesJobView,
    AutoCloseShiftsJobView,
    FlagUnreturnedJobView,
    RenewSubscriptionsJobView,
)

urlpatterns = [
    path(
        "flag-unreturned/",
        FlagUnreturnedJobView.as_view(),
        name="job-flag-unreturned",
    ),
    path(
        "renew-subscriptions/",
        RenewSubscriptionsJobView.as_view(),
        name="job-renew-subscriptions",
    ),
    path(
        "activate-due-matrices/",
        ActivateDueMatricesJobView.as_view(),
        name="job-activate-due-matrices",
    ),
    path(
        "auto-close-shifts/",
        AutoCloseShiftsJobView.as_view(),
        name="job-auto-close-shifts",
    ),
]
