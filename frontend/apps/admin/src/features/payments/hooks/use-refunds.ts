import { useFetchData } from '@shared/hooks/api'
import { useAdminModuleControls } from '@shared/components'
import {
  ADMIN_LIST_PAGE_SIZE,
  buildCursorPagination,
  cursorFromLink,
} from '@shared/utils/cursor-pagination'
import type { CursorPaginated } from '@features/finance/types'

export const REFUNDS_API = '/finance/refunds/'

export type RefundApi = {
  id: string
  reference: string
  amount_kobo: number
  status: 'REFUND_REVIEW' | 'REFUND_PENDING' | 'REFUNDED' | 'REFUND_REJECTED'
  reason: string
  channel: string
  account: string
  kura_id: string
  account_name: string
  purpose: string
  created_at: string
  updated_at: string
}

export type RefundStatsApi = {
  review_count: number
  review_kobo: number
  approved_count: number
  approved_kobo: number
  sent_count: number
  sent_kobo: number
  rejected_count: number
}

type RefundParams = {
  status?: string
  search?: string
  start_date?: string
  end_date?: string
  cursor?: string
}

function query(params: RefundParams) {
  return {
    ...(params.status ? { status: params.status } : {}),
    ...(params.search ? { search: params.search } : {}),
    ...(params.start_date ? { start_date: params.start_date } : {}),
    ...(params.end_date ? { end_date: params.end_date } : {}),
  }
}

/** Every refund (newest first), narrowed by status, search and date range. */
export function useRefunds(params: RefundParams, options?: { enabled?: boolean }) {
  const q = useFetchData<CursorPaginated<RefundApi>>(
    REFUNDS_API,
    { page_size: ADMIN_LIST_PAGE_SIZE, ...query(params), ...(params.cursor ? { cursor: params.cursor } : {}) },
    { enabled: options?.enabled !== false, keepPreviousData: true, staleTime: 15_000, refetchOnWindowFocus: true },
  )
  return {
    ...q,
    refunds: q.data?.results ?? [],
    nextCursor: cursorFromLink(q.data?.next),
    previousCursor: cursorFromLink(q.data?.previous),
  }
}

/** KPI totals for the same search + date range (all statuses). */
export function useRefundStats(params: RefundParams, options?: { enabled?: boolean }) {
  const q = useFetchData<RefundStatsApi>(`${REFUNDS_API}stats/`, query({ ...params, status: undefined }), {
    enabled: options?.enabled !== false,
    staleTime: 15_000,
    refetchOnWindowFocus: true,
  })
  return { ...q, stats: q.data ?? null }
}

/** Everything the Payments → Refunds tab needs: page, KPIs and pagination. */
export function useRefundsTab(input: {
  enabled: boolean
  status?: string
  cursor: string | undefined
  setCursor: (c: string | undefined) => void
  page: number
  setPage: (p: number) => void
}) {
  const controls = useAdminModuleControls({
    scope: 'payments_refunds',
    statusOptions: [],
    filterTitle: 'Filter refunds',
    includeNameSort: false,
    includeValueSort: false,
    pageSize: ADMIN_LIST_PAGE_SIZE,
  })
  const params = {
    status: input.status,
    search: controls.search || undefined,
    start_date: controls.dateRange.start_date,
    end_date: controls.dateRange.end_date,
  }
  const list = useRefunds({ ...params, cursor: input.cursor }, { enabled: input.enabled })
  const stats = useRefundStats(params, { enabled: input.enabled })
  const pagination = buildCursorPagination({
    page: input.page,
    setPage: input.setPage,
    cursor: input.cursor,
    setCursor: input.setCursor,
    nextCursor: list.nextCursor,
    previousCursor: list.previousCursor,
    isPlaceholderData: list.isPlaceholderData,
    pageSize: ADMIN_LIST_PAGE_SIZE,
  })
  return {
    // The tab's own days — not shared with Payments or Cash.
    dateRange: controls.dateRange,
    dateRangeSlot: controls.dateRangeSlot,
    searchQuery: controls.searchQuery,
    setSearchQuery: controls.setSearchQuery,
    refunds: list.refunds,
    pending: list.isPending,
    pagination,
    stats: stats.stats,
    refresh: () => {
      void list.refetch()
      void stats.refetch()
    },
  }
}
