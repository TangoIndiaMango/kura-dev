import { useFetchData, usePostData } from '@shared/hooks/api'
import type {
  EngineDetailApi,
  EngineListApi,
  EngineReleaseRequestPayload,
} from '../enginesTypes'

const ENGINES_API = {
  list: '/mobility/engines/',
  detail: (id: string) => `/mobility/engines/${id}/`,
  releaseRequest: (id: string) => `/mobility/engines/${id}/release-request/`,
} as const

type Page<T> = { results: T[] }

export function useMyEngines(options?: { enabled?: boolean }) {
  const enabled = options?.enabled !== false
  const query = useFetchData<Page<EngineListApi>>(
    ENGINES_API.list,
    { page_size: 20 },
    {
      enabled,
      staleTime: 30_000,
      keepPreviousData: true,
    },
  )
  return {
    ...query,
    engines: query.data?.results ?? [],
  }
}

export function useMyEngine(id: string | undefined, options?: { enabled?: boolean }) {
  const enabled = Boolean(id) && options?.enabled !== false
  return useFetchData<EngineDetailApi>(
    id ? ENGINES_API.detail(id) : ENGINES_API.list,
    undefined,
    {
      enabled,
      staleTime: 30_000,
    },
  )
}

export function useRequestEngineRelease(id: string) {
  return usePostData<EngineReleaseRequestPayload, EngineDetailApi>(
    ENGINES_API.releaseRequest(id),
    [ENGINES_API.list, ENGINES_API.detail(id)],
    { silentError: true },
  )
}
