export type PageNumberPaginated<T> = {
  count: number
  page_size: number
  current_page: number
  total_pages: number
  next: string | null
  previous: string | null
  results: T[]
}

export type PriceMatrixApi = {
  id: string
  vehicle_type: string
  daily_kobo: number
  weekly_kobo: number
  monthly_kobo: number
  pay_per_swap_kobo: number
  effective_from: string
  status: string
  created_at: string
  created_by_id?: string | null
  approved_by_id?: string | null
  updated_at?: string
}

export type HoldPolicyApi = {
  default_hold_minutes: number
  max_extend_minutes: number
}

export type PriceMatrixCreatePayload = {
  vehicle_type: string
  daily_kobo: number
  weekly_kobo: number
  monthly_kobo: number
  pay_per_swap_kobo: number
  effective_from: string
}

export type PlanWritePayload = {
  code?: string
  name: string
  vehicle_type?: string
  period?: string
  duration_days?: number | null
  swap_allowance?: number | null
  price_kobo?: number
  description?: string
  auto_renew_default?: boolean
}
