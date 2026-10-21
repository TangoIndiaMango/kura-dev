import { Link } from 'react-router-dom'
import dayjs from 'dayjs'
import { Skeleton } from '@mantine/core'
import { formatNaira } from '@shared/utils/currency'
import { DateRangePicker } from '@shared/components/date-range/DateRangePicker'
import { useState } from 'react'
import { useHubDetailStats } from './hooks/use-hubs'
import {
  mapShiftToCashRow,
  useShifts,
} from '@features/payments/hooks/use-cash-ops'
import { HubCashLiveTable } from './HubCashLiveTable'

export function HubCollectionsPanel({
  hubId,
  hubName,
  enabled,
}: {
  hubId: string
  hubName: string
  enabled: boolean
}) {
  const [range, setRange] = useState(() => ({
    start_date: dayjs().subtract(13, 'day').format('YYYY-MM-DD'),
    end_date: dayjs().format('YYYY-MM-DD'),
  }))

  const statsQuery = useHubDetailStats(hubId, range, { enabled })
  const openShiftsQuery = useShifts({
    hub: hubId,
    status: 'OPEN',
    page: 1,
    enabled,
  })
  const periodShiftsQuery = useShifts({
    hub: hubId,
    page: 1,
    enabled,
    start_date: range.start_date,
    end_date: range.end_date,
  })

  const openRows = (openShiftsQuery.data?.results ?? []).map(mapShiftToCashRow)
  const periodRows = (periodShiftsQuery.data?.results ?? []).map(
    mapShiftToCashRow,
  )
  const cashOnHand = openRows.reduce(
    (s, r) => s + r.openingNaira + Math.max(0, r.collectedNaira ?? 0),
    0,
  )
  const needsReview = periodRows.filter(
    (r) => r.status === 'VARIANCE' || r.status === 'SHORT',
  ).length
  const swapFeesKobo = statsQuery.data?.revenue_kobo_total ?? 0

  // Payments page shares one date range (payments_*) across its tabs.
  const scopeQuery =
    `hub=${encodeURIComponent(hubId)}` +
    `&hub_label=${encodeURIComponent(hubName)}` +
    `&payments_start_date=${range.start_date}` +
    `&payments_end_date=${range.end_date}`
  const paymentsHref = `/payments?tab=payments&${scopeQuery}`
  const paymentsCashHref = `/payments?tab=cash&${scopeQuery}`

  const loading =
    enabled &&
    (statsQuery.isPending ||
      openShiftsQuery.isPending ||
      periodShiftsQuery.isPending)

  if (loading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton height={88} radius="md" />
        <Skeleton height={160} radius="md" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-wrap items-start justify-between gap-3 rounded-[14px] border border-[var(--bd)] bg-[var(--sf)] p-4 shadow-[var(--sh)] sm:p-5">
        <div className="min-w-0">
          <h2 className="m-0 text-[15px] font-bold text-[var(--tx)]">
            Collections
          </h2>
          <p className="mt-1 max-w-xl text-[12.5px] leading-relaxed text-[var(--mu)]">
            Swap fees booked at {hubName}, plus agent cash float and
            reconciliation. Network ledger lives in Payments.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <DateRangePicker
            date={range}
            onChange={(val) => {
              if (val?.start_date && val?.end_date) {
                setRange({
                  start_date: val.start_date,
                  end_date: val.end_date,
                })
              }
            }}
            maxDate={new Date()}
            className="scale-95 origin-right"
          />
          <Link
            to={paymentsHref}
            className="rounded-lg border border-[var(--bd)] bg-[var(--in)] px-3 py-2 text-[12px] font-bold text-[var(--tx)] no-underline hover:border-[var(--pr)] hover:text-[var(--pr)]"
          >
            View payments
          </Link>
          <Link
            to={paymentsCashHref}
            className="rounded-lg border border-[var(--bd)] bg-[var(--in)] px-3 py-2 text-[12px] font-bold text-[var(--tx)] no-underline hover:border-[var(--pr)] hover:text-[var(--pr)]"
          >
            Cash reconciliation
          </Link>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Kpi
          label="Swap fees"
          value={formatNaira(swapFeesKobo, { fromKobo: true })}
          sub="Completed swaps in period"
        />
        <Kpi
          label="Cash on hand"
          value={formatNaira(cashOnHand)}
          sub="Open duty windows now"
        />
        <Kpi
          label="Needs review"
          value={String(needsReview)}
          sub="Variance or short in period"
          tone={needsReview > 0 ? 'danger' : 'default'}
        />
      </div>

      <section className="flex flex-col gap-2">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="m-0 text-[13.5px] font-bold text-[var(--tx)]">
            Cash reconciliation
          </h3>
          <p className="m-0 text-[12px] text-[var(--mu)]">
            Duty windows active during the selected dates
          </p>
        </div>
        <HubCashLiveTable
          hubId={hubId}
          enabled={enabled}
          startDate={range.start_date}
          endDate={range.end_date}
        />
      </section>
    </div>
  )
}

function Kpi({
  label,
  value,
  sub,
  tone = 'default',
}: {
  label: string
  value: string
  sub: string
  tone?: 'default' | 'danger'
}) {
  return (
    <div className="rounded-[12px] border border-[var(--bd)] bg-[var(--sf)] p-4 shadow-[var(--sh)]">
      <p className="m-0 text-[11px] font-semibold uppercase tracking-wider text-[var(--mu)]">
        {label}
      </p>
      <p
        className={`mt-1.5 text-[20px] font-extrabold tracking-tight tabular-nums ${
          tone === 'danger' ? 'text-[var(--er)]' : 'text-[var(--tx)]'
        }`}
      >
        {value}
      </p>
      <p className="mt-1 text-[11.5px] text-[var(--mu)]">{sub}</p>
    </div>
  )
}
