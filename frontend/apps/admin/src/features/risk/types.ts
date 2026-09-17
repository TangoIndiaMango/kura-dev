export type CursorPaginated<T> = {
  results: T[]
  next: string | null
  previous: string | null
}

export type RiskEventListApi = {
  id: string
  account_id: string | null
  account_kura_id: string | null
  account_display_name: string | null
  rule_code: string
  rule_name: string
  subject_type: string
  subject_id: string
  severity: string
  score: number
  action_taken: string
  status: string
  created_at: string
}

export type RiskEventDetailApi = RiskEventListApi & {
  context: Record<string, unknown>
  review_note: string
  reviewed_by_id: string | null
  updated_at: string
  active_velocity_grant?: {
    id: string
    expires_at: string
    uses_remaining: number
    max_uses: number
    status: string
  } | null
}

export type FlagRiskPayload = {
  account_id: string
  rule_code?: string
  severity?: string
  note?: string
}

export type ReviewRiskPayload = {
  status: string
  note?: string
  allow_swap?: boolean | null
  ttl_hours?: number | null
  max_uses?: number | null
}

export type RiskEventStats = {
  queue: {
    open: number
    escalated: number
    high_severity: number
    critical: number
  }
  period: {
    opened: number
    reviewed: number
    by_rule: Array<{ rule: string; count: number }>
  }
  totals: {
    all: number
    open: number
    reviewed: number
  }
  by_severity: Array<{ severity: string; count: number }>
}
