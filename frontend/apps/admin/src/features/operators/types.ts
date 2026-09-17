/** Operator CRM — shapes match `/accounts/` CRM list & detail payloads. */

export type AccountStatus =
  | 'ACTIVE'
  | 'SUSPENDED'
  | 'PENDING'
  | 'DEREGISTERED'

export type KycStatus =
  | 'NONE'
  | 'PROVISIONAL'
  | 'PENDING'
  | 'PENDING_PSP'
  | 'VERIFIED'
  | 'REJECTED'

/** Backend account_standing / detail_stats.standing codes. */
export type AccountStandingCode =
  | 'HEALTHY'
  | 'AT_RISK'
  | 'BLOCKED'
  | string

/** List/detail row used by admin operators UI (Accounts-owned; money via Finance). */
export type OperatorRecord = {
  id: string
  kuraId: string
  name: string
  phone: string
  email: string
  kind: string
  status: AccountStatus | string
  kycStatus: KycStatus | string
  registrationChannel: string
  photoUrl?: string
  idType: string | null
  idLast4: string | null
  kycDocumentStatus: string | null
  verifiedVia: 'PSP' | 'PROVIDER' | 'MANUAL' | null
  registeredDate: string
  createdAt?: string
  vehicleReg: string | null
  vehicleCount?: number
  planName: string
  walletAvailableKobo?: number | null
  ownerUserId?: string
  driverIds?: string[]
  walletId?: string | null
  vehicleIds?: string[]
  cooperativeId?: string | null
  cooperativeName?: string | null
  discountId?: string
}

export const ACCOUNT_STATUS_LABEL: Record<string, string> = {
  ACTIVE: 'Active',
  SUSPENDED: 'Suspended',
  PENDING: 'Pending',
  DEREGISTERED: 'Deregistered',
}

export const KYC_STATUS_LABEL: Record<string, string> = {
  NONE: 'None',
  PROVISIONAL: 'Provisional',
  PENDING: 'Pending',
  PENDING_PSP: 'Pending PSP',
  VERIFIED: 'Verified',
  REJECTED: 'Rejected',
}

export const ACCOUNT_STANDING_LABEL: Record<string, string> = {
  HEALTHY: 'Healthy',
  AT_RISK: 'At risk',
  BLOCKED: 'Blocked',
}

export function accountStatusLabel(code: string): string {
  return ACCOUNT_STATUS_LABEL[code] ?? code
}

export function kycStatusLabel(code: string): string {
  return KYC_STATUS_LABEL[code] ?? code
}

export function accountStandingLabel(code: string): string {
  return ACCOUNT_STANDING_LABEL[code] ?? code
}

export function accountStatusTone(code: string) {
  if (code === 'ACTIVE') return 'success' as const
  if (code === 'SUSPENDED' || code === 'PENDING') return 'warning' as const
  if (code === 'DEREGISTERED') return 'danger' as const
  return 'neutral' as const
}

export function kycStatusTone(code: string) {
  if (code === 'VERIFIED') return 'success' as const
  if (code === 'REJECTED') return 'danger' as const
  if (code === 'PENDING' || code === 'PENDING_PSP' || code === 'PROVISIONAL') {
    return 'warning' as const
  }
  return 'neutral' as const
}

export type DailyMetricPoint = {
  date: string
  label: string
  swaps: number
  energy_kwh: number
  target: number
}

export type SocSlice = {
  name: string
  value: number
  color: string
}

export type AccountDetailStats = {
  status: string
  kyc_status: string
  drivers_count: number
  vehicles_count: number
  identity_docs_count: number
  swaps_count: number
  swaps_per_day: number
  energy_kwh_total: number
  fuel_saved_kobo: number
  avg_returned_soc: number
  soc_distribution?: SocSlice[]
  daily_metrics: DailyMetricPoint[]
  start_date?: string
  end_date?: string
}

