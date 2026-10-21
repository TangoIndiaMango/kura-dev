export type PageNumberPaginated<T> = {
  count: number
  page_size: number
  current_page: number
  total_pages: number
  next: string | null
  previous: string | null
  results: T[]
}

export type HubStatus = 'ONLINE' | 'OFFLINE' | 'MAINTENANCE' | 'CLOSED'

export type HubListApi = {
  id: string
  code: string
  name: string
  address: string
  status: HubStatus
  slot_count: number
  solar_capacity_kw: string
  ready_count: number
  charging_count: number
  empty_count: number
  fault_count: number
  created_at: string
}

/** Day → list of [open, close] pairs; empty object = open whenever ONLINE. */
export type HubOperatingHours = Partial<
  Record<'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun', [string, string][]>
>

export type HubDetailApi = HubListApi & {
  lat: number
  lng: number
  timezone?: string
  operating_hours?: HubOperatingHours
  last_sync_at?: string | null
  /** Pack types physically at the hub now. */
  battery_types?: string[]
  updated_at: string
}

export type HubSlotApi = {
  id: string
  slot_no: number
  state: 'EMPTY' | 'CHARGING' | 'READY' | 'FAULT'
  battery_id: string | null
  battery_serial: string | null
  battery_charge_pct: number | null
}

export type HubStats = {
  totals: {
    all: number
    online: number
    offline: number
    maintenance: number
    closed: number
  }
  inventory: {
    ready: number
    charging: number
  }
  by_hub_ready: Array<{ code: string; ready: number }>
}

export type HubWritePayload = {
  code?: string
  name: string
  address: string
  lat?: number
  lng?: number
  slot_count?: number
  solar_capacity_kw?: string | number
  status?: HubStatus
}

export type HubStatusPayload = {
  status: HubStatus
  note?: string
}

export type HubDailyMetric = {
  date: string
  label: string
  swaps: number
  energy_kwh: number
  revenue_kobo?: number
  revenue_naira?: number
}

export type HubDetailStats = {
  hub_id: string
  code: string
  name: string
  status: HubStatus
  solar_capacity_kw: number
  /** Null until hubs report inverter telemetry. */
  solar_output_kw: number | null
  total_slots: number
  ready_count: number
  charging_count: number
  empty_count: number
  fault_count: number
  swaps_count: number
  swaps_per_day: number
  energy_kwh_total: number
  daily_metrics: HubDailyMetric[]
  start_date: string
  end_date: string
  revenue_kobo_total?: number
  revenue_naira_total?: number
  daily_revenue_naira_avg?: number
  expected_swaps_today?: number | null
  estimated_revenue_today_naira?: number | null
}
