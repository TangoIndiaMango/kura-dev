export const TELEMETRY_ENDPOINTS = {
  fleet: '/mobility/telemetry/fleet/',
  events: '/mobility/telemetry/events/',
} as const

export type TelemetryStatus = 'LIVE' | 'STATIONARY' | 'OFFLINE'

export type TelemetryFleetRow = {
  vehicle_id: string
  registration_plate: string
  vehicle_type: string
  make: string
  model: string
  account_id: string
  owner_name: string
  vehicle_status: string
  telemetry_status: TelemetryStatus
  last_recorded_at: string | null
  battery_pct: number | null
  speed_kmh: number | null
  source: string | null
}

export type TelemetryFleetApi = {
  totals: {
    vehicles: number
    live: number
    stationary: number
    offline: number
  }
  results: TelemetryFleetRow[]
}

export type TelemetryEventApi = {
  id: string
  vehicle_id: string
  vehicle_reg: string
  recorded_at: string
  battery_pct: number | null
  lat: number | null
  lng: number | null
  speed_kmh: number | null
  odometer_km: number | null
  source: string
  ingest_batch: string
  raw: Record<string, unknown>
  created_at: string
}
