export type CursorPaginated<T> = {
  results: T[]
  next: string | null
  previous: string | null
}

export type SupportCaseListApi = {
  id: string
  code: string
  account_id: string
  account_kura_id: string
  account_display_name: string
  kind: string
  priority: string
  status: string
  subject: string
  assigned_to_id: string | null
  assigned_to_name: string | null
  payment_id?: string | null
  sla_due_at: string | null
  created_at: string
}

export type CaseEventApi = {
  id: string
  kind: string
  body: string
  actor_id: string | null
  actor_name: string | null
  attachment_id?: string | null
  attachment_url?: string | null
  attachment_name?: string | null
  attachment_content_type?: string | null
  created_at: string
}

export type SupportCaseDetailApi = SupportCaseListApi & {
  driver_id: string | null
  opened_by_id: string | null
  updated_at: string
  events: CaseEventApi[]
}

export type OpenCasePayload = {
  account_id: string
  subject: string
  kind?: string
  priority?: string
  body?: string
  driver_id?: string | null
  assigned_to_id?: string | null
  attachment_asset_id?: string | null
  payment_id?: string | null
}

export type SupportCaseStats = {
  queue: {
    open: number
    pending: number
    unassigned: number
    high_priority: number
    sla_at_risk: number
    sla_breached: number
    disputes: number
  }
  period: {
    opened: number
    resolved: number
    by_kind: Array<{ kind: string; count: number }>
  }
  totals: {
    all: number
    active: number
    closed: number
  }
}
