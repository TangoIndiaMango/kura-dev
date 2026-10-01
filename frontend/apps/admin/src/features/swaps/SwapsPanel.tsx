import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Skeleton } from '@mantine/core'
import {
  AdminModuleLayout,
  useAdminModuleControls,
  type TablePaginationConfig,
} from '@shared/components'
import { useUrlTab } from '@shared/hooks/useUrlTab'
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

function cursorPagination(
  cursor: string | undefined,
  nextCursor: string | undefined,
  previousCursor: string | undefined,
  pageSize: number,
  setCursor: (c: string | undefined) => void,
): TablePaginationConfig {
  return {
    page: cursor ? 2 : 1,
    totalPages: nextCursor ? (cursor ? 3 : 2) : cursor ? 2 : 1,
    onPageChange: () => undefined,
    variant: 'controls',
    pageSize: String(pageSize).padStart(2, '0'),
    onNext: nextCursor ? () => setCursor(nextCursor) : undefined,
    onPrevious: previousCursor
      ? () => setCursor(previousCursor)
      : cursor
        ? () => setCursor(undefined)
        : undefined,
  }
}

export function SwapsPanel() {
  const navigate = useNavigate()
  const holdPolicy = readHoldPolicy()
  const [tab, setTab] = useUrlTab('swaps', { valid: ['swaps', 'reservations'] })
  const [swapCursor, setSwapCursor] = useState<string | undefined>()
  const [rsvCursor, setRsvCursor] = useState<string | undefined>()

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

  useEffect(() => {
    setSwapCursor(undefined)
  }, [
    swapsControls.filterValues,
    swapsControls.dateRange.start_date,
    swapsControls.dateRange.end_date,
  ])

  useEffect(() => {
    setRsvCursor(undefined)
  }, [
    reservationsControls.filterValues,
    reservationsControls.search,
    reservationsControls.dateRange.start_date,
    reservationsControls.dateRange.end_date,
  ])

  const {
    swaps,
    isPending: swapsPending,
    isError: swapsError,
    nextCursor: swapNext,
    previousCursor: swapPrev,
  } = useSwaps(
    {
      status: readFilter(swapsControls.filterValues, 'status'),
      hub: readFilter(swapsControls.filterValues, 'hub'),
      payment_mode: readFilter(swapsControls.filterValues, 'payment_mode'),
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
    nextCursor: rsvNext,
    previousCursor: rsvPrev,
  } = useReservations(
    {
      status: readFilter(reservationsControls.filterValues, 'status'),
      hub: readFilter(reservationsControls.filterValues, 'hub'),
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
            {swapsPending ? <Skeleton height={280} radius="md" /> : null}
            {swapsError ? (
              <p className="mb-4 text-[13px] text-[var(--mu)]">
                Could not load swaps (need swaps:read).
              </p>
            ) : null}
            {!swapsPending && !swapsError ? (
              <SwapsSessionsTable
                swaps={swaps}
                pagination={cursorPagination(
                  swapCursor,
                  swapNext,
                  swapPrev,
                  swapsControls.pageSize,
                  setSwapCursor,
                )}
                searchQuery={swapsControls.searchQuery}
                onSearchChange={swapsControls.setSearchQuery}
                onFilter={swapsControls.openFilter}
                onRowClick={(s) => navigate(`/swaps/${s.id}`)}
              />
            ) : null}
          </>
        ) : (
          <>
            {rsvPending ? <Skeleton height={280} radius="md" /> : null}
            {rsvError ? (
              <p className="mb-4 text-[13px] text-[var(--mu)]">
                Could not load reservations.
              </p>
            ) : null}
            {!rsvPending && !rsvError ? (
              <SwapsReservationsTable
                reservations={reservations}
                pagination={cursorPagination(
                  rsvCursor,
                  rsvNext,
                  rsvPrev,
                  reservationsControls.pageSize,
                  setRsvCursor,
                )}
                searchQuery={reservationsControls.searchQuery}
                onSearchChange={reservationsControls.setSearchQuery}
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
