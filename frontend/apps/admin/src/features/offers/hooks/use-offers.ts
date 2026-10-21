import { useFetchData, usePatchData, usePostData } from '@shared/hooks/api'
import { ADMIN_LIST_PAGE_SIZE } from '@shared/utils/cursor-pagination'
import { useCapabilities } from '../../auth/useCapabilities'
import { OFFERS_ENDPOINTS } from '../constants'
import type {
  OfferAssignPayload,
  OfferDetailApi,
  OfferListApi,
  OfferPatchPayload,
  OfferWritePayload,
  PageNumberPaginated,
} from '../types'

const INVALIDATE = [OFFERS_ENDPOINTS.list]

export function useOffers(
  params?: {
    page?: number
    page_size?: number
    status?: string
    search?: string
  },
  options?: { enabled?: boolean },
) {
  const { can } = useCapabilities()
  const enabled = options?.enabled !== false && can('offers:manage')
  const query = useFetchData<PageNumberPaginated<OfferListApi>>(
    OFFERS_ENDPOINTS.list,
    {
      page: params?.page ?? 1,
      page_size: params?.page_size ?? ADMIN_LIST_PAGE_SIZE,
      ...(params?.status && params.status !== 'all'
        ? { status: params.status }
        : {}),
      ...(params?.search ? { search: params.search } : {}),
    },
    { enabled, keepPreviousData: true, staleTime: 30_000 },
  )
  return {
    ...query,
    offers: query.data?.results ?? [],
    count: query.data?.count ?? 0,
    totalPages: query.data?.total_pages ?? 1,
    currentPage: query.data?.current_page ?? params?.page ?? 1,
  }
}

export function useOffer(
  id: string | null | undefined,
  options?: { enabled?: boolean },
) {
  const { can } = useCapabilities()
  const offerId = id ?? ''
  const enabled =
    Boolean(offerId) && options?.enabled !== false && can('offers:manage')
  const query = useFetchData<OfferDetailApi>(
    offerId ? OFFERS_ENDPOINTS.offer(offerId) : OFFERS_ENDPOINTS.list,
    undefined,
    { enabled, staleTime: 15_000 },
  )
  return { ...query, offer: query.data ?? null }
}

export function useCreateOffer() {
  return usePostData<OfferWritePayload, OfferDetailApi>(
    OFFERS_ENDPOINTS.list,
    INVALIDATE,
    { silentError: true },
  )
}

export function useUpdateOffer(offerId: string) {
  return usePatchData<OfferPatchPayload, OfferDetailApi>(
    OFFERS_ENDPOINTS.offer(offerId),
    [...INVALIDATE, OFFERS_ENDPOINTS.offer(offerId)],
    { silentError: true },
  )
}

export function useAssignOffer(offerId: string) {
  return usePostData<OfferAssignPayload, { assigned: number; assignment_ids: string[] }>(
    OFFERS_ENDPOINTS.assign(offerId),
    [...INVALIDATE, OFFERS_ENDPOINTS.offer(offerId)],
    { silentError: true },
  )
}

export { OFFERS_ENDPOINTS }
