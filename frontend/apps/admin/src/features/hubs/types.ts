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

export type HubDetailApi = HubListApi & {
  lat: number
  lng: number
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
  solar_kw: number
  grid_kw: number
}

export type HubDetailStats = {
  hub_id: string
  code: string
  name: string
  status: HubStatus
  solar_capacity_kw: number
  solar_output_kw: number
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
}
