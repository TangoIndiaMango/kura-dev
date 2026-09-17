"""Flag ISSUED packs past expected_return_by (cron / just)."""
from django.core.management.base import BaseCommand

from mobility.services.batteries.unreturned import process_unreturned_batteries


class Command(BaseCommand):
    help = "Suspend accounts for batteries past the 48h return window."

    def add_arguments(self, parser):
        parser.add_argument("--limit", type=int, default=200)

    def handle(self, *args, **options):
        result = process_unreturned_batteries(limit=options["limit"])
        self.stdout.write(
            self.style.SUCCESS(
                f"unreturned processed={result['processed']} suspended={result['suspended']}"
            )
        )
