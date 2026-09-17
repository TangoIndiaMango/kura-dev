import { useFetchData, usePostData } from '@shared/hooks/api'
import { useCapabilities } from '../../auth/useCapabilities'
import { ENGINES_ENDPOINTS, RETROFITS_ENDPOINTS } from '../constants'
import type {
  EngineDetailApi,
  EngineIntakePayload,
  EngineListApi,
  EngineReleasePayload,
  EngineReleaseRequestPayload,
  PageNumberPaginated,
  RetrofitChecklistPayload,
  RetrofitCreatePayload,
  RetrofitDetailApi,
  RetrofitInstallPayload,
  RetrofitListApi,
} from '../types'

const ENGINE_INVALIDATE = [ENGINES_ENDPOINTS.list]
const RETROFIT_INVALIDATE = [RETROFITS_ENDPOINTS.list, ENGINES_ENDPOINTS.list]
const EMPTY: EngineListApi[] = []
const EMPTY_JOBS: RetrofitListApi[] = []

export function useEngines(
  params?: {
    page?: number
    page_size?: number
    status?: string
    search?: string
  },
  options?: { enabled?: boolean },
) {
  const { can } = useCapabilities()
  const enabled = options?.enabled !== false && can('engines:manage')
  const query = useFetchData<PageNumberPaginated<EngineListApi>>(
    ENGINES_ENDPOINTS.list,
    {
      page: params?.page ?? 1,
      page_size: params?.page_size ?? 25,
      ...(params?.status && params.status !== 'all'
        ? { status: params.status }
        : {}),
      ...(params?.search ? { search: params.search } : {}),
    },
    { enabled, keepPreviousData: true, staleTime: 30_000 },
  )
  return {
    ...query,
    engines: query.data?.results ?? EMPTY,
    count: query.data?.count ?? 0,
    totalPages: query.data?.total_pages ?? 1,
    currentPage: query.data?.current_page ?? params?.page ?? 1,
  }
}

export function useEngine(
  id: string | null | undefined,
  options?: { enabled?: boolean },
) {
  const { can } = useCapabilities()
  const engineId = id ?? ''
  const enabled =
    Boolean(engineId) &&
    options?.enabled !== false &&
    can('engines:manage')
  const query = useFetchData<EngineDetailApi>(
    engineId ? ENGINES_ENDPOINTS.engine(engineId) : ENGINES_ENDPOINTS.list,
    undefined,
    { enabled, staleTime: 15_000 },
  )
  return { ...query, engine: query.data ?? null }
}

/** Retrofits logged before petrol sealed — same spine, early stage. */
export function useAwaitingIntakeJobs(options?: { enabled?: boolean }) {
  const { can } = useCapabilities()
  const enabled = options?.enabled !== false && can('engines:manage')
  const query = useFetchData<PageNumberPaginated<RetrofitListApi>>(
    RETROFITS_ENDPOINTS.list,
    { awaiting_intake: '1', page: 1, page_size: 50 },
    { enabled, keepPreviousData: true, staleTime: 30_000 },
  )
  return {
    ...query,
    jobs: query.data?.results ?? EMPTY_JOBS,
    count: query.data?.count ?? 0,
  }
}

export function useRetrofit(
  id: string | null | undefined,
  options?: { enabled?: boolean },
) {
  const { can } = useCapabilities()
  const retrofitId = id ?? ''
  const enabled =
    Boolean(retrofitId) &&
    options?.enabled !== false &&
    can('engines:manage')
  const query = useFetchData<RetrofitDetailApi>(
    retrofitId
      ? RETROFITS_ENDPOINTS.retrofit(retrofitId)
      : RETROFITS_ENDPOINTS.list,
    undefined,
    { enabled, staleTime: 15_000 },
  )
  return { ...query, retrofit: query.data ?? null }
}

export function useCreateRetrofit() {
  return usePostData<RetrofitCreatePayload, RetrofitDetailApi>(
    RETROFITS_ENDPOINTS.list,
    RETROFIT_INVALIDATE,
    { silentError: true },
  )
}

export function useEngineIntake() {
  return usePostData<
    EngineIntakePayload & { retrofit_id: string },
    RetrofitDetailApi
  >(
    (vars) => RETROFITS_ENDPOINTS.engineIntake(vars.retrofit_id),
    RETROFIT_INVALIDATE,
    {
      silentError: true,
      body: ({ retrofit_id: _rid, ...rest }) => rest,
    },
  )
}

export function useRetrofitInstall(retrofitId: string) {
  return usePostData<RetrofitInstallPayload, RetrofitDetailApi>(
    RETROFITS_ENDPOINTS.install(retrofitId),
    [...RETROFIT_INVALIDATE, RETROFITS_ENDPOINTS.retrofit(retrofitId)],
    { silentError: true },
  )
}

export function useRetrofitChecklist(retrofitId: string) {
  return usePostData<RetrofitChecklistPayload, RetrofitDetailApi>(
    RETROFITS_ENDPOINTS.checklist(retrofitId),
    [...RETROFIT_INVALIDATE, RETROFITS_ENDPOINTS.retrofit(retrofitId)],
    { silentError: true },
  )
}

export function useActivateRetrofit(retrofitId: string) {
  return usePostData<Record<string, never>, RetrofitDetailApi>(
    RETROFITS_ENDPOINTS.activate(retrofitId),
    [...RETROFIT_INVALIDATE, RETROFITS_ENDPOINTS.retrofit(retrofitId)],
    { silentError: true },
  )
}

export function useEngineReleaseRequest(engineId: string) {
  return usePostData<EngineReleaseRequestPayload, EngineDetailApi>(
    ENGINES_ENDPOINTS.releaseRequest(engineId),
    [...ENGINE_INVALIDATE, ENGINES_ENDPOINTS.engine(engineId)],
    { silentError: true },
  )
}

export function useEngineRelease(engineId: string) {
  return usePostData<EngineReleasePayload, EngineDetailApi>(
    ENGINES_ENDPOINTS.release(engineId),
    [...ENGINE_INVALIDATE, ENGINES_ENDPOINTS.engine(engineId)],
    { silentError: true },
  )
}

export { ENGINES_ENDPOINTS, RETROFITS_ENDPOINTS }
