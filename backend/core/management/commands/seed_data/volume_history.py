"""Bulk history: payments, swaps, VCU commands, alert rules, PSP events."""
from __future__ import annotations

from datetime import timedelta

from django.utils import timezone

from accounts.models import Account, Driver, User
from finance.models import Payment
from finance.services.wallets import WalletService
from integrations.models import PspWebhookEvent
from mobility.models import Hub, Swap, Vehicle, VehicleCommand
from operations.models import Alert, AlertRule


def _seed_payments(*, accounts: list[Account], hub: Hub | None) -> int:
    """Idempotent funding rows via WalletService (ledger-correct)."""
    created = 0
    purposes = ("FUND", "SWAP", "PLAN", "FUND", "SWAP")
    channels = (
        Payment.Channel.NUBAN_TRANSFER,
        Payment.Channel.WALLET_DEBIT,
        Payment.Channel.AGENT_CASH,
        Payment.Channel.CARD,
    )
    for ai, account in enumerate(accounts):
        for n in range(1, 13):
            ref = f"seed-pay-{account.kura_id}-{n:02d}"
            if Payment.objects.filter(psp_reference=ref).exists():
                continue
            amount = 25_000 + ((ai + n) % 9) * 15_000
            purpose = purposes[n % len(purposes)]
            if purpose == "FUND":
                WalletService.fund_wallet(
                    account=account,
                    amount_kobo=amount,
                    channel=channels[n % len(channels)],
                    psp_reference=ref,
                )
            else:
                Payment.objects.create(
                    account=account,
                    channel=channels[n % len(channels)],
                    amount_kobo=amount,
                    vat_kobo=int(amount * 0.075 / 1.075),
                    purpose=purpose,
                    status=Payment.Status.SUCCESS,
                    psp_reference=ref,
                    hub=hub if purpose == "SWAP" else None,
                )
            created += 1
    return created


def _seed_swaps(
    *,
    rows: list[tuple[Account, Driver, Vehicle]],
    hubs: list[Hub],
    agent: User | None,
) -> int:
    """Completed swap history — bulk insert, skip existing seed codes."""
    now = timezone.now()
    existing = set(
        Swap.objects.filter(client_event_id__startswith="seed-swap-").values_list(
            "client_event_id", flat=True
        )
    )
    to_create: list[Swap] = []
    for i, (account, driver, vehicle) in enumerate(rows):
        hub = hubs[i % max(len(hubs), 1)] if hubs else None
        if hub is None:
            break
        for n in range(1, 9):
            key = f"seed-swap-{vehicle.registration_plate}-{n:02d}"
            if key in existing:
                continue
            to_create.append(
                Swap(
                    account=account,
                    vehicle=vehicle,
                    driver=driver,
                    hub=hub,
                    agent=agent,
                    payment_mode="WALLET",
                    amount_kobo=45_000 + (n % 3) * 5_000,
                    status=Swap.Status.COMPLETED,
                    returned_charge_pct=12 + (n % 10),
                    issued_charge_pct=95,
                    started_at=now - timedelta(days=n, hours=(i % 5) + 1),
                    completed_at=now - timedelta(days=n, hours=i % 5),
                    client_event_id=key,
                )
            )
    if to_create:
        Swap.objects.bulk_create(to_create, batch_size=100)
    return len(to_create)


def _seed_vcu_commands(*, vehicles: list[Vehicle], actor: User) -> int:
    kinds = list(VehicleCommand.Kind.values)
    statuses = [
        VehicleCommand.Status.QUEUED,
        VehicleCommand.Status.SENT,
        VehicleCommand.Status.ACKED,
        VehicleCommand.Status.FAILED,
    ]
    created = 0
    for vehicle in vehicles:
        if not vehicle.iot_api_key_hash:
            continue
        for i, kind in enumerate(kinds):
            note = f"seed-{vehicle.registration_plate}-{kind}"
            if VehicleCommand.objects.filter(vehicle=vehicle, note=note).exists():
                continue
            st = statuses[i % len(statuses)]
            VehicleCommand.objects.create(
                vehicle=vehicle,
                kind=kind,
                status=st,
                requested_by=actor,
                note=note,
                error="timeout" if st == VehicleCommand.Status.FAILED else "",
                acked_at=timezone.now() if st == VehicleCommand.Status.ACKED else None,
            )
            created += 1
    return created


def _seed_alert_rules(*, actor: User) -> int:
    specs = (
        ("Low inventory Yaba", Alert.Kind.LOW_INVENTORY, AlertRule.Severity.WARNING, 5),
        ("Hub offline", Alert.Kind.HUB_OFFLINE, AlertRule.Severity.CRITICAL, 1),
        ("Cash limit", Alert.Kind.CASH_LIMIT, AlertRule.Severity.WARNING, 200_000),
        ("Payment failures", Alert.Kind.PAYMENT_FAILURE, AlertRule.Severity.WARNING, 3),
        ("Paused solar (demo)", Alert.Kind.SOLAR_FAULT, AlertRule.Severity.INFO, 1),
    )
    created = 0
    for name, kind, sev, value in specs:
        row, was = AlertRule.objects.get_or_create(
            name=name,
            kind=kind,
            defaults={
                "severity": sev,
                "threshold": {"value": value},
                "channels": ["IN_APP", "SMS"],
                "cooldown_minutes": 30,
                "status": (
                    AlertRule.Status.PAUSED
                    if "Paused" in name
                    else AlertRule.Status.ACTIVE
                ),
                "created_by": actor,
            },
        )
        if was:
            created += 1
    return created


def _seed_psp_events() -> int:
    kinds = ("charge.success", "transfer.success", "charge.failed", "refund.processed")
    statuses = list(PspWebhookEvent.Status.values)
    created = 0
    for i in range(1, 41):
        event_id = f"seed-evt-{i:03d}"
        psp = (
            PspWebhookEvent.Provider.PAYSTACK
            if i % 2
            else PspWebhookEvent.Provider.NOMBA
        )
        _, was = PspWebhookEvent.objects.get_or_create(
            psp=psp,
            psp_event_id=event_id,
            defaults={
                "event_kind": kinds[i % len(kinds)],
                "payload": {"seed": True, "n": i},
                "status": statuses[i % len(statuses)],
                "error": "signature" if i % 7 == 0 else "",
            },
        )
        if was:
            created += 1
    return created


def seed_volume_history(
    *,
    personas: dict,
    solo_account: Account,
    solo_driver: Driver,
    hubs: list[Hub],
    agent: User,
    admin: User,
) -> dict[str, int]:
    accounts: list[Account] = [solo_account, personas["fleet_vcu"]["account"], personas["fleet_novcu"]["account"]]
    accounts.extend(acct for acct, _ in personas["riders"])

    swap_rows: list[tuple[Account, Driver, Vehicle]] = []
    for vehicle in personas["fleet_vcu"]["vehicles"]:
        drv = personas["fleet_vcu"]["peers"][0]
        if vehicle.assigned_driver_id:
            drv = vehicle.assigned_driver
        swap_rows.append((personas["fleet_vcu"]["account"], drv, vehicle))
    for vehicle in personas["fleet_novcu"]["vehicles"]:
        swap_rows.append(
            (
                personas["fleet_novcu"]["account"],
                Driver.objects.filter(account=personas["fleet_novcu"]["account"]).first(),
                vehicle,
            )
        )
    for acct, drv in personas["riders"]:
        vehicle = Vehicle.objects.filter(account=acct).first()
        if vehicle and drv:
            swap_rows.append((acct, drv, vehicle))
    # drop any missing driver
    swap_rows = [(a, d, v) for a, d, v in swap_rows if d is not None]

    return {
        "payments": _seed_payments(accounts=accounts, hub=hubs[0] if hubs else None),
        "swaps": _seed_swaps(rows=swap_rows, hubs=hubs, agent=agent),
        "vcu_commands": _seed_vcu_commands(
            vehicles=personas["fleet_vcu"]["vehicles"], actor=admin
        ),
        "alert_rules": _seed_alert_rules(actor=admin),
        "psp_events": _seed_psp_events(),
    }
