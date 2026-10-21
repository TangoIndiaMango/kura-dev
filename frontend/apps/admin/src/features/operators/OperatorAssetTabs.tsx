import {
  DynamicTableSection,
  LoadingState,
  TableStatusBadge,
  type TableHeader,
} from '@shared/components'
import { formatNaira } from '@shared/utils/currency'
import {
  useAccountSubscriptions,
  useAccountSwaps,
  useAccountVehicles,
  type SubscriptionListApi,
  type SwapListApi,
  type VehicleListApi,
} from '@features/mobility'
import type { OperatorRecord } from './types'

const VEHICLE_HEADERS: TableHeader[] = [
  { key: 'plate', label: 'PLATE' },
  { key: 'model', label: 'MODEL' },
  { key: 'type', label: 'TYPE' },
  { key: 'battery', label: 'BATTERY' },
  { key: 'driver', label: 'DRIVER' },
  { key: 'status', label: 'STATUS' },
]

const PLAN_HEADERS: TableHeader[] = [
  { key: 'plan', label: 'PLAN' },
  { key: 'vehicle', label: 'VEHICLE' },
  { key: 'period', label: 'PERIOD' },
  { key: 'swaps', label: 'SWAPS' },
  { key: 'ends', label: 'ENDS' },
  { key: 'status', label: 'STATUS' },
]

const SWAP_HEADERS: TableHeader[] = [
  { key: 'when', label: 'WHEN' },
  { key: 'hub', label: 'HUB' },
  { key: 'vehicle', label: 'VEHICLE' },
  { key: 'mode', label: 'MODE' },
  { key: 'amount', label: 'AMOUNT' },
  { key: 'status', label: 'STATUS' },
]

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function formatWhen(iso: string): string {
  return new Date(iso).toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function batteryLabel(row: VehicleListApi): string {
  if (!row.current_battery_serial) return '—'
  if (row.current_battery_charge == null) return row.current_battery_serial
  return `${row.current_battery_serial} · ${row.current_battery_charge}%`
}

export function OperatorVehiclesTab({ operator }: { operator: OperatorRecord }) {
  const { vehicles, isPending, isError } = useAccountVehicles(operator.id)

  if (isPending) return <LoadingState variant="inline" cols={6} rows={5} />
  if (isError) {
    return (
      <p className="text-[13px] text-[var(--mu)]">
        Could not load vehicles for this account.
      </p>
    )
  }

  return (
    <DynamicTableSection<VehicleListApi>
      variant="embedded"
      headers={VEHICLE_HEADERS}
      data={vehicles}
      getRowKey={(row) => row.id}
      toolbar={{ title: 'Vehicles', showFilter: false }}
      emptyTitle="No vehicles"
      emptyMessage="Vehicles registered to this account appear here (GET /mobility/vehicles/?account=)."
      renderItems={(row) => [
        <span key="p" className="font-mono text-xs font-semibold text-[var(--tx)]">
          {row.registration_plate}
        </span>,
        <span key="m" className="text-xs text-[var(--tx)]">
          {row.make} {row.model_name}
        </span>,
        <span key="t" className="text-xs text-[var(--mu)]">
          {row.vehicle_type}
        </span>,
        <span key="b" className="text-xs text-[var(--mu)]">
          {batteryLabel(row)}
        </span>,
        <span key="dr" className="text-xs text-[var(--mu)]">
          {row.assigned_driver_name || 'Any'}
        </span>,
        <TableStatusBadge
          key="s"
          label={row.status}
          tone={row.status === 'ACTIVE' ? 'success' : 'neutral'}
        />,
      ]}
    />
  )
}

export function OperatorPlansTab({ operator }: { operator: OperatorRecord }) {
  const { subscriptions, isPending, isError } = useAccountSubscriptions(operator.id)

  if (isPending) return <LoadingState variant="inline" cols={6} rows={5} />
  if (isError) {
    return (
      <p className="text-[13px] text-[var(--mu)]">
        Could not load subscriptions for this account.
      </p>
    )
  }

  return (
    <DynamicTableSection<SubscriptionListApi>
      variant="embedded"
      headers={PLAN_HEADERS}
      data={subscriptions}
      getRowKey={(row) => row.id}
      toolbar={{ title: 'Subscriptions', showFilter: false }}
      emptyTitle="No plan subscriptions"
      emptyMessage="Pay-per-swap operators may have no rows until they buy a timed plan."
      renderItems={(row) => [
        <span key="p" className="text-xs font-semibold text-[var(--tx)]">
          {row.plan_name}
          <span className="ml-1 font-mono text-[11px] text-[var(--mu)]">
            {row.plan_code}
          </span>
        </span>,
        <span key="v" className="font-mono text-xs text-[var(--tx)]">
          {row.vehicle_plate}
        </span>,
        <span key="per" className="text-xs text-[var(--mu)]">
          {row.plan_period}
        </span>,
        <span key="sw" className="text-xs tabular-nums text-[var(--tx)]">
          {row.swaps_allowance == null
            ? `${row.swaps_used} / ∞`
            : `${row.swaps_used} / ${row.swaps_allowance}`}
        </span>,
        <span key="e" className="text-xs text-[var(--mu)]">
          {formatDate(row.ends_at)}
        </span>,
        <TableStatusBadge
          key="s"
          label={row.status}
          tone={row.status === 'ACTIVE' ? 'success' : 'neutral'}
        />,
      ]}
    />
  )
}

/** Swap history for this account — real ops signal (not a fake analytics stub). */
export function OperatorSwapsTab({ operator }: { operator: OperatorRecord }) {
  const { swaps, isPending, isError } = useAccountSwaps(operator.id)

  if (isPending) return <LoadingState variant="inline" cols={6} rows={5} />
  if (isError) {
    return (
      <p className="text-[13px] text-[var(--mu)]">
        Could not load swaps for this account.
      </p>
    )
  }

  return (
    <DynamicTableSection<SwapListApi>
      variant="embedded"
      headers={SWAP_HEADERS}
      data={swaps}
      getRowKey={(row) => row.id}
      toolbar={{ title: 'Swaps', showFilter: false }}
      emptyTitle="No swaps yet"
      emptyMessage="Completed swaps for this account (GET /mobility/swaps/?account=)."
      renderItems={(row) => [
        <span key="w" className="text-xs text-[var(--mu)]">
          {formatWhen(row.created_at)}
        </span>,
        <span key="h" className="font-mono text-xs text-[var(--tx)]">
          {row.hub_code}
        </span>,
        <span key="v" className="font-mono text-xs text-[var(--tx)]">
          {row.vehicle_plate}
        </span>,
        <span key="m" className="text-xs text-[var(--mu)]">
          {row.payment_mode}
        </span>,
        <span key="a" className="text-xs font-semibold tabular-nums text-[var(--tx)]">
          {formatNaira(row.amount_kobo, { fromKobo: true, showDecimals: true })}
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
