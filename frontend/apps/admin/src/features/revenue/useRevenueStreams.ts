import { useFetchData } from '@shared/hooks/api'

export type RevenueStreamRowApi = {
  code: string
  label: string
  amount_kobo: number
  transactions: number
}

export type RevenueStreamsPayload = {
  range: { start_date: string; end_date: string }
  gross_kobo: number
  streams: RevenueStreamRowApi[]
  channels: Array<{
    channel?: string
    amount_kobo: number
    transactions: number
  }>
}

export function useRevenueStreams(params: {
  start_date?: string
  end_date?: string
  enabled?: boolean
}) {
  return useFetchData<RevenueStreamsPayload>(
    '/analytics/revenue/streams/',
    {
      ...(params.start_date ? { start_date: params.start_date } : {}),
      ...(params.end_date ? { end_date: params.end_date } : {}),
    },
    {
      enabled: params.enabled !== false,
      staleTime: 30_000,
      keepPreviousData: true,
    },
  )
}
