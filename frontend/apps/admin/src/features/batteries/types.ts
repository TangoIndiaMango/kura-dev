export type PageNumberPaginated<T> = {
  count: number
  page_size: number
  current_page: number
  total_pages: number
  next: string | null
  previous: string | null
  results: T[]
}

export type BatteryStatus =
  | 'AVAILABLE'
  | 'RESERVED'
  | 'ISSUED'
  | 'RETURNED'
  | 'CHARGING'
  | 'UNAVAILABLE'
  | 'FAULTED'
  | 'LOST'
  | 'RETIRED'

export type BatteryListApi = {
  id: string
  serial: string
  battery_type_id: string
  battery_type_name: string
  status: BatteryStatus
  charge_pct: number
  health_pct: number
  cycle_count: number
  current_hub_id: string | null
  hub_code: string | null
  hub_name: string | null
  custodian_type: string
  created_at: string
}

export type BatteryDetailApi = BatteryListApi & {
  custodian_id: string | null
  vehicle_id: string | null
  issued_at: string | null
  expected_return_by: string | null
  updated_at: string
}

export type BatteryEventApi = {
  id: string
  event: string
  from_custodian_type: string
  from_custodian_id: string | null
  to_custodian_type: string
  to_custodian_id: string | null
  hub_id: string | null
  hub_code: string | null
  swap_id: string | null
  charge_pct: number | null
  meta: Record<string, unknown>
  occurred_at: string
  recorded_at: string
  source: string
  actor_label: string
}

export type CursorPage<T> = {
  results: T[]
  next: string | null
  previous: string | null
}

export type BatteryTypeApi = {
  id: string
  name: string
  manufacturer: string
  capacity_kwh: string
  nominal_voltage: number
  vehicle_type: string
  qr_scheme?: string
  status?: 'PENDING' | 'ACTIVE' | 'DEACTIVATED' | string
  created_by?: string | null
  approved_by?: string | null
  created_at?: string
  updated_at?: string
}

export type BatteryTypeWritePayload = {
  name: string
  manufacturer?: string
  capacity_kwh?: string | number
  nominal_voltage?: number
  vehicle_type?: string
  qr_scheme?: string
}

export type BatteryStats = {
  totals: {
    all: number
    available: number
    charging: number
    issued: number
    reserved: number
    faulted: number
    retired: number
  }
  by_type: Array<{ name: string; count: number; available: number }>
}

export type BatteryWritePayload = {
  serial?: string
  battery_type_id?: string
  current_hub_id?: string | null
  status?: BatteryStatus
  charge_pct?: number
  health_pct?: number
  cycle_count?: number
}

export type BatteryStatusPayload = {
  status: BatteryStatus
  note?: string
  current_hub_id?: string | null
}

export type BatteryTransferPayload = {
  destination: 'hub' | 'workshop' | 'transit'
  hub_id?: string | null
  note?: string
}

export type BatteryNotePayload = {
  note?: string
}

export type BatteryLabelApi = {
  serial: string
  qr_scheme: string
  payload: string
}

export function batteryStatusLabel(status: BatteryStatus): string {
  switch (status) {
    case 'AVAILABLE':
      return 'Available'
    case 'CHARGING':
      return 'Charging'
    case 'ISSUED':
      return 'In field'
    case 'RESERVED':
      return 'Reserved'
    case 'RETURNED':
      return 'Returned'
    case 'UNAVAILABLE':
      return 'Unavailable'
    case 'FAULTED':
      return 'Faulty'
    case 'LOST':
      return 'Lost'
    case 'RETIRED':
      return 'Retired'
    default:
      return status
  }
}

export function batteryLocationLabel(b: {
  status: BatteryStatus
  hub_name: string | null
  hub_code: string | null
  vehicle_id?: string | null
}): string {
  if (b.status === 'ISSUED' && b.vehicle_id) return `Vehicle · ${b.vehicle_id.slice(0, 8)}`
  if (b.hub_name) return b.hub_name
  if (b.hub_code) return b.hub_code
  return 'Unassigned'
}
