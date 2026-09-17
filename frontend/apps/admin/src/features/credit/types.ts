export type CursorPaginated<T> = {
  results: T[]
  next: string | null
  previous: string | null
}

export type CreditScoreApi = {
  id: string
  account_id: string
  score: number
  recommended_limit_kobo: number
  computed_by: 'SYSTEM' | 'MANUAL' | string
  computed_at: string
  override_reason: string
}

export type CreditScoreStatus = 'ELIGIBLE' | 'BELOW_THRESHOLD' | 'OVERRIDE'

export type CreditScoreRow = {
  id: string
  accountId: string
  score: number
  limitKobo: number
  computedBy: string
  computedAt: string
  overrideReason: string
  status: CreditScoreStatus
  eligible: boolean
}

export type CreditApplicationApi = {
  id: string
  amount_kobo: number
  tenor_days: number
  status: string
  disbursement: string
  created_at: string
}

export type LoanApi = {
  id: string
  status: string
  principal_kobo: number
  interest_kobo: number
  total_due_kobo: number
  repaid_kobo: number
  remaining_due_kobo: number
  daily_installment_kobo: number
  swap_credit_remaining_kobo: number
  starts_at: string
  due_at: string
  grace_until: string | null
  application_id: string
  account_id: string
}

export type OverrideScorePayload = {
  account_id: string
  score: number
  recommended_limit_kobo: number
  reason: string
}

export type ApplicationDecisionPayload = {
  id: string
  reason?: string
}

export type CreditSettingsDraft = {
  score_threshold: number
  min_active_days: number
  min_on_time_pct: number
  min_trusted_device_days: number
  min_amount_kobo: number
  max_amount_kobo: number
  tenor_days: number[]
  interest_rate_bps: number
  auto_approve_max_kobo: number
  enabled: boolean
}
