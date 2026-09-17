import { useFetchData, usePostData } from '@shared/hooks/api'
import { useCapabilities } from '../../auth/useCapabilities'
import { BATTERY_TYPES_ENDPOINTS } from '../constants'
import type {
  BatteryTypeApi,
  BatteryTypeWritePayload,
  PageNumberPaginated,
} from '../types'

const INVALIDATE = [BATTERY_TYPES_ENDPOINTS.list]
const EMPTY: BatteryTypeApi[] = []

export function useBatteryTypesList(
  params?: {
    page?: number
    page_size?: number
    status?: string
    vehicle_type?: string
    search?: string
  },
  options?: { enabled?: boolean },
) {
  const { can } = useCapabilities()
  const enabled = options?.enabled !== false && can('batteries:read')
  const query = useFetchData<PageNumberPaginated<BatteryTypeApi>>(
    BATTERY_TYPES_ENDPOINTS.list,
    {
      page: params?.page ?? 1,
      page_size: params?.page_size ?? 25,
      ...(params?.status && params.status !== 'all'
        ? { status: params.status }
        : {}),
      ...(params?.vehicle_type ? { vehicle_type: params.vehicle_type } : {}),
      ...(params?.search ? { search: params.search } : {}),
    },
    { enabled, keepPreviousData: true, staleTime: 30_000 },
  )
  return {
    ...query,
    rows: query.data?.results ?? EMPTY,
    count: query.data?.count ?? 0,
    totalPages: query.data?.total_pages ?? 1,
    currentPage: query.data?.current_page ?? params?.page ?? 1,
  }
}

export function useBatteryType(
  id: string | null | undefined,
  options?: { enabled?: boolean },
) {
  const { can } = useCapabilities()
  const typeId = id ?? ''
  const enabled =
    Boolean(typeId) && options?.enabled !== false && can('batteries:read')
  const query = useFetchData<BatteryTypeApi>(
    typeId ? BATTERY_TYPES_ENDPOINTS.type(typeId) : BATTERY_TYPES_ENDPOINTS.list,
    undefined,
    { enabled, staleTime: 15_000 },
  )
  return { ...query, batteryType: query.data ?? null }
}

export function useCreateBatteryType() {
  return usePostData<BatteryTypeWritePayload, BatteryTypeApi>(
    BATTERY_TYPES_ENDPOINTS.list,
    INVALIDATE,
    { silentError: true },
  )
}

/** @deprecated Use useCreateBatteryType instead */
export const useProposeBatteryType = useCreateBatteryType

export function useActivateBatteryType(id: string) {
  return usePostData<Record<string, never>, BatteryTypeApi>(
    BATTERY_TYPES_ENDPOINTS.activate(id),
    [...INVALIDATE, BATTERY_TYPES_ENDPOINTS.type(id)],
    { silentError: true },
  )
}
