/** Settle amounts for the bay — live wallet/plan inputs (no mock OTP). */
import { tariffFor, HUB_SWAP_DUE_NAIRA } from '../../shared/tariffs/vehicleTariffs'
import type { ReservationRecord } from '@shared/mock/adminMockData'

export { HUB_SWAP_DUE_NAIRA }

export type BaySettleMode = 'PLAN' | 'WALLET' | 'CREDIT' | 'CASH_AT_HUB'

export type SettlePlan = {
  dueNaira: number
  walletBalance: number
  shortfallNaira: number
  allowed: BaySettleMode[]
  recommended: BaySettleMode
  cashCollect: boolean
  /** Walk-in / unheld wallet debit needs rider PIN at confirm (PRD F4). */
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
  if (mode === 'WALLET') return 'Operator wallet'
  if (mode === 'CREDIT') return 'Swap credit'
  return 'Cash at hub'
}

export function listSwapDueNaira(vehicleHint?: string | null) {
  return tariffFor(vehicleHint).payPerSwap
}

export function buildSettlePlan(
  reservation: ReservationRecord,
  actor: SettleActor | undefined,
  opts?: {
    isWalkIn?: boolean
    overridden?: boolean
    dueNaira?: number
    vehicleType?: string | null
  },
): SettlePlan {
  const due =
    opts?.dueNaira ??
    listSwapDueNaira(opts?.vehicleType ?? reservation.vehicleReg)
  const wallet = actor?.walletBalanceNaira ?? 0
  const shortfall = Math.max(0, due - wallet)
  const isWalkIn = Boolean(opts?.isWalkIn || reservation.code === 'WALK-IN')
  const planCovers = Boolean(actor?.planCovers)
  const creditOk = Boolean(actor?.creditOk)

  const allowed: BaySettleMode[] = []
  if (planCovers && reservation.paymentMode === 'PLAN' && !opts?.overridden) {
    allowed.push('PLAN')
  }
  if (creditOk || reservation.paymentMode === 'CREDIT') allowed.push('CREDIT')
  if (wallet >= due || reservation.paymentMode === 'WALLET') allowed.push('WALLET')
  allowed.push('CASH_AT_HUB')

  let recommended: BaySettleMode = reservation.paymentMode
  if (isWalkIn) {
    if (planCovers) recommended = 'PLAN'
    else if (wallet >= due) recommended = 'WALLET'
    else if (creditOk) recommended = 'CREDIT'
    else recommended = 'CASH_AT_HUB'
  }

  if (!allowed.includes(recommended)) {
    recommended = allowed.includes('WALLET')
      ? 'WALLET'
      : allowed.includes('PLAN')
        ? 'PLAN'
        : 'CASH_AT_HUB'
  }

  return describeMode(recommended, {
    due,
    wallet,
    shortfall,
    allowed,
    isWalkIn,
    reservation,
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
  },
): SettlePlan {
  const { due, wallet, shortfall, allowed, isWalkIn, reservation } = ctx
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
    const booked = !isWalkIn && reservation.paymentMode === 'WALLET'
    return {
      dueNaira: due,
      walletBalance: wallet,
      shortfallNaira: shortfall,
      allowed,
      recommended: mode,
      cashCollect: false,
      riderPinRequired: !booked,
      label: booked
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
