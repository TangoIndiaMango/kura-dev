"""Catalogue range estimate from SoC × Wh / Wh-per-km."""
from __future__ import annotations

from django.test import SimpleTestCase

from mobility.models import Battery, BatteryType
from mobility.services.range_estimate import estimate_range_km


class RangeEstimateTests(SimpleTestCase):
    def test_full_soc_range(self):
        btype = BatteryType(
            name="T",
            usable_energy_wh=2900,
            wh_per_km=50,
        )
        bat = Battery(charge_pct=100, health_pct=100, battery_type=btype)
        self.assertEqual(estimate_range_km(battery=bat), 58)

    def test_half_soc(self):
        btype = BatteryType(usable_energy_wh=2900, wh_per_km=50)
        bat = Battery(charge_pct=50, health_pct=100, battery_type=btype)
        self.assertEqual(estimate_range_km(battery=bat), 29)

    def test_missing_catalogue(self):
        btype = BatteryType(usable_energy_wh=0, wh_per_km=0)
        bat = Battery(charge_pct=80, health_pct=100, battery_type=btype)
        self.assertIsNone(estimate_range_km(battery=bat))
