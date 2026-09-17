import { useFetchData } from '@shared/hooks/api'

export type HubDemandForecast = {
  hub_id: string
  hub_code: string
  hub_name: string
  expected_swaps_next_24h: number
  peak_hour_utc: number | null
  historical_swaps: number
  lookback_days: number
  method: 'trailing_daily_average'
  confidence: 'LOW' | 'MEDIUM'
}

export function useHubDemandForecast(options?: { enabled?: boolean }) {
  const query = useFetchData<{ results: HubDemandForecast[] }>(
    '/analytics/demand/hubs/',
    { lookback_days: 28 },
    {
      enabled: options?.enabled !== false,
      staleTime: 5 * 60_000,
      keepPreviousData: true,
    },
  )
  return { ...query, forecasts: query.data?.results ?? [] }
}
