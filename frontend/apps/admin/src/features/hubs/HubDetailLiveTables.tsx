/** Hub detail tabs: live holds, swaps, cash shifts. */
import { Link, useNavigate } from 'react-router-dom'
import { Skeleton } from '@mantine/core'
import {
  DynamicTableSection,
  TableStatusBadge,
  type TableHeader,
} from '@shared/components'
import { formatNaira } from '@shared/utils/currency'
import type { SwapListApi } from '@features/swaps'
import { useHubReservations } from './hooks/use-bay-swap'
import { useHubSwaps } from './hooks/use-hubs'
import { mapReservationApi } from './hubBayLiveMap'

export { HubCashLiveTable } from './HubCashLiveTable'

const SWAP_HEADERS: TableHeader[] = [
  { key: 'when', label: 'WHEN' },
  { key: 'vehicle', label: 'VEHICLE' },
  { key: 'mode', label: 'PAY' },
  { key: 'amount', label: 'AMOUNT' },
  { key: 'status', label: 'STATUS' },
]

export function HubHoldsLiveTable({ hubId }: { hubId: string }) {
  const { reservations, isPending } = useHubReservations(hubId)
  if (isPending) return <Skeleton height={120} radius="md" />
  if (reservations.length === 0) {
    return (
      <p className="text-[13px] text-[var(--mu)]">No active holds at this hub.</p>
    )
  }
  return (
    <ul className="m-0 list-none space-y-2 p-0">
      {reservations.map((r) => {
        const row = mapReservationApi(r)
        return (
          <li
            key={r.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-[10px] border border-[var(--bd)] px-3 py-2 text-[13px]"
          >
            <span>
              <span className="font-semibold">{row.code}</span>
              {' · '}
              {row.vehicleReg}
              {' · '}
              {row.operatorName}
              {' · '}
              {row.expiresIn}
            </span>
            <Link
              to={`/hubs/${hubId}/swap?code=${encodeURIComponent(row.code)}`}
              className="text-[12px] font-bold text-[var(--ac)] underline"
            >
              Open bay
            </Link>
          </li>
        )
      })}
    </ul>
  )
}

export function HubSwapsLiveTable({
  hubId,
  enabled = true,
}: {
  hubId: string
  enabled?: boolean
}) {
  const navigate = useNavigate()
  const { swaps, isPending } = useHubSwaps(hubId, { enabled })
  if (isPending) return <Skeleton height={160} radius="md" />

  return (
    <DynamicTableSection<SwapListApi>
      variant="embedded"
      headers={SWAP_HEADERS}
      data={swaps}
      getRowKey={(row) => row.id}
      toolbar={{ title: 'Hub swap feed', showFilter: false }}
      emptyTitle="No swaps yet"
      emptyMessage="Swaps completed at this hub appear here."
      onRowClick={(row) => navigate(`/swaps/${row.id}`)}
      renderItems={(row) => [
        <span key="w" className="text-xs text-[var(--mu)]">
          {new Date(row.created_at).toLocaleString()}
        </span>,
        <span key="v" className="font-mono text-xs text-[var(--tx)]">
          {row.vehicle_plate ?? '—'}
        </span>,
        <span key="m" className="text-xs text-[var(--mu)]">
          {row.payment_mode}
        </span>,
        <span key="a" className="text-xs font-semibold tabular-nums">
          {formatNaira(row.amount_kobo, { fromKobo: true })}
        </span>,
        <TableStatusBadge
          key="s"
          label={row.status}
          tone={row.status === 'COMPLETED' ? 'success' : 'neutral'}
        />,
      ]}
    />
  )
}
