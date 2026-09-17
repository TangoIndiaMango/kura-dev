from django.core.management.base import BaseCommand

from accounts.services import RoleService


class Command(BaseCommand):
    help = "Sync RBAC permission catalog and system roles from accounts.capabilities."

    def handle(self, *args, **options):
        perms, roles = RoleService.sync_catalog()
        self.stdout.write(self.style.SUCCESS(f"Synced {perms} permissions and {roles} system roles."))
