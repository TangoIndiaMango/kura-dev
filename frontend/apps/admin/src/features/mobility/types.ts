export type PageNumberPaginated<T> = {
  count: number
  page_size: number
  current_page: number
  total_pages: number
  next: string | null
  previous: string | null
  results: T[]
}

export type CursorPaginated<T> = {
  results: T[]
  next: string | null
  previous: string | null
}

export type VehicleListApi = {
  id: string
  account: string
  registration_plate: string
  make: string
  model_name: string
  vehicle_type: string
  current_battery_serial?: string | null
  current_battery_charge?: number | null
  assigned_driver_id?: string | null
  assigned_driver_name?: string | null
  status: string
}

export type SubscriptionListApi = {
  id: string
  account_id: string
  account_name?: string
  account_kura_id?: string
  vehicle_id: string
  plan_id: string
  plan_name: string
  plan_code: string
  plan_period: string
  vehicle_plate: string
  starts_at: string
  ends_at: string
  swaps_used: number
  swaps_allowance: number | null
  status: string
  auto_renew: boolean
  amount_kobo?: number
  list_price_kobo?: number
  created_at: string
}

export type PlanApi = {
  id: string
  code: string
  name: string
  vehicle_type: string
  period: 'day' | 'week' | 'month' | 'swap' | string
  duration_days: number | null
  swap_allowance: number | null
  price_kobo: number
  description: string
  auto_renew_default: boolean
  status: string
  is_active: boolean
  created_at: string
  active_subscriber_count?: number
}

export type SwapListApi = {
  id: string
  account: string
  vehicle_plate: string
  hub_code: string
  payment_mode: string
  amount_kobo: number
  status: string
  created_at: string
}
