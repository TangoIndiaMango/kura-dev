import { useFetchData } from '@shared/hooks/api'
import { OPS_ENDPOINTS } from '@features/payments/hooks/use-cash-ops'

export type CommandCentrePayload = {
  hubs: Array<{
    id: string
    code: string
    name: string
    status: string
    ready: number
    charging: number
    issued: number
    open_alerts: number
    last_sync_at?: string | null
    solar_capacity_kw?: string
    solar_fault?: boolean
  }>
  kpis: {
    today_swaps: number
    today_revenue_kobo: number
    active_alerts: number
    today_cash_kobo: number
    online_hubs: number
    total_hubs: number
  }
  /** Completed swaps per Lagos hour, index 0–23. */
  hourly_swaps?: { today: number[]; yesterday: number[] }
  generated_at: string
}

export type OpsActivityRow = {
  id: string
  kind: string
  title: string
  subtitle: string
  hub_code?: string | null
  created_at: string
  link_path: string
}

export function useCommandCentre() {
  return useFetchData<CommandCentrePayload>(OPS_ENDPOINTS.commandCentre, undefined, {
    staleTime: 30_000,
    refetchInterval: 30_000,
  })
}

export function useOpsActivity() {
  return useFetchData<{ results: OpsActivityRow[] }>(
    OPS_ENDPOINTS.activity,
    { limit: 40 },
    { staleTime: 30_000, refetchInterval: 30_000 },
  )
}
