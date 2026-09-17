import { useFetchData, usePatchData, usePostData } from '@shared/hooks/api'
import { useCapabilities } from '../../auth/useCapabilities'
import { DISCOUNTS_ENDPOINTS } from '../constants'
import type {
  DiscountApi,
  DiscountPatchPayload,
  DiscountRedemptionApi,
  DiscountWritePayload,
  CursorPaginated,
  PageNumberPaginated,
} from '../types'

const INVALIDATE = [DISCOUNTS_ENDPOINTS.list]
const EMPTY: DiscountApi[] = []

export function useDiscounts(
  params?: {
    page?: number
    page_size?: number
    status?: string
    audience?: string
    search?: string
  },
  options?: { enabled?: boolean },
) {
  const { can } = useCapabilities()
  const enabled = options?.enabled !== false && can('tariffs:manage')
  const query = useFetchData<PageNumberPaginated<DiscountApi>>(
    DISCOUNTS_ENDPOINTS.list,
    {
      page: params?.page ?? 1,
      page_size: params?.page_size ?? 25,
      ...(params?.status && params.status !== 'all'
        ? { status: params.status }
        : {}),
      ...(params?.audience && params.audience !== 'all'
        ? { audience: params.audience }
        : {}),
      ...(params?.search ? { search: params.search } : {}),
    },
    { enabled, keepPreviousData: true, staleTime: 30_000 },
  )
  return {
    ...query,
    discounts: query.data?.results ?? EMPTY,
    count: query.data?.count ?? 0,
    totalPages: query.data?.total_pages ?? 1,
    currentPage: query.data?.current_page ?? params?.page ?? 1,
  }
}

export function useDiscount(
  id: string | null | undefined,
  options?: { enabled?: boolean },
) {
  const { can } = useCapabilities()
  const discountId = id ?? ''
  const enabled =
    Boolean(discountId) &&
    options?.enabled !== false &&
    can('tariffs:manage')
  const query = useFetchData<DiscountApi>(
    discountId
      ? DISCOUNTS_ENDPOINTS.discount(discountId)
      : DISCOUNTS_ENDPOINTS.list,
    undefined,
    { enabled, staleTime: 15_000 },
  )
  return { ...query, discount: query.data ?? null }
}

/** Active + scheduled — for operator / tariff assign dropdowns. */
export function useSelectableDiscounts(options?: { enabled?: boolean }) {
  const { discounts, isPending, isError } = useDiscounts(
    { page: 1, page_size: 100, status: undefined },
    options,
  )
  const selectable = discounts.filter(
    (d) => d.status === 'ACTIVE' || d.status === 'SCHEDULED',
  )
  return { discounts: selectable, isPending, isError }
}

export function discountSelectOptionsFrom(
  discounts: DiscountApi[],
  includeNone = false,
) {
  const opts = discounts.map((d) => ({
    value: d.id,
    label: `${d.name} · ${d.code}`,
  }))
  return includeNone ? [{ value: '', label: 'No discount' }, ...opts] : opts
}

export function useCreateDiscount() {
  return usePostData<DiscountWritePayload, DiscountApi>(
    DISCOUNTS_ENDPOINTS.list,
    INVALIDATE,
    { silentError: true },
  )
}

export function useUpdateDiscount(discountId: string) {
  return usePatchData<DiscountPatchPayload, DiscountApi>(
    DISCOUNTS_ENDPOINTS.discount(discountId),
    [...INVALIDATE, DISCOUNTS_ENDPOINTS.discount(discountId)],
    { silentError: true },
  )
}

export function useActivateDiscount(discountId: string) {
  return usePostData<Record<string, never>, DiscountApi>(
    DISCOUNTS_ENDPOINTS.activate(discountId),
    [...INVALIDATE, DISCOUNTS_ENDPOINTS.discount(discountId)],
    { silentError: true },
  )
}

export function useDiscountRedemptions(
  discountId: string | null | undefined,
  options?: { enabled?: boolean },
) {
  const { can } = useCapabilities()
  const id = discountId ?? ''
  const enabled =
    Boolean(id) && options?.enabled !== false && can('tariffs:manage')
  const query = useFetchData<CursorPaginated<DiscountRedemptionApi>>(
    id ? DISCOUNTS_ENDPOINTS.redemptions(id) : DISCOUNTS_ENDPOINTS.list,
    { page_size: 25 },
    { enabled, staleTime: 15_000 },
  )
  return {
    ...query,
    redemptions: query.data?.results ?? [],
  }
}

export { DISCOUNTS_ENDPOINTS }
