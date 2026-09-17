import { useFetchData, usePatchData, usePostData } from '@shared/hooks/api'
import { useCapabilities } from '../../auth/useCapabilities'
import { SEGMENTS_ENDPOINTS } from '../constants'
import type {
  PageNumberPaginated,
  SegmentCriteria,
  SegmentDetailApi,
  SegmentListApi,
  SegmentMemberApi,
  SegmentPatchPayload,
  SegmentPreviewApi,
  SegmentWritePayload,
} from '../types'

const INVALIDATE = [SEGMENTS_ENDPOINTS.list]
const EMPTY: SegmentListApi[] = []
const EMPTY_MEMBERS: SegmentMemberApi[] = []

export function useSegments(
  params?: {
    page?: number
    page_size?: number
    status?: string
    search?: string
  },
  options?: { enabled?: boolean },
) {
  const { can } = useCapabilities()
  const enabled = options?.enabled !== false && can('segments:manage')
  const query = useFetchData<PageNumberPaginated<SegmentListApi>>(
    SEGMENTS_ENDPOINTS.list,
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
    segments: query.data?.results ?? EMPTY,
    count: query.data?.count ?? 0,
    totalPages: query.data?.total_pages ?? 1,
    currentPage: query.data?.current_page ?? params?.page ?? 1,
  }
}

export function useSegment(
  id: string | null | undefined,
  options?: { enabled?: boolean },
) {
  const { can } = useCapabilities()
  const segmentId = id ?? ''
  const enabled =
    Boolean(segmentId) &&
    options?.enabled !== false &&
    can('segments:manage')
  const query = useFetchData<SegmentDetailApi>(
    segmentId ? SEGMENTS_ENDPOINTS.segment(segmentId) : SEGMENTS_ENDPOINTS.list,
    undefined,
    { enabled, staleTime: 15_000 },
  )
  return { ...query, segment: query.data ?? null }
}

export function useSegmentMembers(
  id: string | null | undefined,
  params?: { page?: number; page_size?: number },
  options?: { enabled?: boolean },
) {
  const { can } = useCapabilities()
  const segmentId = id ?? ''
  const enabled =
    Boolean(segmentId) &&
    options?.enabled !== false &&
    can('segments:manage')
  const query = useFetchData<PageNumberPaginated<SegmentMemberApi>>(
    segmentId ? SEGMENTS_ENDPOINTS.members(segmentId) : SEGMENTS_ENDPOINTS.list,
    {
      page: params?.page ?? 1,
      page_size: params?.page_size ?? 25,
    },
    { enabled, keepPreviousData: true, staleTime: 15_000 },
  )
  return {
    ...query,
    members: query.data?.results ?? EMPTY_MEMBERS,
    count: query.data?.count ?? 0,
    totalPages: query.data?.total_pages ?? 1,
    currentPage: query.data?.current_page ?? params?.page ?? 1,
  }
}

export function useCreateSegment() {
  return usePostData<SegmentWritePayload, SegmentDetailApi>(
    SEGMENTS_ENDPOINTS.list,
    INVALIDATE,
    { silentError: true },
  )
}

export function useUpdateSegment(segmentId: string) {
  return usePatchData<SegmentPatchPayload, SegmentDetailApi>(
    SEGMENTS_ENDPOINTS.segment(segmentId),
    [...INVALIDATE, SEGMENTS_ENDPOINTS.segment(segmentId)],
    { silentError: true },
  )
}

export function usePreviewSegment() {
  return usePostData<{ criteria: SegmentCriteria }, SegmentPreviewApi>(
    SEGMENTS_ENDPOINTS.preview,
    [],
    { silentError: true },
  )
}

export function useRefreshSegment(segmentId: string) {
  return usePostData<Record<string, never>, SegmentDetailApi>(
    SEGMENTS_ENDPOINTS.refresh(segmentId),
    [
      ...INVALIDATE,
      SEGMENTS_ENDPOINTS.segment(segmentId),
      SEGMENTS_ENDPOINTS.members(segmentId),
    ],
    { silentError: true },
  )
}

export { SEGMENTS_ENDPOINTS }
