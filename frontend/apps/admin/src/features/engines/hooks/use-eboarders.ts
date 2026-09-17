import { useFetchData, usePatchData, usePostData } from '@shared/hooks/api'
import { useCapabilities } from '../../auth/useCapabilities'
import { EBOARDERS_ENDPOINTS } from '../constants'
import type {
  EBoarderDetailApi,
  EBoarderListApi,
  EBoarderStats,
  EBoarderWritePayload,
  PageNumberPaginated,
} from '../types'

const INVALIDATE = [EBOARDERS_ENDPOINTS.list, EBOARDERS_ENDPOINTS.stats]
const EMPTY: EBoarderListApi[] = []

export function useEBoarders(
  params?: {
    page?: number
    page_size?: number
    status?: string
    search?: string
    hub?: string
  },
  options?: { enabled?: boolean },
) {
  const { can } = useCapabilities()
  const enabled = options?.enabled !== false && can('engines:manage')
  const query = useFetchData<PageNumberPaginated<EBoarderListApi>>(
    EBOARDERS_ENDPOINTS.list,
    {
      page: params?.page ?? 1,
      page_size: params?.page_size ?? 25,
      ...(params?.status && params.status !== 'all'
        ? { status: params.status }
        : {}),
      ...(params?.search ? { search: params.search } : {}),
      ...(params?.hub ? { hub: params.hub } : {}),
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

export function useEBoarderStats(options?: { enabled?: boolean }) {
  const { can } = useCapabilities()
  const enabled = options?.enabled !== false && can('engines:manage')
  const query = useFetchData<EBoarderStats>(
    EBOARDERS_ENDPOINTS.stats,
    undefined,
    { enabled, staleTime: 30_000 },
  )
  return { ...query, stats: query.data ?? null }
}

export function useEBoarder(
  id: string | null | undefined,
  options?: { enabled?: boolean },
) {
  const { can } = useCapabilities()
  const rowId = id ?? ''
  const enabled =
    Boolean(rowId) && options?.enabled !== false && can('engines:manage')
  const query = useFetchData<EBoarderDetailApi>(
    rowId ? EBOARDERS_ENDPOINTS.eboarder(rowId) : EBOARDERS_ENDPOINTS.list,
    undefined,
    { enabled, staleTime: 15_000 },
  )
  return { ...query, eboarder: query.data ?? null }
}

export function useCreateEBoarder() {
  return usePostData<EBoarderWritePayload, EBoarderDetailApi>(
    EBOARDERS_ENDPOINTS.list,
    INVALIDATE,
    { silentError: true },
  )
}

export function useUpdateEBoarder(id: string) {
  return usePatchData<Partial<EBoarderWritePayload>, EBoarderDetailApi>(
    EBOARDERS_ENDPOINTS.eboarder(id),
    [...INVALIDATE, EBOARDERS_ENDPOINTS.eboarder(id)],
    { silentError: true },
  )
}
