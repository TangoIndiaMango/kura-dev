"""Smoke tests for Path B engines, impact metrics, and telemetry field contracts."""
from __future__ import annotations

from datetime import date, datetime, timezone
from decimal import Decimal

from django.db import IntegrityError
from django.test import TestCase

from accounts.capabilities import all_permission_codes
from accounts.models import Account, User
from analytics.models import (
    DailyAccountMetric,
    DailyHubMetric,
    ImpactStory,
    MonthlyImpactMetric,
    ReportJob,
)
from mobility.models import (
    DEFAULT_SAFETY_CHECKLIST,
    BatteryType,
    Hub,
    PetrolEngine,
    Retrofit,
    TelemetryEvent,
    Vehicle,
    VehicleModel,
)


class EngineRetrofitModelTests(TestCase):
    def setUp(self):
        self.agent = User.objects.create(phone="+2348011100001", role=User.Role.HUB_AGENT)
        self.witness = User.objects.create(
            phone="+2348011100002", role=User.Role.HUB_AGENT
        )
        self.owner = User.objects.create(phone="+2348011100003", role=User.Role.DRIVER)
        self.account = Account.objects.create(
            owner_user=self.owner,
            display_name="Path B Op",
            kura_id="KR-ENG1",
        )
        self.hub = Hub.objects.create(
            code="HUB-ENG-01", name="Engine Yard", address="Yard Rd"
        )
        btype = BatteryType.objects.create(name="Eng Pack", manufacturer="KURA")
        model = VehicleModel.objects.create(
            make="Silversun", model="Boat15", battery_type=btype
        )
        self.vehicle = Vehicle.objects.create(
            account=self.account,
            vehicle_model=model,
            registration_plate="ENG-001-HL",
            acquisition_path=Vehicle.AcquisitionPath.ENGINE_SWAP,
        )

    def test_petrol_engine_raw_and_status(self):
        engine = PetrolEngine.objects.create(
            account=self.account,
            tag="PE-TAG-001",
            make="Yamaha",
            model="15HP",
            hp="15",
            condition_grade=PetrolEngine.ConditionGrade.FAIR,
            intake_photos=["cld_intake_1"],
            intake_agent=self.agent,
            intake_witness=self.witness,
            storage_hub=self.hub,
            intake_signature="cld_sig_1",
            raw={"oem_serial": "YMH-99", "notes": "oil seep"},
        )
        self.vehicle.petrol_engine = engine
        self.vehicle.save(update_fields=["petrol_engine"])
        engine.refresh_from_db()
        self.assertEqual(engine.status, PetrolEngine.Status.STORED)
        self.assertEqual(engine.raw["oem_serial"], "YMH-99")
        self.assertEqual(engine.vehicle.id, self.vehicle.id)

    def test_tag_unique(self):
        PetrolEngine.objects.create(account=self.account, tag="PE-DUP")
        with self.assertRaises(IntegrityError):
            PetrolEngine.objects.create(account=self.account, tag="PE-DUP")

    def test_retrofit_checklist_defaults_and_pass(self):
        engine = PetrolEngine.objects.create(account=self.account, tag="PE-RETRO")
        retrofit = Retrofit.objects.create(
            account=self.account,
            vehicle=self.vehicle,
            petrol_engine=engine,
            eboarder_serial="EB-100",
            agent=self.agent,
            photos=["cld_hull"],
            raw={"failure_reason": ""},
        )
        self.assertFalse(retrofit.checklist_all_passed())
        retrofit.checklist = {**DEFAULT_SAFETY_CHECKLIST, **{k: True for k in DEFAULT_SAFETY_CHECKLIST}}
        retrofit.save(update_fields=["checklist"])
        self.assertTrue(retrofit.checklist_all_passed())
        self.assertEqual(set(retrofit.checklist.keys()), set(DEFAULT_SAFETY_CHECKLIST))


class ImpactTelemetryModelTests(TestCase):
    def setUp(self):
        self.owner = User.objects.create(phone="+2348022200001", role=User.Role.DRIVER)
        self.account = Account.objects.create(
            owner_user=self.owner,
            display_name="Impact Op",
            kura_id="KR-IMP1",
        )
        self.hub = Hub.objects.create(
            code="HUB-IMP-01", name="Impact Hub", address="Impact Rd"
        )
        btype = BatteryType.objects.create(name="Imp Pack", manufacturer="KURA")
        model = VehicleModel.objects.create(
            make="Amp", model="M1", battery_type=btype
        )
        self.vehicle = Vehicle.objects.create(
            account=self.account,
            vehicle_model=model,
            registration_plate="IMP-001-XY",
        )

    def test_daily_account_metric_inputs_json(self):
        row = DailyAccountMetric.objects.create(
            account=self.account,
            date=date(2026, 9, 1),
            swaps_completed=3,
            fuel_savings_kobo=450000,
            co2_kg_est=Decimal("12.500"),
            petrol_litres_avoided_est=Decimal("4.200"),
            inputs={"naira_per_litre": 1100, "g_co2_per_litre": 2310},
        )
        self.assertEqual(row.inputs["naira_per_litre"], 1100)
        with self.assertRaises(IntegrityError):
            DailyAccountMetric.objects.create(
                account=self.account,
                date=date(2026, 9, 1),
            )

    def test_monthly_impact_and_hub_metric(self):
        MonthlyImpactMetric.objects.create(
            period="2026-09",
            operators_served=40,
            swaps=1200,
            fuel_savings_kobo=90_000_000,
            engines_replaced=5,
            co2_kg=Decimal("1800.000"),
            inputs={"disclaimer": "estimate"},
        )
        DailyHubMetric.objects.create(
            hub=self.hub,
            date=date(2026, 9, 1),
            swaps=12,
            revenue_kobo_by_channel={"WALLET": 100000},
            inputs={"source": "rollup_job"},
        )
        ImpactStory.objects.create(title="Lagos delta", region="Lagos")
        ReportJob.objects.create(
            kind=ReportJob.Kind.IMPACT_PDF,
            params={"period": "2026-09"},
            requested_by=self.owner,
        )

    def test_telemetry_raw_json(self):
        evt = TelemetryEvent.objects.create(
            vehicle=self.vehicle,
            recorded_at=datetime(2026, 9, 1, 12, 0, tzinfo=timezone.utc),
            battery_pct=72,
            lat=6.45,
            lng=3.39,
            speed_kmh=18.5,
            odometer_km=1024.0,
            source=TelemetryEvent.Source.MANUAL,
            ingest_batch="batch-1",
            raw={"provider": "manual_hub", "rssi": -70},
        )
        self.assertEqual(evt.raw["provider"], "manual_hub")
        self.assertEqual(evt.source, TelemetryEvent.Source.MANUAL)


class EngineCapabilityCatalogTests(TestCase):
    def test_caps_registered(self):
        codes = set(all_permission_codes())
        for code in (
            "engines:manage",
            "engines:release",
            "telemetry:read",
            "telemetry:ingest",
            "analytics:impact",
            "impact:manage",
        ):
            self.assertIn(code, codes)
