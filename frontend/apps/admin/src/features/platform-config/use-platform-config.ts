import { useFetchData } from '@shared/hooks/api/use-api-queries'
import { usePostData } from '@shared/hooks/api/use-api-mutations'

export type ConfigNamespaceSnapshot = {
  namespace: string
  effective: {
    enabled?: boolean
    score_threshold?: number
    min_active_days?: number
    min_on_time_pct?: number
    min_amount_kobo?: number
    max_amount_kobo?: number
    tenor_days?: number[]
    interest_rate_bps?: number
    [key: string]: unknown
  }
  active_version_id: string | null
  pending: {
    id: string
    value: Record<string, unknown>
    created_by_id: string | null
    note: string
    created_at: string
  } | null
}

export type ConfigVersionApi = {
  id: string
  namespace: string
  key: string
  value: Record<string, unknown>
  status: 'PENDING' | 'ACTIVE' | 'SUPERSEDED' | 'REJECTED' | string
  effective_from: string | null
  created_by_id: string | null
  approved_by_id: string | null
  created_by_label?: string | null
  approved_by_label?: string | null
  note: string
  created_at: string
  updated_at: string
}

export type PageNumberPaginated<T> = {
  count: number
  page_size: number
  current_page: number
  total_pages: number
  next: string | null
  previous: string | null
  results: T[]
}

export const configKeys = {
  credit: '/config/credit/',
  offers: '/config/offers/',
  versions: '/config/versions/',
  version: (id: string) => `/config/versions/${id}/`,
  approve: (id: string) => `/config/versions/${id}/approve/`,
} as const

export function useConfigNamespace(
  namespace: 'credit' | 'offers',
  enabled = true,
) {
  const endpoint = configKeys[namespace]
  return useFetchData<ConfigNamespaceSnapshot>(endpoint, undefined, {
    enabled,
    staleTime: 30_000,
  })
}

export function useConfigVersions(
  params?: {
    status?: string
    namespace?: string
    page?: number
    page_size?: number
  },
  options?: { enabled?: boolean },
) {
  const enabled = options?.enabled !== false
  const query = useFetchData<PageNumberPaginated<ConfigVersionApi>>(
    configKeys.versions,
    {
      page: params?.page ?? 1,
      page_size: params?.page_size ?? 25,
      ...(params?.status ? { status: params.status } : {}),
      ...(params?.namespace ? { namespace: params.namespace } : {}),
    },
    { enabled, keepPreviousData: true, staleTime: 15_000 },
  )
  return {
    ...query,
    versions: query.data?.results ?? [],
    count: query.data?.count ?? 0,
    totalPages: query.data?.total_pages ?? 1,
    currentPage: query.data?.current_page ?? params?.page ?? 1,
  }
}

export function useConfigVersion(
  id: string | null | undefined,
  options?: { enabled?: boolean },
) {
  const versionId = id ?? ''
  const enabled = Boolean(versionId) && options?.enabled !== false
  const query = useFetchData<ConfigVersionApi>(
    versionId ? configKeys.version(versionId) : configKeys.versions,
    undefined,
    { enabled, staleTime: 15_000 },
  )
  return { ...query, version: query.data ?? null }
}

export function useProposeConfig(namespace: 'credit' | 'offers') {
  return usePostData<
    { value: Record<string, unknown>; note?: string },
    { id: string; status: string }
  >(configKeys[namespace], [configKeys[namespace], configKeys.versions])
}

export function useApproveConfig() {
  return usePostData<{ id: string }, ConfigVersionApi>(
    (vars) => configKeys.approve(vars.id),
    [configKeys.credit, configKeys.offers, configKeys.versions],
    { body: () => ({}) },
  )
}
