"""Apply one mock IoT tick (same path as the task worker)."""
from __future__ import annotations

from django.core.management.base import BaseCommand

from integrations.services.mock_iot_tick import tick_mock_iot


class Command(BaseCommand):
    help = (
        "Run one deterministic mock OEM tick (SoC drain + GPS) for ISSUED packs. "
        "Prefer the task worker in normal use; this is for a manual nudge."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--step",
            type=int,
            default=None,
            help="Force SoC step (default: deterministic 1–3%% per pack).",
        )
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Count targets only; do not write.",
        )

    def handle(self, *args, **options):
        if options["dry_run"]:
            from mobility.models import Battery, Vehicle

            n = Vehicle.objects.filter(
                status=Vehicle.Status.ACTIVE,
                current_battery__status=Battery.Status.ISSUED,
            ).count()
            self.stdout.write(self.style.NOTICE(f"Would tick {n} mounted pack(s)."))
            return
        result = tick_mock_iot(step=options["step"])
        self.stdout.write(
            self.style.SUCCESS(
                f"updated={result['updated']} batch={result['batch']}"
            )
        )
