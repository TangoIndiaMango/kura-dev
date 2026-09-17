export type ImpactStoryStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'

export type PageNumberPaginated<T> = {
  count: number
  results: T[]
  current_page?: number
  total_pages?: number
  page_size?: number
}

export type ImpactSeriesPoint = {
  period: string
  label: string
  swaps: number
  co2_t: number
  fuel_savings_kobo: number
}

export type ImpactStatsApi = {
  period: string
  operators_served: number
  swaps: number
  fuel_savings_kobo: number
  engines_replaced: number
  co2_kg: string
  inputs: Record<string, unknown>
  disclaimer: string
  series: ImpactSeriesPoint[]
}

export type ImpactStoryListApi = {
  id: string
  title: string
  region: string
  metric_highlight: string
  partners: string
  status: ImpactStoryStatus
  published_at: string | null
  created_at: string
}

export type ImpactStoryDetailApi = ImpactStoryListApi & {
  summary: string
  created_by_id: string | null
  raw: Record<string, unknown>
  updated_at: string
}

export type ImpactStoryWritePayload = {
  title?: string
  region?: string
  metric_highlight?: string
  partners?: string
  summary?: string
  status?: ImpactStoryStatus
  raw?: Record<string, unknown>
}

export type ReportJobApi = {
  id: string
  kind: string
  params: Record<string, unknown>
  status: 'QUEUED' | 'RUNNING' | 'READY' | 'FAILED' | 'EXPIRED'
  file_public_id: string
  download_path: string
  expires_at: string | null
  raw: Record<string, unknown>
  created_at: string
}

export type ReportCreatePayload = {
  kind: 'IMPACT_PDF' | 'OPS_CSV' | 'FLEET_CSV' | 'REVENUE_CSV'
  params?: {
    period?: string
    date_from?: string
    date_to?: string
    hub_id?: string
    status?: string
  }
  idempotency_key?: string
}
