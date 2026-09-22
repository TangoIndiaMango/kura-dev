import { Link } from 'react-router-dom'
import { Skeleton } from '@mantine/core'
import { TableStatusBadge } from '@shared/components'
import { formatNaira } from '@shared/utils/currency'
import {
  useShifts,
  mapShiftToCashRow,
} from '@features/payments/hooks/use-cash-ops'
import {
  cashNextActionLabel,
  cashPhaseHint,
  cashStatusLabel,
  cashStatusTone,
} from '@features/payments/cashReconHelpers'

export function HubCashLiveTable({
  hubId,
  enabled = true,
  startDate,
  endDate,
}: {
  hubId: string
  enabled?: boolean
  startDate?: string
  endDate?: string
}) {
  const shifts = useShifts({
    hub: hubId,
    page: 1,
    enabled,
    start_date: startDate,
    end_date: endDate,
  })
  if (shifts.isPending) return <Skeleton height={140} radius="md" />
  const rows = (shifts.data?.results ?? []).map(mapShiftToCashRow)
  if (rows.length === 0) {
    return (
      <p className="text-[13px] text-[var(--mu)]">
        No duty windows in this period. Rows appear when an agent clocks in
        with cash float at this hub.
      </p>
    )
  }

  return (
    <ul className="m-0 list-none space-y-2.5 p-0">
      {rows.map((r) => (
        <li
          key={r.id}
          className="rounded-[12px] border border-[var(--bd)] bg-[var(--sf)] px-3.5 py-3 shadow-[var(--sh)]"
        >
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="m-0 text-[14px] font-bold text-[var(--tx)]">
                {r.agent}
              </p>
              <p className="mt-0.5 text-[11.5px] text-[var(--mu)]">
                {r.status === 'ON_DUTY'
                  ? `Opened ${new Date(r.openedAt).toLocaleString()}`
                  : r.closedAt
                    ? `Closed ${new Date(r.closedAt).toLocaleString()}`
                    : '—'}
              </p>
            </div>
            <TableStatusBadge
              label={cashStatusLabel(r.status)}
              tone={cashStatusTone(r.status)}
            />
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Metric label="Opening float" value={formatNaira(r.openingNaira)} />
            <Metric
              label="Cash takes"
              value={
                r.collectedNaira != null
                  ? formatNaira(r.collectedNaira)
                  : r.takeCount > 0
                    ? `${r.takeCount} receipt${r.takeCount === 1 ? '' : 's'}`
                    : 'None yet'
              }
            />
            <Metric
              label="Variance"
              value={
                r.varianceNaira != null
                  ? formatNaira(r.varianceNaira)
                  : 'After count'
              }
            />
            <Metric
              label="Bank lodge"
              value={r.lodged ? formatNaira(r.depositedNaira) : 'Not yet'}
            />
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-[var(--bd)] pt-2.5">
            <p className="m-0 max-w-[28rem] text-[12px] leading-snug text-[var(--mu)]">
              {cashPhaseHint(r.status)}
            </p>
            <Link
              to={`/payments/${r.id}`}
              className="shrink-0 rounded-lg bg-[var(--pr)] px-3 py-1.5 text-[12px] font-bold text-white no-underline hover:opacity-90"
            >
              {cashNextActionLabel(r.status)}
            </Link>
          </div>
        </li>
      ))}
    </ul>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-[10px] bg-[var(--in)] px-2.5 py-2">
      <p className="m-0 text-[10.5px] font-semibold uppercase tracking-wide text-[var(--su)]">
        {label}
      </p>
      <p className="mt-0.5 truncate text-[13px] font-semibold tabular-nums text-[var(--tx)]">
        {value}
      </p>
    </div>
  )
}
