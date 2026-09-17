import { useFetchData } from '@shared/hooks/api'
import { useCapabilities } from '../../auth/useCapabilities'
import { TELEMETRY_ENDPOINTS, type TelemetryEventApi, type TelemetryFleetApi } from '../types'

export function useTelemetryFleet(
  params?: { search?: string },
  options?: { enabled?: boolean },
) {
  const { can } = useCapabilities()
  const enabled = options?.enabled !== false && can('telemetry:read')
  const query = useFetchData<TelemetryFleetApi>(
    TELEMETRY_ENDPOINTS.fleet,
    params?.search ? { search: params.search } : undefined,
    { enabled, keepPreviousData: true, staleTime: 30_000 },
  )
  return {
    ...query,
    rows: query.data?.results ?? [],
    totals: query.data?.totals ?? {
      vehicles: 0,
      live: 0,
      stationary: 0,
      offline: 0,
    },
  }
}

export function useTelemetryEvents(
  vehicleId: string | null | undefined,
  options?: { enabled?: boolean },
) {
  const { can } = useCapabilities()
  const id = vehicleId ?? ''
  const enabled =
    Boolean(id) && options?.enabled !== false && can('telemetry:read')
  return useFetchData<{ results?: TelemetryEventApi[]; next?: string | null } | TelemetryEventApi[]>(
    TELEMETRY_ENDPOINTS.events,
    { vehicle_id: id },
    { enabled, staleTime: 15_000 },
  )
}

export { TELEMETRY_ENDPOINTS }
