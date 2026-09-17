export type PageNumberPaginated<T> = {
  count: number
  page_size: number
  current_page: number
  total_pages: number
  next: string | null
  previous: string | null
  results: T[]
}

export type VehicleStatus = 'ACTIVE' | 'PENDING' | 'SUSPENDED' | 'RETIRED'

export type VehicleListApi = {
  id: string
  registration_plate: string
  make: string
  model_name: string
  vehicle_type: string
  battery_type_name: string
  account_id: string
  owner_name: string
  owner_kura_id: string
  current_battery_serial: string | null
  current_battery_charge: number | null
  hardware_id: string | null
  vin: string
  status: VehicleStatus
  created_at: string
}

export type VehicleDetailApi = VehicleListApi & {
  vehicle_model_id: string
  current_battery_id: string | null
  petrol_engine_id: string | null
  acquisition_path: 'EV_FIRST' | 'ENGINE_SWAP' | string
  updated_at: string
}

export type VehicleStats = {
  totals: {
    all: number
    active: number
    pending: number
    suspended: number
  }
  by_type: Array<{ vehicle_type: string; count: number }>
}

export type VehicleModelApi = {
  id: string
  make: string
  model: string
  vehicle_type: string
  battery_type: string
  battery_type_id?: string
  battery_type_name: string
  service_interval_km?: number | null
  service_interval_days?: number | null
  created_at?: string
  updated_at?: string
}

export type VehicleModelStats = {
  totals: {
    all: number
    motorcycle: number
    tricycle: number
    boat: number
  }
  by_type: Array<{ vehicle_type: string; count: number }>
}

export type VehicleModelWritePayload = {
  make: string
  model: string
  vehicle_type: string
  battery_type: string
  service_interval_km?: number | null
  service_interval_days?: number | null
}

export type VehicleWritePayload = {
  account_id?: string
  vehicle_model_id?: string
  registration_plate?: string
  hardware_id?: string | null
  vin?: string
  status?: VehicleStatus
}

export type VehicleStatusPayload = { status: VehicleStatus }

export type VehicleNotePayload = { note?: string }

export function vehicleStatusLabel(status: string) {
  if (status === 'ACTIVE') return 'Active'
  if (status === 'PENDING') return 'Pending'
  if (status === 'SUSPENDED') return 'Suspended'
  if (status === 'RETIRED') return 'Retired'
  return status
}
