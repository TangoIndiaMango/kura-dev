import { useFetchData, usePatchData, usePostData } from '@shared/hooks/api'
import { axiosInstance } from '@lib/api/client'
import { useCapabilities } from '../../auth/useCapabilities'
import { IMPACT_ENDPOINTS, REPORTS_ENDPOINTS } from '../constants'
import type {
  ImpactStatsApi,
  ImpactStoryDetailApi,
  ImpactStoryListApi,
  ImpactStoryWritePayload,
  PageNumberPaginated,
  ReportCreatePayload,
  ReportJobApi,
} from '../types'

const INVALIDATE = [IMPACT_ENDPOINTS.stories, IMPACT_ENDPOINTS.stats]
const EMPTY: ImpactStoryListApi[] = []

function isPendingStatus(status: ReportJobApi['status']): boolean {
  return status === 'QUEUED' || status === 'RUNNING'
}

export function useImpactStats(
  params?: { period?: string },
  options?: { enabled?: boolean },
) {
  const { can } = useCapabilities()
  const enabled = options?.enabled !== false && can('analytics:impact')
  return useFetchData<ImpactStatsApi>(
    IMPACT_ENDPOINTS.stats,
    params?.period ? { period: params.period } : undefined,
    { enabled, staleTime: 60_000 },
  )
}

export function useImpactStories(
  params?: {
    page?: number
    page_size?: number
    status?: string
    search?: string
  },
  options?: { enabled?: boolean },
) {
  const { can } = useCapabilities()
  const enabled = options?.enabled !== false && can('analytics:impact')
  const query = useFetchData<PageNumberPaginated<ImpactStoryListApi>>(
    IMPACT_ENDPOINTS.stories,
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
    stories: query.data?.results ?? EMPTY,
    count: query.data?.count ?? 0,
    totalPages: query.data?.total_pages ?? 1,
    currentPage: query.data?.current_page ?? params?.page ?? 1,
  }
}

export function useImpactStory(
  id: string | null | undefined,
  options?: { enabled?: boolean },
) {
  const { can } = useCapabilities()
  const storyId = id ?? ''
  const enabled =
    Boolean(storyId) &&
    options?.enabled !== false &&
    can('analytics:impact')
  const query = useFetchData<ImpactStoryDetailApi>(
    storyId ? IMPACT_ENDPOINTS.story(storyId) : IMPACT_ENDPOINTS.stories,
    undefined,
    { enabled, staleTime: 15_000 },
  )
  return { ...query, story: query.data ?? null }
}

export function useCreateImpactStory() {
  return usePostData<ImpactStoryWritePayload, ImpactStoryDetailApi>(
    IMPACT_ENDPOINTS.stories,
    INVALIDATE,
    { silentError: true },
  )
}

export function useUpdateImpactStory(id: string) {
  return usePatchData<ImpactStoryWritePayload, ImpactStoryDetailApi>(
    IMPACT_ENDPOINTS.story(id),
    [...INVALIDATE, IMPACT_ENDPOINTS.story(id)],
    { silentError: true },
  )
}

export function usePublishImpactStory(id: string) {
  return usePostData<Record<string, never>, ImpactStoryDetailApi>(
    IMPACT_ENDPOINTS.publish(id),
    [...INVALIDATE, IMPACT_ENDPOINTS.story(id)],
    { silentError: true },
  )
}

export function useCreateReportJob() {
  return usePostData<ReportCreatePayload, ReportJobApi>(
    REPORTS_ENDPOINTS.create,
    undefined,
    { silentError: true },
  )
}

/** Request IMPACT_PDF then download the artefact as a file. */
export async function downloadImpactPdf(period?: string): Promise<void> {
  const { data: job } = await axiosInstance.post<ReportJobApi>(
    REPORTS_ENDPOINTS.create,
    {
      kind: 'IMPACT_PDF',
      params: period ? { period } : {},
      idempotency_key: crypto.randomUUID(),
    },
  )
  let current = job
  for (let i = 0; i < 8 && isPendingStatus(current.status); i++) {
    await new Promise((r) => setTimeout(r, 400))
    const { data } = await axiosInstance.get<ReportJobApi>(
      REPORTS_ENDPOINTS.report(current.id),
    )
    current = data
  }
  if (current.status !== 'READY') {
    throw new Error(
      current.raw?.error ? String(current.raw.error) : 'Report not ready',
    )
  }
  const res = await axiosInstance.get(REPORTS_ENDPOINTS.download(current.id), {
    responseType: 'blob',
  })
  const blob = new Blob([res.data], { type: 'application/pdf' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download =
    (typeof current.raw?.filename === 'string' && current.raw.filename) ||
    `kura-impact-${period || 'latest'}.pdf`
  a.click()
  URL.revokeObjectURL(url)
}

export { IMPACT_ENDPOINTS, REPORTS_ENDPOINTS }
