export type CursorPaginated<T> = {
  results: T[]
  next: string | null
  previous: string | null
}

export type AlertListApi = {
  id: string
  kind: string
  severity: string
  status: string
  message: string
  hub_id: string | null
  hub_code: string | null
  hub_name: string | null
  delivery_channel: string
  is_resolved: boolean
  created_at: string
  acknowledged_at: string | null
  resolved_at: string | null
}

export type AlertDetailApi = AlertListApi & {
  resolve_note: string
  acknowledged_by_id: string | null
  resolved_by_id: string | null
  updated_at: string
}

export type AlertStats = {
  queue: {
    open: number
    acknowledged: number
    escalated: number
    critical_open: number
    active: number
  }
  period: {
    opened: number
    resolved: number
    by_severity: Array<{ severity: string; count: number }>
    by_day: Array<{ label: string; count: number }>
  }
  totals: {
    all: number
    resolved: number
  }
}

export type AlertNotePayload = {
  note?: string
  idempotency_key?: string
}
