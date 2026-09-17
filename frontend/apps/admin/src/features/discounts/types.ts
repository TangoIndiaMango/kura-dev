export type PageNumberPaginated<T> = {
  count: number
  page_size: number
  current_page: number
  total_pages: number
  next: string | null
  previous: string | null
  results: T[]
}

export type DiscountValueType = 'PERCENT' | 'AMOUNT'
export type DiscountAudience = 'ALL' | 'FLEET' | 'SEGMENT'
export type DiscountStatus =
  | 'DRAFT'
  | 'PENDING'
  | 'SCHEDULED'
  | 'ACTIVE'
  | 'PAUSED'
  | 'EXPIRED'
  | 'SUPERSEDED'

export type DiscountPeriod = 'daily' | 'weekly' | 'monthly' | 'swap'

export type DiscountApi = {
  id: string
  name: string
  code: string
  value_type: DiscountValueType | string
  value: number
  status: DiscountStatus | string
  applies_to_all_plans: boolean
  plan_option_ids: string[]
  periods: string[]
  audience: DiscountAudience | string
  fleet_min_vehicles: number | null
  segment_id: string
  channels: string
  summary: string
  max_redemptions: number | null
  redemptions_count: number
  max_per_account: number
  starts_at: string | null
  ends_at: string | null
  created_at: string
}

export type DiscountWritePayload = {
  name: string
  code: string
  value_type: DiscountValueType
  value: number
  status?: DiscountStatus
  applies_to_all_plans: boolean
  plan_option_ids: string[]
  periods: string[]
  audience: DiscountAudience
  fleet_min_vehicles?: number | null
  segment_id?: string
  channels: string
  summary?: string
  max_redemptions?: number | null
  max_per_account?: number
  starts_at?: string | null
  ends_at?: string | null
}

export type DiscountPatchPayload = Partial<DiscountWritePayload>

export type DiscountRedemptionApi = {
  id: string
  account_id: string
  account_display_name: string
  kura_id: string
  list_price_kobo: number
  discount_kobo: number
  due_kobo: number
  channel: string
  period: string
  created_at: string
}

export type CursorPaginated<T> = {
  results: T[]
  next: string | null
  previous: string | null
}
