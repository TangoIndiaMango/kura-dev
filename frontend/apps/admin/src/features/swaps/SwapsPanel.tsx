import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AdminModuleLayout,
  useAdminModuleControls,
  LoadingState,
} from '@shared/components'
import { useUrlTab } from '@shared/hooks/useUrlTab'
import {
  ADMIN_LIST_PAGE_SIZE,
  buildCursorPagination,
} from '@shared/utils/cursor-pagination'
import { useHubs } from '@features/hubs'
import { readHoldPolicy } from './holdPolicy'
import { useReservations, useSwaps } from './hooks/use-swaps'
import { SwapsReservationsTable, SwapsSessionsTable } from './SwapsTables'
import { reservationUiStatus } from './types'

const SWAP_STATUS_OPTIONS = [
  { value: 'STARTED', label: 'Started' },
  { value: 'RETURN_RECORDED', label: 'Return recorded' },
  { value: 'ISSUED', label: 'Issued' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'FAILED', label: 'Failed' },
  { value: 'REVERSED', label: 'Reversed' },
]

const RSV_STATUS_OPTIONS = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'EXPIRED', label: 'Expired' },
  { value: 'CANCELLED', label: 'Cancelled' },
  { value: 'USED', label: 'Used' },
]

function readFilter(
  values: Record<string, unknown>,
  key: string,
): string | undefined {
  const raw =
    key in values
      ? values[key]
      : Object.entries(values).find(
          ([k]) => k === key || k.endsWith(`_${key}`),
        )?.[1]
  if (raw == null || raw === '' || raw === 'all') return undefined
  if (Array.isArray(raw)) return raw.length ? String(raw[0]) : undefined
  return String(raw)
}

export function SwapsPanel() {
  const navigate = useNavigate()
  const holdPolicy = readHoldPolicy()
  const [tab, setTab] = useUrlTab('swaps', { valid: ['swaps', 'reservations'] })
  const [swapCursor, setSwapCursor] = useState<string | undefined>()
  const [swapPage, setSwapPage] = useState(1)
  const [rsvCursor, setRsvCursor] = useState<string | undefined>()
  const [rsvPage, setRsvPage] = useState(1)

  const { hubs } = useHubs({ page_size: 100 }, { enabled: true })
  const hubOptions = useMemo(
    () => hubs.map((h) => ({ value: h.id, label: `${h.code} · ${h.name}` })),
    [hubs],
  )

  const swapsControls = useAdminModuleControls({
    scope: 'swaps',
    statusOptions: SWAP_STATUS_OPTIONS,
    filterTitle: 'Filter swaps',
    includeNameSort: false,
    includeValueSort: false,
    pageSize: ADMIN_LIST_PAGE_SIZE,
    extraFilterFields: [
      {
        type: 'select',
        key: 'hub',
        label: 'Station',
        placeholder: 'Any hub',
        options: hubOptions,
      },
      {
        type: 'select',
        key: 'payment_mode',
        label: 'Payment',
        placeholder: 'Any',
        options: [
          { value: 'PLAN', label: 'Plan' },
          { value: 'WALLET', label: 'Wallet' },
          { value: 'CREDIT', label: 'Credit' },
          { value: 'CASH', label: 'Cash' },
        ],
      },
    ],
  })
  const reservationsControls = useAdminModuleControls({
    scope: 'swaps_reservations',
    statusOptions: RSV_STATUS_OPTIONS,
    filterTitle: 'Filter reservations',
    includeNameSort: false,
    includeValueSort: false,
    pageSize: ADMIN_LIST_PAGE_SIZE,
    extraFilterFields: [
      {
        type: 'select',
        key: 'hub',
        label: 'Hub',
        placeholder: 'Any hub',
        options: hubOptions,
      },
    ],
  })
  const controls = tab === 'swaps' ? swapsControls : reservationsControls

  const swapStatus = readFilter(swapsControls.filterValues, 'status')
  const swapHub = readFilter(swapsControls.filterValues, 'hub')
  const swapPayMode = readFilter(swapsControls.filterValues, 'payment_mode')
  const rsvStatus = readFilter(reservationsControls.filterValues, 'status')
  const rsvHub = readFilter(reservationsControls.filterValues, 'hub')

  useEffect(() => {
    setSwapCursor(undefined)
    setSwapPage(1)
  }, [
    swapStatus,
    swapHub,
    swapPayMode,
    swapsControls.dateRange.start_date,
    swapsControls.dateRange.end_date,
  ])

  useEffect(() => {
    setRsvCursor(undefined)
    setRsvPage(1)
  }, [
    rsvStatus,
    rsvHub,
    reservationsControls.search,
    reservationsControls.dateRange.start_date,
    reservationsControls.dateRange.end_date,
  ])

  const {
    swaps,
    isPending: swapsPending,
    isError: swapsError,
    isPlaceholderData: swapsPlaceholder,
    nextCursor: swapNext,
    previousCursor: swapPrev,
  } = useSwaps(
    {
      status: swapStatus,
      hub: swapHub,
      payment_mode: swapPayMode,
      start_date: swapsControls.dateRange.start_date || undefined,
      end_date: swapsControls.dateRange.end_date || undefined,
      cursor: swapCursor,
      page_size: swapsControls.pageSize,
    },
    { enabled: tab === 'swaps' },
  )

  const {
    reservations,
    isPending: rsvPending,
    isError: rsvError,
    isPlaceholderData: rsvPlaceholder,
    nextCursor: rsvNext,
    previousCursor: rsvPrev,
  } = useReservations(
    {
      status: rsvStatus,
      hub: rsvHub,
      code: reservationsControls.search.trim() || undefined,
      start_date: reservationsControls.dateRange.start_date || undefined,
      end_date: reservationsControls.dateRange.end_date || undefined,
      cursor: rsvCursor,
      page_size: reservationsControls.pageSize,
    },
    { enabled: tab === 'reservations' },
  )

  const planCovered = swaps.filter((s) => s.payment_mode === 'PLAN').length
  const overrides = swaps.filter((s) => Boolean(s.override_id)).length
  const mismatches = swaps.filter((s) => s.mismatch_flag).length
  const activeHolds = reservations.filter((r) => {
    return reservationUiStatus(r.status, r.expires_at) === 'ACTIVE'
  }).length
  const expiredHolds = reservations.filter(
    (r) => reservationUiStatus(r.status, r.expires_at) === 'EXPIRED',
  ).length

  const swapKpis = [
    { title: 'This page', value: swaps.length, sub: 'Sessions loaded' },
    {
      title: 'Plan covered',
      value: planCovered,
      sub: 'On allowance (page)',
      tone: 'success' as const,
    },
    {
      title: 'Hold window',
      value: `${holdPolicy.defaultHoldMinutes}m`,
      sub: 'Default bay reserve',
    },
    {
      title: 'Overrides / mismatch',
      value: `${overrides} / ${mismatches}`,
      sub: 'On this page',
      tone: (overrides + mismatches > 0 ? 'warning' : 'default') as
        | 'warning'
        | 'default',
    },
  ]

  const swapsPagination = buildCursorPagination({
    page: swapPage,
    setPage: setSwapPage,
    cursor: swapCursor,
    setCursor: setSwapCursor,
    nextCursor: swapNext,
    previousCursor: swapPrev,
    isPlaceholderData: swapsPlaceholder,
    pageSize: ADMIN_LIST_PAGE_SIZE,
  })
  const rsvPagination = buildCursorPagination({
    page: rsvPage,
    setPage: setRsvPage,
    cursor: rsvCursor,
    setCursor: setRsvCursor,
    nextCursor: rsvNext,
    previousCursor: rsvPrev,
    isPlaceholderData: rsvPlaceholder,
    pageSize: ADMIN_LIST_PAGE_SIZE,
  })

  const reservationKpis = [
    {
      title: 'This page',
      value: rsvPending ? '—' : reservations.length,
      sub: 'Holds loaded',
    },
    {
      title: 'Active',
      value: rsvPending ? '—' : activeHolds,
      sub: 'Pending / confirmed',
      tone: 'success' as const,
    },
    {
      title: 'Expired',
      value: rsvPending ? '—' : expiredHolds,
      sub: 'On this page',
      tone: expiredHolds > 0 ? ('warning' as const) : ('default' as const),
    },
    {
      title: 'Hold window',
      value: `${holdPolicy.defaultHoldMinutes}m`,
      sub: 'Default bay reserve',
    },
  ]

  return (
    <>
      <AdminModuleLayout
        title="Swaps"
        subtitle="Reservations and completed swaps across the network"
        dateRangeSlot={controls.dateRangeSlot}
        tabs={[
          { id: 'swaps', label: 'Swaps' },
          { id: 'reservations', label: 'Reservations' },
        ]}
        activeTab={tab}
        onTabChange={setTab}
        kpis={tab === 'swaps' ? swapKpis : reservationKpis}
      >
        {tab === 'swaps' ? (
          <>
            {swapsPending ? <LoadingState cols={6} rows={8} /> : null}
            {swapsError ? (
              <p className="mb-4 text-[13px] text-[var(--mu)]">
                Could not load swaps (need swaps:read).
              </p>
            ) : null}
            {!swapsPending && !swapsError ? (
              <SwapsSessionsTable
                swaps={swaps}
                pagination={swapsPagination}
                searchQuery={swapsControls.searchQuery}
                onSearchChange={(v) => {
                  setSwapCursor(undefined)
                  setSwapPage(1)
                  swapsControls.setSearchQuery(v)
                }}
                onFilter={swapsControls.openFilter}
                onRowClick={(s) => navigate(`/swaps/${s.id}`)}
              />
            ) : null}
          </>
        ) : (
          <>
            {rsvPending ? <LoadingState cols={6} rows={8} /> : null}
            {rsvError ? (
              <p className="mb-4 text-[13px] text-[var(--mu)]">
                Could not load reservations.
              </p>
            ) : null}
            {!rsvPending && !rsvError ? (
              <SwapsReservationsTable
                reservations={reservations}
                pagination={rsvPagination}
                searchQuery={reservationsControls.searchQuery}
                onSearchChange={(v) => {
                  setRsvCursor(undefined)
                  setRsvPage(1)
                  reservationsControls.setSearchQuery(v)
                }}
                onFilter={reservationsControls.openFilter}
                onRowClick={(r) => navigate(`/swaps/${r.id}`)}
                onAttend={(r) =>
                  navigate(
                    `/hubs/${r.hub}/swap?code=${encodeURIComponent(r.code)}`,
                  )
                }
                onOpenHubs={() => navigate('/hubs')}
              />
            ) : null}
          </>
        )}
      </AdminModuleLayout>
      {swapsControls.filterModal}
      {reservationsControls.filterModal}
    </>
  )
}
