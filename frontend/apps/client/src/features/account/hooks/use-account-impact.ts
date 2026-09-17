import { useFetchData } from '@shared/hooks/api'

export const IMPACT_API = {
  me: '/accounts/me/impact/',
} as const

export type AccountImpactApi = {
  swaps_completed: number
  saved_vs_petrol_kobo: number
  saved_since: string | null
  swaps_per_week: string
  co2_kg_est: string
  disclaimer: string
}

export function useAccountImpact(options?: { enabled?: boolean }) {
  const query = useFetchData<AccountImpactApi>(IMPACT_API.me, undefined, {
    enabled: options?.enabled !== false,
    staleTime: 60_000,
  })
  return { ...query, impact: query.data ?? null }
}
