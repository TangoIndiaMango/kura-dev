import { Link, useNavigate } from 'react-router-dom'
import { Skeleton } from '@mantine/core'
import {
  DynamicTableSection,
  TableStatusBadge,
  type TableHeader,
} from '@shared/components'
import { formatNaira } from '@shared/utils/currency'
import type {
  VehicleReservationRow,
  VehicleSwapRow,
} from './hooks/use-vehicles'
import { reservationUiStatus } from '@features/swaps'

const SWAP_HEADERS: TableHeader[] = [
  { key: 'when', label: 'WHEN' },
  { key: 'hub', label: 'HUB' },
  { key: 'in', label: 'IN' },
  { key: 'out', label: 'OUT' },
  { key: 'mode', label: 'PAY' },
  { key: 'amount', label: 'AMOUNT' },
  { key: 'status', label: 'STATUS' },
]

const HOLD_HEADERS: TableHeader[] = [
  { key: 'code', label: 'CODE' },
  { key: 'hub', label: 'HUB' },
  { key: 'mode', label: 'PAY' },
  { key: 'expires', label: 'EXPIRES' },
  { key: 'status', label: 'STATUS' },
]

function formatWhen(iso: string) {
  try {
    return new Date(iso).toLocaleString()
  } catch {
    return iso
  }
}

export function VehicleSwapsTable({
  swaps,
  isPending,
}: {
  swaps: VehicleSwapRow[]
  isPending?: boolean
}) {
  const navigate = useNavigate()
  if (isPending) return <Skeleton height={160} radius="md" />

  return (
    <DynamicTableSection<VehicleSwapRow>
      variant="embedded"
      headers={SWAP_HEADERS}
      data={swaps}
      getRowKey={(row) => row.id}
      toolbar={{ title: 'Swap history', showFilter: false }}
      emptyTitle="No swaps yet"
      emptyMessage="Completed and in-progress swaps for this vehicle appear here."
      onRowClick={(row) => navigate(`/swaps/${row.id}`)}
      renderItems={(row) => [
        <span key="w" className="text-xs text-[var(--mu)]">
          {formatWhen(row.created_at)}
        </span>,
        <span key="h" className="font-mono text-xs text-[var(--tx)]">
          {row.hub_code ?? row.hub_name ?? '—'}
        </span>,
        <span key="in" className="font-mono text-xs text-[var(--mu)]">
          {row.returned_serial
            ? `${row.returned_serial} · ${row.returned_charge_pct}%`
            : '—'}
        </span>,
        <span key="out" className="font-mono text-xs text-[var(--mu)]">
          {row.issued_serial
            ? `${row.issued_serial} · ${row.issued_charge_pct}%`
            : '—'}
        </span>,
        <span key="m" className="text-xs text-[var(--mu)]">
          {row.payment_mode}
        </span>,
        <span key="a" className="text-xs font-semibold tabular-nums">
          {formatNaira(row.amount_kobo, { fromKobo: true })}
        </span>,
        <TableStatusBadge
          key="s"
          label={row.mismatch_flag ? `${row.status} · mismatch` : row.status}
          tone={
            row.mismatch_flag
              ? 'warning'
              : row.status === 'COMPLETED'
                ? 'success'
                : 'neutral'
          }
        />,
      ]}
    />
  )
}

export function VehicleHoldsTable({
  reservations,
  isPending,
}: {
  reservations: VehicleReservationRow[]
  isPending?: boolean
}) {
  const navigate = useNavigate()
  if (isPending) return <Skeleton height={160} radius="md" />

  return (
    <DynamicTableSection<VehicleReservationRow>
      variant="embedded"
      headers={HOLD_HEADERS}
      data={reservations}
      getRowKey={(row) => row.id}
      toolbar={{ title: 'Holds', showFilter: false }}
      emptyTitle="No holds"
      emptyMessage="Bay holds for this vehicle appear here."
      getRowHref={(row) => `/swaps/${row.id}`}
      onRowClick={(row) => navigate(`/swaps/${row.id}`)}
      renderItems={(row) => {
        const ui = reservationUiStatus(row.status, row.expires_at)
        return [
          <Link
            key="c"
            to={`/swaps/${row.id}`}
            className="font-mono text-xs font-semibold text-[var(--pr)] hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            {row.code}
          </Link>,
          <span key="h" className="font-mono text-xs text-[var(--tx)]">
            {row.hub_code || row.hub_name}
          </span>,
          <span key="m" className="text-xs text-[var(--mu)]">
            {row.payment_mode}
          </span>,
          <span key="e" className="text-xs text-[var(--mu)]">
            {formatWhen(row.expires_at)}
          </span>,
          <TableStatusBadge
            key="s"
            label={ui}
            tone={
              ui === 'ACTIVE'
                ? 'success'
                : ui === 'EXPIRED'
                  ? 'warning'
                  : 'neutral'
            }
          />,
        ]
      }}
    />
  )
}
