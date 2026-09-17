"""Django Tasks: email + unreturned + settlement + subscriptions + credit + pricing."""
from core.tasks.credit import credit_auto_debit_task, recompute_credit_scores_task
from core.tasks.email import send_templated_email_task
from core.tasks.pricing import activate_due_price_matrices_task
from core.tasks.settlement import reconcile_cash_settlements_task
from core.tasks.subscriptions import renew_subscriptions_task
from core.tasks.unreturned import flag_unreturned_batteries_task
from analytics.tasks.reports import process_report_job_task
from mobility.tasks.mock_iot import tick_mock_iot_task
from mobility.tasks.swap_lifecycle import sweep_swap_lifecycle_task

__all__ = [
    "send_templated_email_task",
    "flag_unreturned_batteries_task",
    "reconcile_cash_settlements_task",
    "renew_subscriptions_task",
    "recompute_credit_scores_task",
    "credit_auto_debit_task",
    "activate_due_price_matrices_task",
    "process_report_job_task",
    "sweep_swap_lifecycle_task",
    "tick_mock_iot_task",
]
