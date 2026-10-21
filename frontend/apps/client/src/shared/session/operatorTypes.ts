import type { TabId } from '../../features/layout/FloatingGlassBottomBar'

export interface OperatorVehicle {
  id: string
  name: string
  short: string
  reg: string
  battery: string
  plan: string
  socPercent: number | null
  rangeKm: number | null
  chargeObservedAt?: string | null
  chargeSource?: string | null
}

export type BookingPaymentMode = 'PLAN' | 'WALLET' | 'CREDIT' | 'CASH_AT_HUB'

export interface OperatorActiveReservation {
  id: string
  code: string
  hubId: string
  hubName: string
  vehicleId: string
  vehicleLabel: string
  expiresAt: number
  createdAt: number
  paymentMode: BookingPaymentMode
  qr?: string
  discountCode?: string
  dueNaira?: number
}

export interface OperatorCreditSchedule {
  principalNaira: number
  tenorDays: number
  dailyDebitNaira: number
  startedAt: number
  nextDueLabel: string
}

export interface OperatorHomePlan {
  id: string
  vehicleId?: string
  vehicle: string
  planOptionId?: string
  subtitle: string
  status: 'Active' | 'Expiring' | 'Expired'
  daysLeft: number
  progress: number
  progressLabel: string
  expiresLabel: string
  renewHint: string
  autoRenew: boolean
}

export interface OperatorActivityItem {
  id: string
  title: string
  meta: string
  amountLabel: string
  tone: 'neutral' | 'credit' | 'debit'
  receiptId?: string
}

export interface OperatorNotification {
  id: string
  title: string
  body: string
  time: string
  unread: boolean
  action?: 'upload-id-photos' | 'apply-update' | null
}

export type OtpChannelPreference = 'email' | 'sms'

export interface OperatorAccountSettings {
  otpChannel: OtpChannelPreference
  smsAfterSwap: boolean
  paymentReceiptAlerts: boolean
  planExpiryReminders: boolean
  loanUpdates: boolean
  language: 'en' | 'ha' | 'yo' | 'ig' | 'pcm'
}

export const DEFAULT_OPERATOR_SETTINGS: OperatorAccountSettings = {
  otpChannel: 'sms',
  smsAfterSwap: true,
  paymentReceiptAlerts: true,
  planExpiryReminders: true,
  loanUpdates: true,
  language: 'en',
}

/** Alert toggles stored server-side (`notification_prefs` on `/auth/me/`). */
export const SERVER_ALERT_SETTING_KEYS = {
  smsAfterSwap: 'swap_sms',
  paymentReceiptAlerts: 'payment_alerts',
  planExpiryReminders: 'plan_expiry',
  loanUpdates: 'loan_updates',
} as const

export type ServerAlertSettingKey = keyof typeof SERVER_ALERT_SETTING_KEYS

/** Auth-derived rider profile + local prefs. Server domains use TanStack Query. */
export interface OperatorProfile {
  phone: string
  name: string
  initials: string
  kuraId: string
  verifiedLabel: string
  kycStatus: 'NONE' | 'PROVISIONAL' | 'PENDING' | 'VERIFIED' | 'REJECTED'
  /** Account.status from /auth/me — anything but ACTIVE blocks reservations server-side. */
  accountStatus?: string
  kycVia?: 'PSP' | 'PROVIDER' | 'MANUAL' | null
  idType?: 'NIN' | 'BVN' | 'VOTER' | 'DRIVERS_LICENCE' | null
  idLast4?: string | null
  idFrontAttached: boolean
  idBackAttached: boolean
  idFrontUrl: string | null
  idBackUrl: string | null
  profilePhotoUrl: string | null
  kycPhotosRequested: boolean
  kycRequestNote?: string | null
  hasPin: boolean
  email: string | null
  emailVerified: boolean
  settings: OperatorAccountSettings
}

/** @deprecated Use OperatorProfile — kept for gradual rename in account UI. */
export type OperatorSession = OperatorProfile

export interface NextAction {
  id: 'vehicle' | 'swap' | 'fund' | 'pin'
  title: string
  tab: TabId
}

export const SWAP_PRICE_NAIRA = 450
export const CREDIT_SCORE_THRESHOLD = 60

export function creditScoreEligible(score: number) {
  return score >= CREDIT_SCORE_THRESHOLD
}

export function creditScoreGaugeColor(score: number) {
  const s = Math.max(0, Math.min(100, score))
  if (s >= CREDIT_SCORE_THRESHOLD) return '#2FBECF'
  if (s >= 40) return '#F5A623'
  return '#E74C3C'
}

export type CreditUiState =
  | 'blocked_kyc'
  | 'building'
  | 'eligible'
  | 'drawn'

export function resolveCreditUiState(input: {
  score: number
  kycVerified: boolean
  loanActive: boolean
}): CreditUiState {
  if (input.loanActive) return 'drawn'
  if (!input.kycVerified) return 'blocked_kyc'
  if (creditScoreEligible(input.score)) return 'eligible'
  return 'building'
}

export function creditUiPresentation(
  state: CreditUiState,
  opts: {
    score: number
    limitNaira: number
    principalNaira?: number
    dailyDebitNaira?: number
  },
) {
  const limit = opts.limitNaira || 50000
  const gaugeColor = creditScoreGaugeColor(opts.score)
  switch (state) {
    case 'drawn':
      return {
        chip: 'Repaying',
        chipColor: '#F5A623',
        gaugeColor,
        blurb:
          opts.principalNaira != null && opts.dailyDebitNaira != null
            ? `₦${opts.principalNaira.toLocaleString()} left · ₦${opts.dailyDebitNaira.toLocaleString()}/day from wallet`
            : `Already drawn · repay from wallet`,
        cta: 'View repayment',
        walletIntent: 'schedule' as const,
        heroCreditLabel: 'View repayment',
      }
    case 'eligible':
      return {
        chip: 'Eligible',
        chipColor: gaugeColor,
        gaugeColor,
        blurb: `Eligible to apply · up to ₦${limit.toLocaleString()}`,
        cta: 'Apply for credit',
        walletIntent: 'credit' as const,
        heroCreditLabel: 'Apply for credit',
      }
    case 'blocked_kyc':
      return {
        chip: opts.score >= CREDIT_SCORE_THRESHOLD ? 'Verify ID' : 'Building',
        chipColor: gaugeColor,
        gaugeColor,
        blurb: `Need ${CREDIT_SCORE_THRESHOLD}+ and a verified ID`,
        cta: 'See eligibility',
        walletIntent: 'eligibility' as const,
        heroCreditLabel: 'See eligibility',
      }
    case 'building':
    default:
      return {
        chip: opts.score >= 40 ? 'Building' : 'Low',
        chipColor: gaugeColor,
        gaugeColor,
        blurb: `Need ${CREDIT_SCORE_THRESHOLD}+ to unlock swap credit`,
        cta: 'See eligibility',
        walletIntent: 'eligibility' as const,
        heroCreditLabel: 'See eligibility',
      }
  }
}

export function planCycleDays(planOptionId?: string, fallbackDays = 30) {
  switch (planOptionId) {
    case 'daily':
      return 1
    case 'weekly':
      return 7
    case 'monthly':
      return 30
    case 'pps':
      return 0
    default:
      return Math.max(1, fallbackDays)
  }
}

export function planRemainingProgress(daysLeft: number, planOptionId?: string) {
  const cycle = planCycleDays(planOptionId, Math.max(daysLeft, 1))
  if (cycle <= 0 || daysLeft <= 0) return 0
  return Math.min(1, daysLeft / cycle)
}

export function planDaysLeftLabel(daysLeft: number) {
  if (daysLeft <= 0) return 'Expires today'
  if (daysLeft === 1) return '1 day left'
  return `${daysLeft} days left`
}

export function planExpiresInLabel(daysLeft: number) {
  if (daysLeft <= 0) return 'Expires today'
  if (daysLeft === 1) return 'Expires in 1 day'
  return `Expires in ${daysLeft} days`
}

export function planStatusFromDays(
  daysLeft: number,
): OperatorHomePlan['status'] {
  if (daysLeft <= 0) return 'Expired'
  if (daysLeft <= 3) return 'Expiring'
  return 'Active'
}

export function vehicleCoveredByPlan(plan: string) {
  const p = plan.trim().toLowerCase()
  if (!p || p === 'none' || p === 'pay-per-swap' || p === 'pay per swap') {
    return false
  }
  return true
}

export function deriveNextAction(input: {
  vehicleCount: number
  hasPin: boolean
  hasCompletedFirstSwap: boolean
  anyPlanCovered: boolean
  walletBalanceNaira: number
}): NextAction | null {
  if (input.vehicleCount === 0) {
    return { id: 'vehicle', title: 'Add a vehicle', tab: 'swap' }
  }
  if (!input.hasPin) {
    return { id: 'pin', title: 'Set your PIN', tab: 'account' }
  }
  if (
    !input.hasCompletedFirstSwap &&
    !input.anyPlanCovered &&
    input.walletBalanceNaira < SWAP_PRICE_NAIRA
  ) {
    return { id: 'fund', title: 'Fund wallet to swap', tab: 'wallet' }
  }
  if (!input.hasCompletedFirstSwap) {
    return { id: 'swap', title: 'Book your first swap', tab: 'swap' }
  }
  return null
}

export function liveReservations(
  reservations: OperatorActiveReservation[] | undefined | null,
  now?: number,
) {
  const at = now ?? Date.now()
  return (reservations ?? []).filter((r) => r.expiresAt > at)
}

export function initialsFromName(name: string, fallback = 'KR') {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return fallback
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
}
