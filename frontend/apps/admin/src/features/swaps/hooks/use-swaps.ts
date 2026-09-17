import { useFetchData, usePostData } from '@shared/hooks/api'
import { useCapabilities } from '../../auth/useCapabilities'
import { SWAPS_ENDPOINTS } from '../constants'
import type {
  CursorPaginated,
  ReservationListApi,
  SwapAbortPayload,
  SwapDetailApi,
  SwapListApi,
  SwapReversePayload,
} from '../types'

const INVALIDATE = [SWAPS_ENDPOINTS.list, SWAPS_ENDPOINTS.reservations]
const EMPTY_SWAPS: SwapListApi[] = []
const EMPTY_RESERVATIONS: ReservationListApi[] = []

function cursorFromLink(link: string | null | undefined): string | undefined {
  if (!link) return undefined
  try {
    return new URL(link).searchParams.get('cursor') ?? undefined
  } catch {
    return undefined
  }
}

export function useSwaps(
  params?: {
    status?: string
    payment_mode?: string
    hub?: string
    account?: string
    cursor?: string
    page_size?: number
  },
  options?: { enabled?: boolean },
) {
  const { can } = useCapabilities()
  const enabled = options?.enabled !== false && can('swaps:read')
  const query = useFetchData<CursorPaginated<SwapListApi>>(
    SWAPS_ENDPOINTS.list,
    {
      page_size: params?.page_size ?? 25,
      ...(params?.status && params.status !== 'all'
        ? { status: params.status }
        : {}),
      ...(params?.payment_mode && params.payment_mode !== 'all'
        ? { payment_mode: params.payment_mode }
        : {}),
      ...(params?.hub ? { hub: params.hub } : {}),
      ...(params?.account ? { account: params.account } : {}),
      ...(params?.cursor ? { cursor: params.cursor } : {}),
    },
    { enabled, keepPreviousData: true, staleTime: 30_000 },
  )
  const next = query.data?.next ?? null
  const previous = query.data?.previous ?? null
  return {
    ...query,
    swaps: query.data?.results ?? EMPTY_SWAPS,
    next,
    previous,
    nextCursor: cursorFromLink(next),
    previousCursor: cursorFromLink(previous),
  }
}

export function useSwap(
  id: string | null | undefined,
  options?: { enabled?: boolean },
) {
  const { can } = useCapabilities()
  const swapId = id ?? ''
  const enabled =
    Boolean(swapId) && options?.enabled !== false && can('swaps:read')
  const query = useFetchData<SwapDetailApi>(
    swapId ? SWAPS_ENDPOINTS.swap(swapId) : SWAPS_ENDPOINTS.list,
    undefined,
    { enabled, staleTime: 15_000 },
  )
  return { ...query, swap: query.data ?? null }
}

export function useReverseSwap(swapId: string) {
  return usePostData<SwapReversePayload, SwapDetailApi>(
    SWAPS_ENDPOINTS.reverse(swapId),
    [...INVALIDATE, SWAPS_ENDPOINTS.swap(swapId)],
    { silentError: true },
  )
}

export function useAbortSwap(swapId: string) {
  return usePostData<SwapAbortPayload, SwapDetailApi>(
    SWAPS_ENDPOINTS.abort(swapId),
    [...INVALIDATE, SWAPS_ENDPOINTS.swap(swapId)],
    { silentError: true },
  )
}

export function useCancelReservation(reservationId: string) {
  return usePostData<{ reason?: string }, { status: string; id: string }>(
    SWAPS_ENDPOINTS.reservationCancel(reservationId),
    [...INVALIDATE, SWAPS_ENDPOINTS.reservation(reservationId)],
    { silentError: true },
  )
}

export function useExtendReservation(reservationId: string) {
  return usePostData<
    { minutes: number; reason?: string },
    ReservationListApi
  >(SWAPS_ENDPOINTS.reservationExtend(reservationId), [
    ...INVALIDATE,
    SWAPS_ENDPOINTS.reservation(reservationId),
  ], { silentError: true })
}

export function useReservations(
  params?: {
    status?: string
    hub?: string
    code?: string
    cursor?: string
    page_size?: number
  },
  options?: { enabled?: boolean },
) {
  const { can } = useCapabilities()
  const enabled =
    options?.enabled !== false && can('swaps:read')
  const query = useFetchData<CursorPaginated<ReservationListApi>>(
    SWAPS_ENDPOINTS.reservations,
    {
      page_size: params?.page_size ?? 25,
      ...(params?.status && params.status !== 'all'
        ? { status: params.status }
        : {}),
      ...(params?.hub ? { hub: params.hub } : {}),
      ...(params?.code ? { code: params.code } : {}),
      ...(params?.cursor ? { cursor: params.cursor } : {}),
    },
    { enabled, keepPreviousData: true, staleTime: 30_000 },
  )
  const next = query.data?.next ?? null
  const previous = query.data?.previous ?? null
  return {
    ...query,
    reservations: query.data?.results ?? EMPTY_RESERVATIONS,
    next,
    previous,
    nextCursor: cursorFromLink(next),
    previousCursor: cursorFromLink(previous),
  }
}

export function useReservation(
  id: string | null | undefined,
  options?: { enabled?: boolean },
) {
  const { can } = useCapabilities()
  const reservationId = id ?? ''
  const enabled =
    Boolean(reservationId) &&
    options?.enabled !== false &&
    can('swaps:read')
  const query = useFetchData<ReservationListApi>(
    reservationId
      ? SWAPS_ENDPOINTS.reservation(reservationId)
      : SWAPS_ENDPOINTS.reservations,
    undefined,
    { enabled, staleTime: 15_000 },
  )
  return { ...query, reservation: query.data ?? null }
}

export { SWAPS_ENDPOINTS }
