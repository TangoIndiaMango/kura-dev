from django.core.management.base import BaseCommand
from django.utils import timezone
from accounts.models import User, Account, Driver, StaffMembership
from mobility.models import (
    BatteryType, Hub, Battery, HubSlot, VehicleModel,
    Vehicle, Plan, Subscription, Reservation, Swap
)
from finance.models import Wallet, VirtualAccount, LedgerAccount, LedgerTransaction, LedgerEntry, Payment
from operations.models import Shift, Alert

class Command(BaseCommand):
    help = 'Seed initial KURA Mobility data: Lagos hubs, batteries, slots, vehicles, accounts, plans.'

    def handle(self, *args, **options):
        self.stdout.write("Seeding KURA Mobility database...")

        # 1. Users
        admin_user, _ = User.objects.get_or_create(
            email='admin@kura.eco',
            defaults={
                'first_name': 'Amina',
                'last_name': 'Bello',
                'role': User.Role.SUPER_ADMIN,
                'is_staff': True,
                'is_superuser': True,
            }
        )
        admin_user.set_password('adminpass123')
        admin_user.save()

        ops_user, _ = User.objects.get_or_create(
            email='ops@kura.eco',
            defaults={
                'first_name': 'Tunde',
                'last_name': 'Adeleke',
                'role': User.Role.OPS_MANAGER,
                'is_staff': True,
            }
        )
        ops_user.set_password('opspass123')
        ops_user.save()

        agent_user, _ = User.objects.get_or_create(
            email='agent.yaba@kura.eco',
            defaults={
                'first_name': 'Chinedu',
                'last_name': 'Okafor',
                'phone': '+2348098765432',
                'role': User.Role.HUB_AGENT,
                'is_staff': True,
            }
        )
        agent_user.set_password('agentpass123')
        agent_user.save()

        driver_user, _ = User.objects.get_or_create(
            phone='+2348012345678',
            defaults={
                'email': 'driver@kura.eco',
                'first_name': 'Ibrahim',
                'last_name': 'Musa',
                'role': User.Role.DRIVER,
            }
        )
        driver_user.set_password('driverpass123')
        driver_user.set_pin('1234')
        driver_user.save()

        # 2. Driver Account & Profile
        account, _ = Account.objects.get_or_create(
            owner_user=driver_user,
            defaults={
                'kura_id': 'KR-882194',
                'display_name': 'Ibrahim Musa (Express Rider)',
                'kind': Account.Kind.INDIVIDUAL,
                'status': Account.Status.ACTIVE,
                'kyc_status': Account.KycStatus.VERIFIED,
            }
        )
        driver_profile, _ = Driver.objects.get_or_create(
            user=driver_user,
            defaults={
                'account': account,
                'license_number': 'LS-8921-OK',
                'status': 'ACTIVE',
            }
        )

        # 3. Wallet & Virtual Account
        wallet, _ = Wallet.objects.get_or_create(
            account=account,
            defaults={
                'balance_kobo': 1500000, # ₦15,000.00
                'hold_kobo': 0,
            }
        )
        va, _ = VirtualAccount.objects.get_or_create(
            account=account,
            defaults={
                'nuban': '9910482910',
                'bank_name': 'Wema Bank / KURA',
                'account_name': 'KURA / Ibrahim Musa',
            }
        )

        # 4. Battery Type
        b_type, _ = BatteryType.objects.get_or_create(
            name='Kura PowerCore 72V 45Ah',
            defaults={
                'manufacturer': 'KURA Energy Labs',
                'capacity_kwh': 3.24,
                'nominal_voltage': 72,
                'vehicle_type': 'MOTORCYCLE',
            }
        )

        # 5. Hubs in Lagos
        hubs_data = [
            {'code': 'HUB-YBA-01', 'name': 'Yaba Commercial Hub', 'address': 'Commercial Ave & Herbert Macaulay Way, Yaba, Lagos', 'lat': 6.5173, 'lng': 3.3734, 'slots': 16, 'solar': 15.0},
            {'code': 'HUB-IKJ-01', 'name': 'Ikeja Mobility Station', 'address': 'Awolowo Way, Ikeja, Lagos', 'lat': 6.5954, 'lng': 3.3448, 'slots': 16, 'solar': 18.0},
            {'code': 'HUB-VI-01', 'name': 'Victoria Island Central Hub', 'address': 'Ahmadu Bello Way, VI, Lagos', 'lat': 6.4281, 'lng': 3.4219, 'slots': 12, 'solar': 22.0},
        ]

        created_hubs = []
        for h in hubs_data:
            hub, _ = Hub.objects.get_or_create(
                code=h['code'],
                defaults={
                    'name': h['name'],
                    'address': h['address'],
                    'lat': h['lat'],
                    'lng': h['lng'],
                    'slot_count': h['slots'],
                    'solar_capacity_kw': h['solar'],
                    'status': Hub.Status.ONLINE,
                }
            )
            created_hubs.append(hub)

            # Create slots and batteries if not existing
            if hub.slots.count() == 0:
                for slot_idx in range(1, h['slots'] + 1):
                    # 70% ready, 20% charging, 10% empty
                    if slot_idx <= int(h['slots'] * 0.7):
                        bat_serial = f"BAT-{hub.code.split('-')[1]}-{slot_idx:02d}"
                        bat, _ = Battery.objects.get_or_create(
                            serial=bat_serial,
                            defaults={
                                'battery_type': b_type,
                                'status': Battery.Status.AVAILABLE,
                                'charge_pct': 95 + (slot_idx % 6),
                                'health_pct': 97,
                                'cycle_count': 14 + slot_idx,
                                'current_hub': hub,
                            }
                        )
                        HubSlot.objects.create(
                            hub=hub,
                            slot_no=slot_idx,
                            battery=bat,
                            state=HubSlot.State.READY
                        )
                    elif slot_idx <= int(h['slots'] * 0.9):
                        bat_serial = f"BAT-{hub.code.split('-')[1]}-{slot_idx:02d}"
                        bat, _ = Battery.objects.get_or_create(
                            serial=bat_serial,
                            defaults={
                                'battery_type': b_type,
                                'status': Battery.Status.CHARGING,
                                'charge_pct': 35 + (slot_idx * 4),
                                'health_pct': 98,
                                'cycle_count': 8 + slot_idx,
                                'current_hub': hub,
                            }
                        )
                        HubSlot.objects.create(
                            hub=hub,
                            slot_no=slot_idx,
                            battery=bat,
                            state=HubSlot.State.CHARGING
                        )
                    else:
                        HubSlot.objects.create(
                            hub=hub,
                            slot_no=slot_idx,
                            battery=None,
                            state=HubSlot.State.EMPTY
                        )

        # 6. Vehicle Model & Vehicle
        v_model, _ = VehicleModel.objects.get_or_create(
            make='Silversun',
            model='Titan EV 72V',
            defaults={
                'vehicle_type': 'MOTORCYCLE',
                'battery_type': b_type,
            }
        )

        mounted_battery, _ = Battery.objects.get_or_create(
            serial='BAT-MNT-8819',
            defaults={
                'battery_type': b_type,
                'status': Battery.Status.ISSUED,
                'charge_pct': 68,
                'health_pct': 99,
                'cycle_count': 22,
            }
        )

        vehicle, _ = Vehicle.objects.get_or_create(
            registration_plate='LAG-839-XY',
            defaults={
                'account': account,
                'vehicle_model': v_model,
                'current_battery': mounted_battery,
                'status': Vehicle.Status.ACTIVE,
            }
        )

        # 7. Subscription Plans
        Plan.objects.get_or_create(
            code='PLAN-PAY-SWAP',
            defaults={
                'name': 'Pay-Per-Swap (Standard)',
                'vehicle_type': 'MOTORCYCLE',
                'duration_days': 1,
                'swap_allowance': 1,
                'price_kobo': 150000, # ₦1,500.00
                'is_active': True,
            }
        )
        Plan.objects.get_or_create(
            code='PLAN-WEEKLY-UNLTD',
            defaults={
                'name': 'Weekly Power Pass (Unlimited Swaps)',
                'vehicle_type': 'MOTORCYCLE',
                'duration_days': 7,
                'swap_allowance': None,
                'price_kobo': 950000, # ₦9,500.00
                'is_active': True,
            }
        )
        Plan.objects.get_or_create(
            code='PLAN-MONTHLY-FLEET',
            defaults={
                'name': 'Monthly Commercial Pro',
                'vehicle_type': 'MOTORCYCLE',
                'duration_days': 30,
                'swap_allowance': None,
                'price_kobo': 3500000, # ₦35,000.00
                'is_active': True,
            }
        )

        # 8. Active Reservation for Demonstration
        yaba_hub = created_hubs[0]
        res, _ = Reservation.objects.get_or_create(
            code='KB-4921',
            defaults={
                'account': account,
                'vehicle': vehicle,
                'driver': driver_profile,
                'hub': yaba_hub,
                'payment_mode': Reservation.PaymentMode.WALLET,
                'status': Reservation.Status.CONFIRMED,
                'expires_at': timezone.now() + timezone.timedelta(minutes=18),
            }
        )

        # 9. Sample Alerts
        Alert.objects.get_or_create(
            kind=Alert.Kind.BATTERY_MISMATCH,
            defaults={
                'hub': yaba_hub,
                'severity': Alert.Severity.WARNING,
                'message': 'Battery BAT-YBA-02 swapped by vehicle LAG-839-XY did not match previous issued serial.',
                'is_resolved': False,
            }
        )
        Alert.objects.get_or_create(
            kind=Alert.Kind.LOW_INVENTORY,
            defaults={
                'hub': created_hubs[2], # VI hub
                'severity': Alert.Severity.INFO,
                'message': 'Victoria Island Central Hub currently has 3 ready batteries remaining.',
                'is_resolved': True,
            }
        )

        self.stdout.write(self.style.SUCCESS("KURA Mobility database seeded successfully!"))
        self.stdout.write(self.style.SUCCESS("Driver user: phone '+2348012345678', password 'driverpass123', PIN '1234'"))
        self.stdout.write(self.style.SUCCESS("Admin user: email 'admin@kura.eco', password 'adminpass123'"))
        self.stdout.write(self.style.SUCCESS("Ops user: email 'ops@kura.eco', password 'opspass123'"))
