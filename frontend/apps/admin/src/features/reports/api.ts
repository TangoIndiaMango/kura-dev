/** Reports: summary (from daily rollups), the export builder and history. */
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { axiosInstance } from '@lib/api/client'
import { useFetchData, usePostData } from '@shared/hooks/api'

export const REPORTS_ENDPOINTS = {
  history: '/reports/',
  create: '/reports/',
  datasets: '/reports/datasets/',
  preview: '/reports/preview/',
  summary: '/reports/summary/',
  summaryHubs: '/reports/summary/hubs/',
  summaryCooperatives: '/reports/summary/cooperatives/',
} as const

export type Page<T> = {
  count: number
  total_pages: number
  current_page: number
  results: T[]
}

export type SummaryFilters = {
  start_date?: string
  end_date?: string
  hub?: string | null
  cooperative?: string | null
}

/**
 * Revenue: money spent on services. Received: money in from outside (wallet
 * debits left out). Top-ups: wallet funding, counted as revenue when spent.
 */
export type SummaryTotals = {
  revenue_kobo: number
  vat_kobo: number
  net_kobo: number
  payments: number
  received_kobo: number
  topup_kobo: number
  pending_kobo: number
  pending_payments: number
  failed_payments: number
  refunded_kobo: number
  swaps: number
  swap_kobo: number
  /** Successful ÷ (successful + failed) attempts; null with no attempts. */
  success_rate_pct: number | null
  /** Null when counting distinct riders took too long for the range. */
  riders: number | null
  vehicles: number | null
  new_riders: number
  expired_reservations: number
  overrides: number
}

export type SummarySplit = {
  key: string
  payments: number
  amount_kobo: number
  vat_kobo: number
  previous_amount_kobo: number
}

export type ReportsSummary = {
  range: { start_date: string; end_date: string }
  previous_range: { start_date: string; end_date: string }
  as_of: string | null
  totals: SummaryTotals
  previous: SummaryTotals
  daily: { day: string; revenue_kobo: number; swaps: number }[]
  /** Swaps against packs and hubs in service now. */
  utilisation: {
    packs_in_service: number
    hubs_open: number
    swaps_per_pack_day: number | null
    swaps_per_hub_day: number | null
    days: number
  }
  purposes: SummarySplit[]
  channels: SummarySplit[]
  credit: {
    loans: number
    outstanding_kobo: number
    past_due_loans: number
    late_1_7_kobo: number
    late_8_30_kobo: number
    late_31_90_kobo: number
    late_90_plus_kobo: number
  }
}

export type SummaryHubRow = {
  hub_id: string
  code: string
  name: string
  swaps: number
  revenue_kobo: number
  expired_reservations: number
  overrides: number
}

export type SummaryCoopRow = {
  cooperative_id: string | null
  name: string
  chairman: string
  vehicles: number
  packs_out: number
  swaps: number
  revenue_kobo: number
}

export type FieldType = 'text' | 'number' | 'money' | 'datetime'

export type DatasetField = {
  key: string
  label: string
  group: string
  type: FieldType
}

export type DatasetFilter = {
  key: string
  label: string
  kind: 'hub' | 'cooperative' | 'choice'
  choices?: string[]
}

export type Dataset = {
  code: string
  label: string
  description: string
  date_label: string
  fields: DatasetField[]
  filters: DatasetFilter[]
}

export type BuildRequest = {
  dataset: string
  fields: string[]
  start_date: string
  end_date: string
  filters: Record<string, string>
  search: string
  page?: number
  format?: 'csv' | 'pdf'
}

export type PreviewResponse = {
  columns: { key: string; label: string; type: FieldType }[]
  rows: (string | number | null)[][]
  count: number | null
  page: number
  page_size: number
  has_more: boolean
}

export type ReportJob = {
  id: string
  kind: string
  params: Record<string, unknown>
  status: 'QUEUED' | 'RUNNING' | 'READY' | 'FAILED' | 'EXPIRED'
  download_path: string
  expires_at: string | null
  raw: {
    filename?: string
    bytes?: number
    error?: string
    content_type?: string
    rows?: number
    /** The file stopped at the row cap: narrow the dates or filters for the rest. */
    truncated?: boolean
  }
  created_at: string
}

function summaryParams(f: SummaryFilters) {
  return {
    ...(f.start_date ? { start_date: f.start_date } : {}),
    ...(f.end_date ? { end_date: f.end_date } : {}),
    ...(f.hub ? { hub: f.hub } : {}),
    ...(f.cooperative ? { cooperative: f.cooperative } : {}),
  }
}

export function useReportsSummary(f: SummaryFilters, enabled = true) {
  return useFetchData<ReportsSummary>(REPORTS_ENDPOINTS.summary, summaryParams(f), {
    enabled,
    keepPreviousData: true,
    staleTime: 60_000,
  })
}

export function useSummaryHubs(f: SummaryFilters, page: number, enabled = true) {
  return useFetchData<Page<SummaryHubRow>>(
    REPORTS_ENDPOINTS.summaryHubs,
    { ...summaryParams(f), page, page_size: 10 },
    { enabled, keepPreviousData: true, staleTime: 60_000 },
  )
}

export function useSummaryCooperatives(f: SummaryFilters, page: number, enabled = true) {
  return useFetchData<Page<SummaryCoopRow>>(
    REPORTS_ENDPOINTS.summaryCooperatives,
    { ...summaryParams(f), page, page_size: 10 },
    { enabled, keepPreviousData: true, staleTime: 60_000 },
  )
}

export function useDatasets() {
  return useFetchData<Dataset[]>(REPORTS_ENDPOINTS.datasets, undefined, {
    staleTime: 5 * 60_000,
  })
}

/** Preview is a POST (the request has lists and maps) but reads like a query. */
export function usePreview(req: BuildRequest | null) {
  return useQuery<PreviewResponse>({
    queryKey: [REPORTS_ENDPOINTS.preview, req],
    queryFn: async () => {
      const { data } = await axiosInstance.post<PreviewResponse>(REPORTS_ENDPOINTS.preview, req, {
        silentError: true,
      })
      return data
    },
    enabled: Boolean(req),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  })
}

export function useCreateExport() {
  return usePostData<
    { kind: 'DATASET'; params: BuildRequest; idempotency_key?: string },
    ReportJob
  >(REPORTS_ENDPOINTS.create, [REPORTS_ENDPOINTS.history], { silentError: true })
}

export function useReportHistory(page: number) {
  return useFetchData<Page<ReportJob>>(
    REPORTS_ENDPOINTS.history,
    { page, page_size: 20 },
    { keepPreviousData: true, staleTime: 15_000 },
  )
}

/** The API serves /api/v1/...; the client already prefixes /api/v1. */
export function downloadEndpoint(job: ReportJob): string {
  return job.download_path.replace(/^\/api\/v1/, '')
}
