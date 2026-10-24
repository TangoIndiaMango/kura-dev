/** Settle amounts for the bay — live wallet/plan inputs (no mock OTP). */
import { tariffFor, HUB_SWAP_DUE_NAIRA } from '../../shared/tariffs/vehicleTariffs'
import type { ReservationRecord } from '@shared/mock/adminMockData'

export { HUB_SWAP_DUE_NAIRA }

export type BaySettleMode = 'PLAN' | 'PAYSTACK' | 'WALLET' | 'CREDIT' | 'CASH_AT_HUB'

export type SettlePlan = {
  dueNaira: number
  walletBalance: number
  shortfallNaira: number
  allowed: BaySettleMode[]
  recommended: BaySettleMode
  cashCollect: boolean
  /** Unheld wallet debit needs rider PIN at confirm (matches BE assert_pin_grant). */
  riderPinRequired: boolean
  label: string
}

export type SettleActor = {
  walletBalanceNaira: number
  planCovers: boolean
  creditOk: boolean
}

export function settleModeLabel(mode: BaySettleMode) {
  if (mode === 'PLAN') return 'Plan allowance'
  if (mode === 'PAYSTACK') return 'Paystack (card / transfer / USSD)'
  if (mode === 'WALLET') return 'Operator wallet'
  if (mode === 'CREDIT') return 'Swap credit'
  return 'Cash at hub'
}

export function listSwapDueNaira(vehicleHint?: string | null) {
  return tariffFor(vehicleHint).payPerSwap
}

function resolveHoldKobo(
  reservation: ReservationRecord,
  opts?: { holdAmountKobo?: number },
): number {
  const fromOpts = opts?.holdAmountKobo
  if (typeof fromOpts === 'number' && Number.isFinite(fromOpts)) {
    return Math.max(0, Math.trunc(fromOpts))
  }
  const fromRow = (reservation as { holdAmountKobo?: number }).holdAmountKobo
  if (typeof fromRow === 'number' && Number.isFinite(fromRow)) {
    return Math.max(0, Math.trunc(fromRow))
  }
  return 0
}

export function buildSettlePlan(
  reservation: ReservationRecord,
  actor: SettleActor | undefined,
  opts?: {
    isWalkIn?: boolean
    overridden?: boolean
    dueNaira?: number
    vehicleType?: string | null
    holdAmountKobo?: number
  },
): SettlePlan {
  const due =
    opts?.dueNaira ??
    listSwapDueNaira(opts?.vehicleType ?? reservation.vehicleReg)
  const wallet = actor?.walletBalanceNaira ?? 0
  const isWalkIn = Boolean(opts?.isWalkIn || reservation.code === 'WALK-IN')
  const planCovers = Boolean(actor?.planCovers)
  const creditOk = Boolean(actor?.creditOk)
  const bookedWithWallet = !isWalkIn && reservation.paymentMode === 'WALLET'
  const holdKobo = resolveHoldKobo(reservation, opts)
  const holdNaira = holdKobo / 100
  const hasActiveHold = holdKobo > 0
  // available_kobo excludes holds; add hold back when capturing a prior booking hold
  const effectiveWallet = hasActiveHold ? wallet + holdNaira : wallet
  const shortfall = hasActiveHold ? 0 : Math.max(0, due - effectiveWallet)

  const allowed: BaySettleMode[] = []
  if (planCovers && reservation.paymentMode === 'PLAN' && !opts?.overridden) {
    allowed.push('PLAN')
  }
  if (creditOk || reservation.paymentMode === 'CREDIT') allowed.push('CREDIT')
  // Riders hold no balance: the wallet only settles a legacy booking-time hold.
  if (bookedWithWallet && hasActiveHold) allowed.push('WALLET')
  // A booking-time wallet hold is already the payment.
  if (!hasActiveHold) allowed.push('PAYSTACK')
  allowed.push('CASH_AT_HUB')

  let recommended: BaySettleMode = reservation.paymentMode
  if (isWalkIn) recommended = planCovers ? 'PLAN' : 'PAYSTACK'

  if (!allowed.includes(recommended)) {
    recommended = allowed.includes('WALLET') && hasActiveHold
      ? 'WALLET'
      : allowed.includes('PLAN')
        ? 'PLAN'
        : allowed.includes('PAYSTACK')
          ? 'PAYSTACK'
          : 'CASH_AT_HUB'
  }

  return describeMode(recommended, {
    due,
    wallet: effectiveWallet,
    shortfall,
    allowed,
    isWalkIn,
    reservation,
    holdAmountKobo: holdKobo,
  })
}

export function describeMode(
  mode: BaySettleMode,
  ctx: {
    due: number
    wallet: number
    shortfall: number
    allowed: BaySettleMode[]
    isWalkIn: boolean
    reservation: ReservationRecord
    holdAmountKobo?: number
  },
): SettlePlan {
  const { due, wallet, shortfall, allowed, isWalkIn } = ctx
  const holdKobo = Math.max(0, Math.trunc(ctx.holdAmountKobo ?? 0))
  if (mode === 'PLAN') {
    return {
      dueNaira: 0,
      walletBalance: wallet,
      shortfallNaira: 0,
      allowed,
      recommended: mode,
      cashCollect: false,
      riderPinRequired: false,
      label: isWalkIn ? 'Walk-in · plan allowance' : 'Plan covered',
    }
  }
  if (mode === 'PAYSTACK') {
    return {
      dueNaira: due,
      walletBalance: wallet,
      shortfallNaira: 0,
      allowed,
      recommended: mode,
      cashCollect: false,
      riderPinRequired: false,
      label: 'Rider pays with Paystack — complete once it is confirmed',
    }
  }
  if (mode === 'CREDIT') {
    return {
      dueNaira: due,
      walletBalance: wallet,
      shortfallNaira: 0,
      allowed,
      recommended: mode,
      cashCollect: false,
      riderPinRequired: false,
      label: 'Credit draws on complete',
    }
  }
  if (mode === 'WALLET') {
    // BE: pin_grant required when WALLET && fee > 0 && hold_amount_kobo <= 0
    const held = holdKobo > 0
    const shortfallForMode = held ? 0 : shortfall
    return {
      dueNaira: due,
      walletBalance: wallet,
      shortfallNaira: shortfallForMode,
      allowed,
      recommended: mode,
      cashCollect: false,
      riderPinRequired: !held,
      label: held
        ? 'Wallet held at booking'
        : wallet >= due
          ? 'Wallet debit on complete'
          : `Wallet short ₦${shortfall.toLocaleString()}. Top up or use cash.`,
    }
  }
  return {
    dueNaira: due,
    walletBalance: wallet,
    shortfallNaira: shortfall,
    allowed,
    recommended: 'CASH_AT_HUB',
    cashCollect: true,
    riderPinRequired: false,
    label: isWalkIn ? 'Walk-in · collect cash' : 'Collect cash on complete',
  }
}
