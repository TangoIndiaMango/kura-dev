import { Button } from '@mantine/core'
import {
  DynamicTableSection,
  TableStatusBadge,
  type TableHeader,
  type TablePaginationConfig,
} from '@shared/components'
import { downloadCsv } from '@shared/utils/downloadCsv'
import { reservationStatusTone, swapStatusTone } from './swapDetailHelpers'
import type { ReservationListApi, SwapListApi } from './types'
import {
  expiresInLabel,
  formatSwapWhen,
  reservationUiStatus,
  swapAmountLabel,
  swapShortCode,
  swapUiLabel,
} from './types'

export const SWAP_HEADERS: TableHeader[] = [
  { key: 'code', label: 'CODE' },
  { key: 'time', label: 'TIME' },
  { key: 'driver', label: 'OPERATOR' },
  { key: 'hub', label: 'STATION' },
  { key: 'battery', label: 'IN → OUT' },
  { key: 'payment', label: 'PAYMENT' },
  { key: 'status', label: 'STATUS' },
]

export const RSV_HEADERS: TableHeader[] = [
  { key: 'code', label: 'CODE' },
  { key: 'time', label: 'TIME' },
  { key: 'driver', label: 'OPERATOR' },
  { key: 'hub', label: 'HUB' },
  { key: 'vehicle', label: 'VEHICLE' },
  { key: 'expires', label: 'EXPIRES' },
  { key: 'status', label: 'STATUS' },
]

export function SwapsSessionsTable({
  swaps,
  pagination,
  searchQuery,
  onSearchChange,
  onFilter,
  onRowClick,
}: {
  swaps: SwapListApi[]
  pagination: TablePaginationConfig
  searchQuery: string
  onSearchChange: (v: string) => void
  onFilter: () => void
  onRowClick: (s: SwapListApi) => void
}) {
  return (
    <DynamicTableSection<SwapListApi>
      variant="embedded"
      headers={SWAP_HEADERS}
      data={swaps}
      pagination={pagination}
      getRowKey={(s) => s.id}
      toolbar={{
        title: 'Swap sessions',
        searchQuery,
        onSearchChange,
        searchPlaceholder: 'Filter by status / hub…',
        onFilter,
        showFilter: true,
        onExport: () =>
          downloadCsv(
            'swaps.csv',
            [
              'id',
              'created_at',
              'driver_phone',
              'hub',
              'returned',
              'issued',
              'payment_mode',
              'amount_kobo',
              'status',
            ],
            swaps.map((s) => [
              s.id,
              s.created_at,
              s.driver_phone ?? '',
              s.hub_name ?? s.hub_code ?? '',
              s.returned_serial ?? '',
              s.issued_serial ?? '',
              s.payment_mode,
              String(s.amount_kobo),
              s.status,
            ]),
          ),
      }}
      onRowClick={onRowClick}
      emptyTitle="No swaps"
      emptyMessage="Bay sessions appear here — including in-progress and incomplete holds."
      renderItems={(s) => [
        <span key="code" className="font-mono text-xs font-bold text-[var(--pr)]">
          {swapShortCode(s.id)}
        </span>,
        <span key="time" className="font-mono text-xs text-[var(--mu)]">
          {formatSwapWhen(s.created_at)}
        </span>,
        <div key="op" className="flex min-w-0 flex-col">
          <span className="truncate text-xs font-bold text-[var(--tx)]">
            {s.vehicle_plate || '—'}
          </span>
          <span className="text-[10px] text-[var(--mu)]">
            {s.driver_phone || '—'}
          </span>
        </div>,
        <span key="hub" className="max-w-xs truncate text-xs text-[var(--tx)]">
          {s.hub_name || s.hub_code || '—'}
        </span>,
        <span key="bat" className="font-mono text-xs text-[var(--mu)]">
          {s.returned_serial || '—'} → {s.issued_serial || '—'}
        </span>,
        <span key="pay" className="text-xs text-[var(--tx)]">
          {swapAmountLabel(s)}
        </span>,
        <TableStatusBadge
          key="st"
          label={swapUiLabel(s)}
          tone={swapStatusTone(s.ui_status || s.status)}
        />,
      ]}
    />
  )
}

export function SwapsReservationsTable({
  reservations,
  pagination,
  searchQuery,
  onSearchChange,
  onFilter,
  onRowClick,
  onAttend,
  onOpenHubs,
}: {
  reservations: ReservationListApi[]
  pagination: TablePaginationConfig
  searchQuery: string
  onSearchChange: (v: string) => void
  onFilter: () => void
  onRowClick: (r: ReservationListApi) => void
  onAttend: (r: ReservationListApi) => void
  onOpenHubs: () => void
}) {
  return (
    <DynamicTableSection<ReservationListApi>
      variant="embedded"
      headers={RSV_HEADERS}
      data={reservations}
      pagination={pagination}
      getRowKey={(r) => r.id}
      toolbar={{
        title: 'Reservations',
        searchQuery,
        onSearchChange,
        searchPlaceholder: 'Exact hold code…',
        onFilter,
        showFilter: true,
        actions: (
          <Button color="brand" onClick={onOpenHubs}>
            Open hubs
          </Button>
        ),
        onExport: () =>
          downloadCsv(
            'reservations.csv',
            [
              'code',
              'created_at',
              'driver',
              'hub',
              'vehicle',
              'expires_at',
              'status',
            ],
            reservations.map((r) => [
              r.code,
              r.created_at,
              r.driver_name,
              r.hub_name,
              r.vehicle_plate,
              r.expires_at,
              r.status,
            ]),
          ),
      }}
      onRowClick={onRowClick}
      emptyTitle="No holds"
      emptyMessage="Bay holds and reservations appear here. Use Filter to narrow by status."
      renderItems={(r) => {
        const ui = reservationUiStatus(r.status, r.expires_at)
        return [
          <span
            key="code"
            className="font-mono text-xs font-bold text-[var(--pr)]"
          >
            {r.code}
          </span>,
          <span key="time" className="font-mono text-xs text-[var(--mu)]">
            {formatSwapWhen(r.created_at)}
          </span>,
          <span key="op" className="text-xs font-bold text-[var(--tx)]">
            {r.driver_name || '—'}
          </span>,
          <span key="hub" className="max-w-xs truncate text-xs text-[var(--tx)]">
            {r.hub_name || r.hub_code}
          </span>,
          <span key="veh" className="font-mono text-xs text-[var(--tx)]">
            {r.vehicle_plate}
          </span>,
          <span key="exp" className="text-xs text-[var(--mu)]">
            {expiresInLabel(r.expires_at)}
          </span>,
          <div key="st" className="flex items-center gap-2">
            <TableStatusBadge label={ui} tone={reservationStatusTone(ui)} />
            {ui === 'ACTIVE' ? (
              <button
                type="button"
                className="text-[11px] font-semibold text-[var(--pr)] hover:underline"
                onClick={(e) => {
                  e.stopPropagation()
                  onAttend(r)
                }}
              >
                Attend
              </button>
            ) : null}
          </div>,
        ]
      }}
    />
  )
}
