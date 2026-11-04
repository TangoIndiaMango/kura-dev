import { useFetchData } from '@shared/hooks/api'

export type RevenueCohortsPayload = {
  from_month: string
  cohorts: {
    cohort: string
    riders: number
    months: { offset: number; active: number; paid_kobo: number }[]
  }[]
  arpu: { month: string; active_riders: number; paid_kobo: number; arpu_kobo: number }[]
}

export type RevenueRetentionPayload = {
  active_riders: number
  active_riders_before: number
  churned_riders: number
  churn_pct: number | null
  plans_ended: number
  plans_renewed: number
  renewal_pct: number | null
  active_plans: number
}

/** Joining-month cohorts and monthly ARPU, from the per-rider daily rollup. */
export function useRevenueCohorts(months: number, enabled = true) {
  return useFetchData<RevenueCohortsPayload>(
    '/analytics/revenue/cohorts/',
    { months },
    { enabled, staleTime: 5 * 60_000, keepPreviousData: true },
  )
}

/** Riders and plans over the last 30 days against the 30 before. */
export function useRevenueRetention(enabled = true) {
  return useFetchData<RevenueRetentionPayload>('/analytics/revenue/retention/', undefined, {
    enabled,
    staleTime: 5 * 60_000,
  })
}
