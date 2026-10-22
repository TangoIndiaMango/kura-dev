"""Run inside `manage.py shell` on a cloned DB: build the sweep fixture named
by $SWEEP_FIXTURE with fixed ids, so both clones start identical."""
import os
import uuid
from datetime import timedelta

from django.utils import timezone

NOW = timezone.now()
NS = uuid.UUID("5a5a5a5a-0000-7000-8000-000000000000")


def fid(name):
    return uuid.uuid5(NS, name)


def clone(obj, **changes):
    obj.pk = None
    obj.id = None
    for k, v in changes.items():
        setattr(obj, k, v)
    obj._state.adding = True
    obj.save(force_insert=True)
    return obj


def swaps():
    from mobility.models import Battery, Reservation, Swap
    used = Reservation.objects.filter(status="USED").order_by("created_at")
    r1 = used[0]
    bat = Battery.objects.filter(status="AVAILABLE").order_by("serial").first()
    bat.status = "RESERVED"
    bat.save(update_fields=["status"])
    exp = clone(Reservation.objects.get(pk=r1.pk), id=fid("res-expired"), code="CTEXP1", status="CONFIRMED",
                expires_at=NOW - timedelta(minutes=5), hold_amount_kobo=0, battery_id=bat.id, discount_code="")
    orphan = Battery.objects.filter(status="AVAILABLE").order_by("serial")[1]
    orphan.status = "RESERVED"
    orphan.save(update_fields=["status"])
    done = Swap.objects.filter(status="COMPLETED").order_by("created_at")
    base = done[0]
    clone(Swap.objects.get(pk=base.pk), id=fid("swap-hold-dead"), status="STARTED", reservation_id=exp.id,
          started_at=NOW - timedelta(minutes=10), completed_at=None, issued_battery_id=None,
          returned_battery_id=None, client_event_id=fid("ev-hold-dead"))
    clone(Swap.objects.get(pk=done[1].pk), id=fid("swap-stale"), status="RETURN_RECORDED", reservation_id=None,
          started_at=NOW - timedelta(hours=3), completed_at=None, issued_battery_id=None,
          client_event_id=fid("ev-stale"))
    clone(Swap.objects.get(pk=done[2].pk), id=fid("swap-fresh"), status="STARTED", reservation_id=None,
          started_at=NOW - timedelta(minutes=5), completed_at=None, issued_battery_id=None,
          returned_battery_id=None, client_event_id=fid("ev-fresh"))


def unreturned():
    from mobility.models import Battery
    issued = list(Battery.objects.filter(status="ISSUED").order_by("serial")[:3])
    issued[0].expected_return_by = NOW - timedelta(hours=1)
    issued[0].save(update_fields=["expected_return_by"])
    issued[1].expected_return_by = None
    issued[1].issued_at = NOW - timedelta(hours=60)
    issued[1].save(update_fields=["expected_return_by", "issued_at"])
    issued[2].expected_return_by = NOW + timedelta(hours=5)
    issued[2].save(update_fields=["expected_return_by"])


def shifts():
    from operations.models import Alert, CashDeposit, Shift
    base = Shift.objects.order_by("created_at").first()
    dep = CashDeposit.objects.filter(status="SUCCESS").order_by("created_at").first()
    open_old = clone(Shift.objects.get(pk=base.pk), id=fid("shift-open-old"), status="OPEN",
                     opened_at=NOW - timedelta(days=1, hours=2), closed_at=None, closing_cash_kobo=None,
                     expected_cash_kobo=None, variance_kobo=None, lodge_ref="", lodged_amount_kobo=None, lodged_at=None,
                     auto_closed=False, opening_cash_kobo=5_000)
    clone(CashDeposit.objects.get(pk=dep.pk), id=fid("dep-open-old"), shift_id=open_old.id, amount_kobo=120_000,
          receipt_code="CT-RC-1", idempotency_key="ct-dep-1", payment_id=None)
    clone(Shift.objects.get(pk=base.pk), id=fid("shift-open-today"), status="OPEN", opened_at=NOW - timedelta(minutes=3),
          closed_at=None, closing_cash_kobo=None, expected_cash_kobo=None, variance_kobo=None, lodged_at=None,
          lodge_ref="", auto_closed=False)
    stale = clone(Shift.objects.get(pk=base.pk), id=fid("shift-closed-stale"), status="CLOSED",
                  opened_at=NOW - timedelta(hours=20), closed_at=NOW - timedelta(hours=13), closing_cash_kobo=100_000,
                  expected_cash_kobo=80_000, variance_kobo=20_000, lodge_ref="", lodged_amount_kobo=None, lodged_at=None)
    clone(CashDeposit.objects.get(pk=dep.pk), id=fid("dep-stale"), shift_id=stale.id, amount_kobo=75_000,
          receipt_code="CT-RC-2", idempotency_key="ct-dep-2", payment_id=None)
    a = Alert.objects.create(hub=stale.hub, kind="SETTLEMENT_MISMATCH", severity="WARNING", status="OPEN",
                             message="ct-old: unlodged")
    Alert.objects.filter(pk=a.pk).update(created_at=NOW - timedelta(hours=30))


def subscriptions():
    from mobility.models import Plan, Subscription
    from mobility.services.plans.pricing import PricingService  # noqa: F401
    base = Subscription.objects.filter(status="ACTIVE").order_by("created_at").first()
    other_plan = Plan.objects.exclude(pk=base.plan_id).filter(status="ACTIVE").order_by("code").first() \
        if hasattr(Plan, "status") else Plan.objects.exclude(pk=base.plan_id).order_by("code").first()
    from mobility.models import Vehicle
    Subscription.objects.filter(pk=base.pk).update(ends_at=NOW - timedelta(hours=1))
    free = list(Vehicle.objects.filter(status="ACTIVE", vehicle_model__vehicle_type=base.vehicle.vehicle_model.vehicle_type)
                .exclude(subscriptions__status="ACTIVE").order_by("registration_plate")[:3])
    for v, (name, auto, ends, queued, extra) in zip(free, [
            ("sub-expire", False, NOW - timedelta(hours=2), None, {}),
            ("sub-queued", False, NOW - timedelta(hours=3), other_plan, {}),
            ("sub-warn", True, NOW + timedelta(hours=10), None, {"list_price_kobo": 1})]):
        clone(Subscription.objects.get(pk=base.pk), id=fid(name), status="ACTIVE", auto_renew=auto, ends_at=ends,
              queued_plan=queued, idempotency_key="ct-" + name, vehicle_id=v.id, account_id=v.account_id, **extra)


def pricing():
    from mobility.models import PriceMatrix
    base = PriceMatrix.objects.filter(status="ACTIVE").order_by("vehicle_type").first()
    clone(PriceMatrix.objects.get(pk=base.pk), id=fid("pm-due"), status="SCHEDULED",
          effective_from=timezone.localdate(), pay_per_swap_kobo=base.pay_per_swap_kobo + 5_000, approved_by=None)
    clone(PriceMatrix.objects.get(pk=base.pk), id=fid("pm-later"), status="SCHEDULED",
          effective_from=timezone.localdate() + timedelta(days=3), approved_by=None)


def credit():
    from accounts.models import Account
    from core.models import ConfigVersion
    from core.services.config import DEFAULTS, SETTINGS_KEY
    from credit.models import CreditApplication, CreditLine, Loan
    from finance.models import Wallet
    ConfigVersion.objects.create(namespace="credit", key=SETTINGS_KEY, status="ACTIVE", effective_from=NOW,
                                 value={**DEFAULTS["credit"], "enabled": True})
    accts = list(Account.objects.filter(status="ACTIVE", kind="INDIVIDUAL").order_by("kura_id")[:6])
    plan = [  # (name, status, balance, installment, total, repaid, grace_until)
        ("loan-ok", "ACTIVE", 50_000, 10_000, 100_000, 0, None),
        ("loan-broke", "ACTIVE", 0, 10_000, 100_000, 0, None),
        ("loan-grace-over", "GRACE", 0, 10_000, 100_000, 20_000, NOW - timedelta(hours=1)),
        ("loan-restricted-old", "RESTRICTED", 0, 10_000, 100_000, 20_000, NOW - timedelta(days=8)),
        ("loan-last", "GRACE", 90_000, 10_000, 100_000, 95_000, NOW + timedelta(days=1)),
        ("loan-grace-wait", "GRACE", 0, 10_000, 100_000, 0, NOW + timedelta(days=2)),
    ]
    for acct, (name, status, bal, inst, total, repaid, grace) in zip(accts, plan):
        w, _ = Wallet.objects.get_or_create(account=acct, defaults={"balance_kobo": 0})
        Wallet.objects.filter(pk=w.pk).update(balance_kobo=bal, hold_kobo=0, status="ACTIVE")
        line, _ = CreditLine.objects.get_or_create(account=acct, defaults={"limit_kobo": total, "status": "ACTIVE"})
        app = CreditApplication.objects.create(id=fid("app-" + name), account=acct, amount_kobo=total - 5_000,
                                               tenor_days=14, interest_rate_bps=500, disbursement="SWAP_CREDIT",
                                               status="APPROVED", decision_reason="", idempotency_key="ct-" + name,
                                               credit_line=line)
        Loan.objects.create(id=fid(name), account=acct, application=app, principal_kobo=total - 5_000,
                            interest_kobo=5_000, total_due_kobo=total, repaid_kobo=repaid, daily_installment_kobo=inst,
                            swap_credit_remaining_kobo=1_000, starts_at=NOW - timedelta(days=10),
                            due_at=NOW + timedelta(days=4), grace_until=grace, status=status)


def va():
    from finance.models import VirtualAccount
    VirtualAccount.objects.filter(status="PENDING").update(next_attempt_at=NOW - timedelta(minutes=1))


def mock_iot():
    pass


FIXTURES = {"va": va, "mock_iot": mock_iot, "credit": credit, "swaps": swaps, "unreturned": unreturned, "shifts": shifts, "subscriptions": subscriptions,
            "pricing": pricing}
FIXTURES[os.environ["SWEEP_FIXTURE"]]()
print("fixture-ok")
