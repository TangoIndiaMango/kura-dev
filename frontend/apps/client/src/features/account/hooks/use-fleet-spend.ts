import { useFetchData } from '../../../shared/hooks/api'

export type FleetSpendDay = {
  date: string
  swaps: number
  swap_fees_kobo: number
  plan_fees_kobo: number
  total_kobo: number
}

export type FleetSpendApi = {
  start_date: string
  end_date: string
  totals: {
    swaps: number
    swap_fees_kobo: number
    plan_fees_kobo: number
    total_kobo: number
    avg_per_day_kobo: number
  }
  daily: FleetSpendDay[]
  by_vehicle: Array<{
    vehicle_id: string | null
    plate: string
    swaps: number
    swap_fees_kobo: number
    plan_fees_kobo: number
    total_kobo: number
  }>
  by_driver: Array<{ driver_id: string | null; name: string; swaps: number; swap_fees_kobo: number }>
  by_payment_mode: Array<{ mode: string; swaps: number; amount_kobo: number }>
  drivers_today: Array<{
    driver_id: string
    name: string
    swaps: number
    spend_kobo: number
    daily_swap_limit: number | null
    daily_spend_kobo_limit: number | null
  }>
}

/** Owner-only: what the account paid KURA per hub-local day (swap + plan fees). */
export function useFleetSpend(range: { start_date?: string; end_date?: string }, enabled = true) {
  const query = useFetchData<FleetSpendApi>('/accounts/me/fleet-spend/', range, {
    enabled,
    staleTime: 30_000,
  })
  return { ...query, spend: query.data ?? null }
}
