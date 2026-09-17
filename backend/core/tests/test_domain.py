from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status

from accounts.models import User, Account, Driver
from mobility.models import BatteryType, Hub, Battery, HubSlot, VehicleModel, Vehicle, Swap, Reservation
from mobility.services import SwapService
from finance.services import LedgerService
from finance.models import LedgerAccount, LedgerTransaction
from core.exceptions import DomainError
from core.money import split_vat, format_naira

class KuraBackendTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()

        # Create user & account
        self.user = User.objects.create(
            phone='+2348000000001',
            email='testdriver@yopmail.com',
            role=User.Role.DRIVER,
            first_name='Test',
            last_name='Rider'
        )
        self.user.set_password('pass123')
        self.user.set_pin('1234')
        self.user.save()

        self.account = Account.objects.create(
            owner_user=self.user,
            display_name='Test Rider Account'
        )
        self.driver = Driver.objects.create(user=self.user, account=self.account)

        # Create battery type & hub
        self.battery_type = BatteryType.objects.create(name='Test 72V', manufacturer='KURA')
        self.hub = Hub.objects.create(code='HUB-TEST-01', name='Test Hub', address='Test Address')

        # Create batteries
        self.mounted_battery = Battery.objects.create(
            serial='BAT-ORIGINAL-01',
            battery_type=self.battery_type,
            status=Battery.Status.ISSUED,
            charge_pct=20
        )
        self.ready_battery = Battery.objects.create(
            serial='BAT-READY-01',
            battery_type=self.battery_type,
            status=Battery.Status.AVAILABLE,
            charge_pct=100,
            current_hub=self.hub
        )
        self.slot = HubSlot.objects.create(
            hub=self.hub,
            slot_no=1,
            battery=self.ready_battery,
            state=HubSlot.State.READY
        )

        # Create vehicle
        self.v_model = VehicleModel.objects.create(make='TestMake', model='TestModel', battery_type=self.battery_type)
        self.vehicle = Vehicle.objects.create(
            account=self.account,
            vehicle_model=self.v_model,
            registration_plate='TEST-PLATE-01',
            current_battery=self.mounted_battery
        )

    def test_health_check(self):
        res = self.client.get('/healthz')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()['status'], 'ok')

    def test_money_and_vat_split(self):
        # ₦1,500 = 150,000 kobo. 7.5% VAT inclusive
        gross = 150000
        net, vat = split_vat(gross)
        self.assertEqual(net + vat, gross)
        self.assertEqual(format_naira(gross), '₦1,500.00')

    def test_double_entry_ledger_balanced(self):
        # Balanced transaction: debits == credits
        tx = LedgerService.post_transaction(
            kind=LedgerTransaction.Kind.FUNDING,
            reference='TX-TEST-001',
            description='Test funding',
            entries=[
                {'code': 'psp_clearing', 'type': 'CLEARING', 'debit': 500000, 'credit': 0},
                {'code': 'wallet:TEST', 'type': 'LIABILITY', 'debit': 0, 'credit': 500000},
            ]
        )
        self.assertIsNotNone(tx)
        clearing = LedgerAccount.objects.get(code='psp_clearing')
        self.assertEqual(clearing.balance_kobo, 500000)

    def test_double_entry_ledger_unbalanced_fails(self):
        # Unbalanced transaction must raise DomainError
        with self.assertRaises(DomainError):
            LedgerService.post_transaction(
                kind=LedgerTransaction.Kind.FUNDING,
                reference='TX-FAIL-001',
                description='Unbalanced',
                entries=[
                    {'code': 'psp_clearing', 'type': 'CLEARING', 'debit': 500000, 'credit': 0},
                    {'code': 'wallet:TEST', 'type': 'LIABILITY', 'debit': 0, 'credit': 400000},
                ]
            )

    def test_swap_completion_and_matching(self):
        # Correct return matching: returned battery == vehicle.current_battery
        swap = SwapService.complete_swap(
            hub_id=self.hub.id,
            vehicle_id=self.vehicle.id,
            driver_id=self.driver.id,
            account_id=self.account.id,
            returned_battery_serial='BAT-ORIGINAL-01',
            issued_battery_serial='BAT-READY-01',
            returned_charge_pct=10,
            issued_charge_pct=100,
            amount_kobo=0,
            payment_mode='CASH',
        )
        self.assertFalse(swap.mismatch_flag)
        self.vehicle.refresh_from_db()
        self.assertEqual(self.vehicle.current_battery.serial, 'BAT-READY-01')

    def test_swap_completion_detects_mismatch(self):
        # Create a rogue battery
        rogue = Battery.objects.create(
            serial='BAT-ROGUE-99',
            battery_type=self.battery_type,
            status=Battery.Status.ISSUED
        )
        # Attempt to return rogue battery instead of vehicle.current_battery
        swap = SwapService.complete_swap(
            hub_id=self.hub.id,
            vehicle_id=self.vehicle.id,
            driver_id=self.driver.id,
            account_id=self.account.id,
            returned_battery_serial='BAT-ROGUE-99',
            issued_battery_serial='BAT-READY-01',
            amount_kobo=0,
            payment_mode='CASH',
        )
        self.assertTrue(swap.mismatch_flag)
