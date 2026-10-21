"""Process durable QueuedTask rows (DatabaseBackend)."""
from __future__ import annotations

import time

from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from core.models import QueuedTask
from core.tasks.backends.database import execute_queued_row
from core.tasks.credit import credit_auto_debit_task, recompute_credit_scores_task
from core.tasks.pricing import activate_due_price_matrices_task
from core.tasks.settlement import auto_close_shifts_task, reconcile_cash_settlements_task
from core.tasks.subscriptions import renew_subscriptions_task
from core.tasks.unreturned import flag_unreturned_batteries_task
from core.tasks.virtual_accounts import retry_virtual_accounts_task
from mobility.tasks.mock_iot import tick_mock_iot_task
from mobility.tasks.swap_lifecycle import sweep_swap_lifecycle_task


class Command(BaseCommand):
    help = (
        "Drain QueuedTask rows (DatabaseBackend). "
        "By default also enqueues unreturned, settlement, subscriptions, credit, "
        "swap lifecycle, and mock IoT ticks."
    )

    def add_arguments(self, parser):
        parser.add_argument("--once", action="store_true", help="Process one batch and exit")
        parser.add_argument("--sleep", type=int, default=15, help="Seconds between loops")
        parser.add_argument("--batch", type=int, default=20, help="Max tasks per loop")
        parser.add_argument(
            "--no-unreturned",
            action="store_true",
            help="Skip flag_unreturned enqueue each loop",
        )
        parser.add_argument(
            "--no-settlement",
            action="store_true",
            help="Skip reconcile_cash_settlements enqueue each loop",
        )
        parser.add_argument(
            "--no-subscriptions",
            action="store_true",
            help="Skip renew_subscriptions enqueue each loop",
        )
        parser.add_argument(
            "--no-credit",
            action="store_true",
            help="Skip credit score + auto-debit enqueue each loop",
        )
        parser.add_argument(
            "--no-swaps",
            action="store_true",
            help="Skip swap hold expiry / abandon enqueue each loop",
        )
        parser.add_argument(
            "--no-mock-iot",
            action="store_true",
            help="Skip mock OEM SoC/location tick each loop",
        )
        parser.add_argument(
            "--no-pricing",
            action="store_true",
            help="Skip scheduled price-matrix activation each loop",
        )

    def handle(self, *args, **options):
        once = options["once"]
        sleep_s = max(1, options["sleep"])
        batch = max(1, min(options["batch"], 200))
        do_unreturned = not options["no_unreturned"]
        do_settlement = not options["no_settlement"]
        do_subs = not options["no_subscriptions"]
        do_credit = not options["no_credit"]
        do_swaps = not options["no_swaps"]
        do_mock_iot = not options["no_mock_iot"]
        do_pricing = not options["no_pricing"]

        while True:
            if do_unreturned:
                flag_unreturned_batteries_task.enqueue(limit=200)
            if do_swaps:
                sweep_swap_lifecycle_task.enqueue(
                    reservation_limit=200,
                    swap_limit=100,
                )
            if do_mock_iot:
                tick_mock_iot_task.enqueue(limit=200)
            if do_settlement:
                auto_close_shifts_task.enqueue()
                reconcile_cash_settlements_task.enqueue(stale_hours=12)
            if do_subs:
                renew_subscriptions_task.enqueue(limit=100)
            if do_pricing:
                activate_due_price_matrices_task.enqueue(limit=100)
            retry_virtual_accounts_task.enqueue(limit=50)
            if do_credit:
                from django.core.cache import cache

                day_key = timezone.now().strftime("%Y-%m-%d")
                score_key = f"credit:enqueue:scores:{day_key}"
                debit_key = f"credit:enqueue:debit:{day_key}"
                if cache.add(score_key, "1", timeout=86_400):
                    recompute_credit_scores_task.enqueue(limit=200)
                if cache.add(debit_key, "1", timeout=86_400):
                    credit_auto_debit_task.enqueue(limit=200)

            ids = list(
                QueuedTask.objects.filter(status=QueuedTask.Status.READY)
                .order_by("created_at")
                .values_list("id", flat=True)[:batch]
            )
            done = 0
            from django.db import connection

            lock_kw = {}
            if getattr(connection.features, "has_select_for_update_skip_locked", False):
                lock_kw["skip_locked"] = True
            for pk in ids:
                with transaction.atomic():
                    row = (
                        QueuedTask.objects.select_for_update(**lock_kw)
                        .filter(pk=pk, status=QueuedTask.Status.READY)
                        .first()
                    )
                    if row is None:
                        continue
                    if execute_queued_row(row=row):
                        done += 1
            self.stdout.write(f"processed={done} queued_batch={len(ids)}")
            if once:
                break
            time.sleep(sleep_s)
