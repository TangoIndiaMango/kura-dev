import { useFetchData } from '@shared/hooks/api'

export type RevenueBreakdown = {
  channel?: string
  purpose?: string
  amount_kobo: number
  transactions: number
}

export type RevenueOverview = {
  range: { start_date: string; end_date: string }
  gross_kobo: number
  vat_kobo: number
  transactions: number
  outstanding_kobo: number
  outstanding_transactions: number
  channels: RevenueBreakdown[]
  purposes: RevenueBreakdown[]
  daily: Array<{
    day: string
    amount_kobo: number
    transactions: number
  }>
  subscriptions: {
    active: number
    pending: number
    lapsed: number
  }
}

export function useRevenueOverview(params: {
  start_date?: string
  end_date?: string
}) {
  return useFetchData<RevenueOverview>(
    '/analytics/revenue/overview/',
    params,
    {
      staleTime: 30_000,
      keepPreviousData: true,
    },
  )
}
