from django.core.management.base import BaseCommand

from core.management.commands.seed_data import (
    seed_account_and_wallet,
    seed_engines_impact,
    seed_hubs,
    seed_ops_demo,
    seed_personas,
    seed_users,
    seed_vehicle_plans_alerts,
    seed_volume_history,
)


class Command(BaseCommand):
    help = "Seed initial KURA Mobility data: Lagos hubs, batteries, slots, vehicles, accounts, plans."

    def add_arguments(self, parser):
        parser.add_argument(
            "--fresh",
            action="store_true",
            help="Wipe operational swap history, reservations, and reset packs/vehicles to initial clean state.",
        )

    def handle(self, *args, **options):
        if options.get("fresh"):
            self.stdout.write(self.style.WARNING("Wiping operational swap history and resetting batteries/slots..."))
            from mobility.models import Battery, BatteryEvent, HubSlot, Reservation, Swap, Vehicle
            Swap.objects.all().delete()
            Reservation.objects.all().delete()
            BatteryEvent.objects.all().delete()
            Vehicle.objects.update(current_battery=None)
            HubSlot.objects.all().delete()
            Battery.objects.all().delete()

        self.stdout.write("Seeding KURA Mobility database...")
        users = seed_users()
        account, driver, battery_type = seed_account_and_wallet(
            driver_user=users["driver"]
        )
        hubs = seed_hubs(battery_type=battery_type)
        seed_vehicle_plans_alerts(
            account=account,
            driver=driver,
            battery_type=battery_type,
            hubs=hubs,
        )
        seed_ops_demo(users=users, hubs=hubs, account=account)
        path_b = seed_engines_impact(
            users=users, hubs=hubs, battery_type=battery_type
        )
        personas = seed_personas(
            battery_type=battery_type, hubs=hubs, admin=users["admin"]
        )
        volume = seed_volume_history(
            personas=personas,
            solo_account=account,
            solo_driver=driver,
            hubs=hubs,
            agent=users["agent"],
            admin=users["admin"],
        )

        self.stdout.write(self.style.SUCCESS("KURA Mobility database seeded successfully!"))
        self.stdout.write("")
        self.stdout.write(self.style.SUCCESS("Logins"))
        self.stdout.write("  Admin:  email admin@yopmail.com / adminpass123")
        self.stdout.write("  Ops:    email ops@yopmail.com / opspass123")
        self.stdout.write(
            "  Agent:  email agent.yaba@yopmail.com / agentpass123  (open shift @ Yaba)"
        )
        self.stdout.write(
            "  Driver: phone +2348012345678 / email kura.driver@yopmail.com → PIN 1234"
        )
        self.stdout.write(
            "  Fleet+VCU: phone +2348011110001 / fleet.vcu@yopmail.com → fleetpass123 / PIN 1234"
        )
        self.stdout.write(
            "  Fleet no-VCU: phone +2348022220001 / fleet.novcu@yopmail.com → fleetpass123 / PIN 1234"
        )
        self.stdout.write(
            "  Peer driver A: +2348011110002 / fleet.driver.a@yopmail.com → driverpass123"
        )
        self.stdout.write("  Riders: rider01@yopmail.com … rider08@yopmail.com → driverpass123")
        self.stdout.write("")
        self.stdout.write(self.style.SUCCESS("Volume seed (idempotent)"))
        self.stdout.write(
            f"  payments+{volume['payments']}  swaps+{volume['swaps']}  "
            f"vcu_cmds+{volume['vcu_commands']}  rules+{volume['alert_rules']}  "
            f"psp_events+{volume['psp_events']}"
        )
        self.stdout.write("  VCU vehicles: FLEET-VCU-01..03 (IoT key set). No-VCU: FLEET-NV-01..02")
        self.stdout.write("")
        self.stdout.write(self.style.SUCCESS("Hubs (Admin → Hubs → open bay)"))
        for hub in hubs:
            self.stdout.write(f"  {hub.code}  {hub.name}")
            self.stdout.write(f"    id={hub.id}  path=/hubs/{hub.id}/swap")
        self.stdout.write("")
        self.stdout.write(self.style.SUCCESS("Path B / Impact seed"))
        self.stdout.write(f"  Account {path_b.kura_id} — {path_b.display_name}")
        self.stdout.write(
            "Cash recon: Payments → Cash. Alert rules: Alerts → Rules. "
            "PSP events: PSP → Webhooks. Revenue: Revenue → Streams."
        )
