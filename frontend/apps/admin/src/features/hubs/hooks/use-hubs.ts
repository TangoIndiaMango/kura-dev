import { useFetchData, usePatchData, usePostData } from '@shared/hooks/api'
import { useCapabilities } from '../../auth/useCapabilities'
import type { SwapListApi } from '@features/swaps'
import { HUBS_ENDPOINTS } from '../constants'
import type {
  HubDetailApi,
  HubDetailStats,
  HubListApi,
  HubSlotApi,
  HubStats,
  HubStatusPayload,
  HubWritePayload,
  PageNumberPaginated,
} from '../types'

const INVALIDATE = [HUBS_ENDPOINTS.list, HUBS_ENDPOINTS.stats]

export function useHubs(
  params?: {
    search?: string
    status?: string
    page?: number
    page_size?: number
  },
  options?: { enabled?: boolean },
) {
  const { can } = useCapabilities()
  const enabled = options?.enabled !== false && can('hubs:read')
  const query = useFetchData<PageNumberPaginated<HubListApi>>(
    HUBS_ENDPOINTS.list,
    {
      page: params?.page ?? 1,
      page_size: params?.page_size ?? 10,
      ...(params?.search ? { search: params.search } : {}),
      ...(params?.status && params.status !== 'all'
        ? { status: params.status }
        : {}),
    },
    { enabled, keepPreviousData: true, staleTime: 30_000 },
  )
  return {
    ...query,
    hubs: query.data?.results ?? [],
    count: query.data?.count ?? 0,
    totalPages: query.data?.total_pages ?? 1,
    currentPage: query.data?.current_page ?? params?.page ?? 1,
  }
}

export function useHubStats(options?: { enabled?: boolean }) {
  const { can } = useCapabilities()
  const enabled = options?.enabled !== false && can('hubs:read')
  return useFetchData<HubStats>(HUBS_ENDPOINTS.stats, undefined, {
    enabled,
    keepPreviousData: true,
    staleTime: 30_000,
  })
}

export function useHub(id: string | null | undefined, options?: { enabled?: boolean }) {
  const { can } = useCapabilities()
  const hubId = id ?? ''
  const enabled =
    Boolean(hubId) && options?.enabled !== false && can('hubs:read')
  const query = useFetchData<HubDetailApi>(
    hubId ? HUBS_ENDPOINTS.hub(hubId) : HUBS_ENDPOINTS.list,
    undefined,
    { enabled, staleTime: 15_000 },
  )
  return { ...query, hub: query.data ?? null }
}

export function useHubSlots(
  id: string | null | undefined,
  options?: { enabled?: boolean },
) {
  const { can } = useCapabilities()
  const hubId = id ?? ''
  const enabled =
    Boolean(hubId) && options?.enabled !== false && can('hubs:read')
  const query = useFetchData<HubSlotApi[]>(
    hubId ? HUBS_ENDPOINTS.slots(hubId) : HUBS_ENDPOINTS.list,
    undefined,
    { enabled, staleTime: 10_000 },
  )
  return { ...query, slots: query.data ?? [] }
}

export function useHubDetailStats(
  id: string | null | undefined,
  range?: { start_date?: string; end_date?: string },
  options?: { enabled?: boolean },
) {
  const { can } = useCapabilities()
  const hubId = id ?? ''
  const enabled =
    Boolean(hubId) && options?.enabled !== false && can('hubs:read')
  return useFetchData<HubDetailStats>(
    hubId ? `${HUBS_ENDPOINTS.hub(hubId)}stats/` : HUBS_ENDPOINTS.list,
    range?.start_date && range?.end_date
      ? { start_date: range.start_date, end_date: range.end_date }
      : undefined,
    { enabled, staleTime: 15_000, keepPreviousData: true },
  )
}

export function useCreateHub() {
  return usePostData<HubWritePayload, HubDetailApi>(
    HUBS_ENDPOINTS.list,
    INVALIDATE,
    { silentError: true },
  )
}

export function useUpdateHub(hubId: string) {
  return usePatchData<Partial<HubWritePayload>, HubDetailApi>(
    HUBS_ENDPOINTS.hub(hubId),
    [...INVALIDATE, HUBS_ENDPOINTS.hub(hubId), HUBS_ENDPOINTS.slots(hubId)],
    { silentError: true },
  )
}

export function useSetHubStatus(hubId: string) {
  return usePostData<HubStatusPayload, HubDetailApi>(
    HUBS_ENDPOINTS.status(hubId),
    [...INVALIDATE, HUBS_ENDPOINTS.hub(hubId), HUBS_ENDPOINTS.slots(hubId)],
    { silentError: true },
  )
}

type CursorPage<T> = {
  results: T[]
  next: string | null
  previous: string | null
}

export function useHubSwaps(
  id: string | null | undefined,
  options?: { enabled?: boolean },
) {
  const { can } = useCapabilities()
  const hubId = id ?? ''
  const enabled =
    Boolean(hubId) &&
    options?.enabled !== false &&
    (can('swaps:read') || can('hubs:read'))
  const query = useFetchData<CursorPage<SwapListApi>>(
    '/mobility/swaps/',
    hubId ? { hub: hubId, page_size: 50 } : undefined,
    { enabled, staleTime: 15_000 },
  )
  return { ...query, swaps: query.data?.results ?? [] }
}

export { HUBS_ENDPOINTS }
