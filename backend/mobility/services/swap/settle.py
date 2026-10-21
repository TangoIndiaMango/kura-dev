"""Swap payment settlement helpers — keep SwapService lean."""
from __future__ import annotations

import uuid
from dataclasses import dataclass

from accounts.models import Account
from core.exceptions import DomainError
from finance.services import WalletHoldService
from mobility.models import Hub, Reservation, Subscription, Vehicle


@dataclass(frozen=True, slots=True)
class SettleResult:
    payment: object | None = None
    subscription: Subscription | None = None


def settle_swap_payment(
    *,
    mode: str,
    fee: int,
    reservation: Reservation | None,
    account_id,
    vehicle: Vehicle,
    hub: Hub | None = None,
    agent=None,
    swap_key: str = "",
) -> SettleResult:
    if mode == Reservation.PaymentMode.PLAN:
        sub = _consume_plan_allowance(vehicle=vehicle)
        return SettleResult(subscription=sub)

    if fee <= 0:
        return SettleResult()

    if (
        reservation
        and reservation.hold_amount_kobo > 0
        and mode != Reservation.PaymentMode.WALLET
    ):
        WalletHoldService.release(
            account=reservation.account,
            amount_kobo=reservation.hold_amount_kobo,
            reference=reservation.code,
        )

    if mode == Reservation.PaymentMode.WALLET:
        if reservation and reservation.hold_amount_kobo > 0:
            payment = WalletHoldService.capture(
                account=reservation.account,
                amount_kobo=reservation.hold_amount_kobo,
                reference=reservation.code,
                purpose="SWAP",
                hub=hub,
            )
            return SettleResult(payment=payment)
        account = Account.objects.get(pk=account_id)
        ref = f"WALKIN-{uuid.uuid4().hex[:16]}"
        WalletHoldService.hold(account=account, amount_kobo=fee, reference=ref)
        payment = WalletHoldService.capture(
            account=account,
            amount_kobo=fee,
            reference=ref,
            purpose="SWAP",
            hub=hub,
        )
        return SettleResult(payment=payment)

    if mode == Reservation.PaymentMode.CASH:
        if agent is None or hub is None:
            raise DomainError(
                "SHIFT_REQUIRED",
                "Cash settlement requires a hub agent.",
                http=409,
            )
        from operations.services.cash.deposits import CashDepositService

        account = Account.objects.get(pk=account_id)
        # One deposit per swap: a fleet account can pay cash for several
        # vehicles at the same bay, agent and price.
        if swap_key:
            idem = f"swap-cash:{swap_key}"
        elif reservation is not None:
            idem = f"swap-cash:{reservation.id}:{fee}"
        else:
            idem = f"walkin-cash:{uuid.uuid4().hex}"
        deposit = CashDepositService.record(
            agent=agent,
            hub=hub,
            account=account,
            amount_kobo=fee,
            actor=agent,
            purpose="SWAP",
            idempotency_key=idem[:64],
        )
        payment = getattr(deposit, "payment", None)
        return SettleResult(payment=payment)

    if mode == Reservation.PaymentMode.CREDIT:
        from credit.services.consume import consume_swap_credit

        account = Account.objects.get(pk=account_id)
        ref = (
            reservation.code
            if reservation is not None
            else f"WALKIN-CREDIT-{uuid.uuid4().hex[:12]}"
        )
        payment = consume_swap_credit(
            account=account,
            amount_kobo=fee,
            reference=ref,
            hub=hub,
        )
        return SettleResult(payment=payment)

    raise DomainError(
        "PAYMENT_MODE_UNSUPPORTED",
        f"Unsupported payment mode {mode}.",
        http=400,
    )

def _consume_plan_allowance(*, vehicle: Vehicle) -> Subscription:
    from mobility.services.plans.entitlements import assert_plan_covers_swap

    sub = assert_plan_covers_swap(vehicle=vehicle)
    sub.swaps_used += 1
    sub.save(update_fields=["swaps_used", "updated_at"])
    return sub
