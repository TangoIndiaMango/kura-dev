import { useState } from 'react'
import { Alert, SegmentedControl } from '@mantine/core'
import dayjs from 'dayjs'
import { AdminLineChart, ADMIN_CHART_COLORS, LoadingState } from '@shared/components'
import { formatNaira } from '@shared/utils/currency'
import { useRevenueAnalyticsSettings } from './RevenueSettingsTab'
import { estimateLtv, formatCompactNaira, formatPct } from './revenueMath'
import { useRevenueCohorts } from './useRevenueCohorts'

function cellTone(pct: number | null): string {
  if (pct === null) return 'bg-[var(--tn)] text-[var(--mu)]'
  if (pct >= 80) return 'bg-[color-mix(in_srgb,var(--pr)_28%,transparent)] text-[var(--tx)]'
  if (pct >= 60) return 'bg-[color-mix(in_srgb,var(--pr)_16%,transparent)] text-[var(--tx)]'
  if (pct >= 40) return 'bg-[color-mix(in_srgb,#F5A623_22%,transparent)] text-[var(--tx)]'
  return 'bg-[color-mix(in_srgb,#E74C3C_18%,transparent)] text-[var(--tx)]'
}

const monthLabel = (ym: string) => dayjs(`${ym}-01`).format('MMM YYYY')

/**
 * Riders grouped by the month they joined: how many paid or swapped in each
 * month after, and average money per active rider. Real data, from the
 * per-rider daily totals.
 */
export function RevenueCohortsTab() {
  const { settings } = useRevenueAnalyticsSettings()
  const [months, setMonths] = useState('6')
  const { data, isPending, isError } = useRevenueCohorts(Number(months))

  if (isPending) return <LoadingState variant="inline" cols={4} rows={6} />
  if (isError || !data) {
    return (
      <Alert color="red" m="md" title="Cohorts unavailable">
        Cohorts could not be loaded.
      </Alert>
    )
  }

  const arpu = data.arpu
  const latest = arpu.length ? arpu[arpu.length - 1] : null
  const latestArpu = latest ? latest.arpu_kobo / 100 : null
  const ltv = estimateLtv(latestArpu, settings)
  const width = Number(months)
  const trend = arpu.map((m) => ({ label: monthLabel(m.month), arpu: Math.round(m.arpu_kobo / 100) }))

  return (
    <div className="flex flex-col gap-4 p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[12.5px] text-[var(--mu)]">
          From {monthLabel(data.from_month)}. Active means the rider paid or swapped that month.
        </p>
        <SegmentedControl
          aria-label="Months"
          value={months}
          onChange={setMonths}
          data={[
            { value: '3', label: '3 months' },
            { value: '6', label: '6 months' },
            { value: '12', label: '12 months' },
          ]}
        />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-[12px] border border-[var(--bd)] bg-[var(--in)] px-3.5 py-3">
          <p className="text-[11.5px] font-semibold uppercase tracking-wide text-[var(--su)]">
            ARPU · {latest ? monthLabel(latest.month) : 'this month'}
          </p>
          <p className="mt-1 text-[22px] font-bold tabular-nums text-[var(--tx)]">
            {latestArpu === null ? '—' : formatNaira(latestArpu)}
          </p>
          <p className="mt-0.5 text-[12px] text-[var(--mu)]">
            {latest ? `${latest.active_riders} active riders` : 'No activity yet'}
          </p>
        </div>
        <div className="rounded-[12px] border border-[var(--bd)] bg-[var(--in)] px-3.5 py-3">
          <p className="text-[11.5px] font-semibold uppercase tracking-wide text-[var(--su)]">
            Estimated lifetime value
          </p>
          <p className="mt-1 text-[22px] font-bold tabular-nums text-[var(--tx)]">
            {ltv === null ? '—' : formatCompactNaira(ltv)}
          </p>
          <p className="mt-0.5 text-[12px] text-[var(--mu)]">
            ARPU × {settings.ltvHorizonMonths} months × {settings.ltvRetentionFactorPct}% (Assumptions tab)
          </p>
        </div>
        <div className="rounded-[12px] border border-[var(--bd)] bg-[var(--in)] px-3.5 py-3">
          <p className="text-[11.5px] font-semibold uppercase tracking-wide text-[var(--su)]">
            New riders in range
          </p>
          <p className="mt-1 text-[22px] font-bold tabular-nums text-[var(--tx)]">
            {data.cohorts.reduce((n, c) => n + c.riders, 0).toLocaleString('en-NG')}
          </p>
          <p className="mt-0.5 text-[12px] text-[var(--mu)]">{data.cohorts.length} joining months</p>
        </div>
      </div>

      <div className="overflow-visible rounded-[12px] border border-[var(--bd)] bg-[var(--sf)] p-4 pb-5">
        <h3 className="mb-1 text-[13px] font-bold text-[var(--tx)]">ARPU by month</h3>
        <p className="mb-3 text-[12px] text-[var(--mu)]">Money paid ÷ riders who paid or swapped that month</p>
        {trend.length ? (
          <AdminLineChart
            data={trend}
            series={[{ dataKey: 'arpu', name: 'ARPU (₦)', color: ADMIN_CHART_COLORS.teal }]}
            height={220}
          />
        ) : (
          <p className="py-16 text-center text-sm text-[var(--mu)]">No paying riders in this range.</p>
        )}
      </div>

      <div className="rounded-[12px] border border-[var(--bd)] bg-[var(--sf)] p-4">
        <h3 className="mb-1 text-[13px] font-bold text-[var(--tx)]">Riders still active, by month joined</h3>
        <p className="mb-3 text-[12px] text-[var(--mu)]">
          M0 is the month they joined. Each cell: share of that month&apos;s riders active, and what they paid.
        </p>
        {data.cohorts.length === 0 ? (
          <div className="rounded-[12px] border border-dashed border-[var(--bd)] px-4 py-8 text-center text-[13px] text-[var(--mu)]">
            No riders joined in this range.
          </div>
        ) : (
          <div className="kura-table-scroll min-w-0 overflow-x-auto">
            <table className="w-max min-w-full border-collapse text-left">
              <thead>
                <tr className="text-[11px] font-bold uppercase tracking-wide text-[var(--mu)]">
                  <th scope="col" className="px-2 py-2">Joined</th>
                  <th scope="col" className="px-2 py-2 text-right">Riders</th>
                  {Array.from({ length: width }, (_, i) => (
                    <th key={i} scope="col" className="px-2 py-2 text-center">
                      M{i}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.cohorts.map((c) => {
                  const byOffset = new Map(c.months.map((m) => [m.offset, m]))
                  const age = dayjs().diff(dayjs(`${c.cohort}-01`), 'month')
                  return (
                    <tr key={c.cohort} className="border-t border-[var(--bd)]">
                      <th scope="row" className="whitespace-nowrap px-2 py-2 text-[12.5px] font-semibold text-[var(--tx)]">
                        {monthLabel(c.cohort)}
                      </th>
                      <td className="px-2 py-2 text-right text-[12.5px] tabular-nums">{c.riders}</td>
                      {Array.from({ length: width }, (_, i) => {
                        if (i > age) return <td key={i} className="px-1 py-1" />
                        const m = byOffset.get(i)
                        const pct = c.riders > 0 ? ((m?.active ?? 0) / c.riders) * 100 : null
                        return (
                          <td key={i} className="px-1 py-1">
                            <div className={`min-w-[78px] rounded-[6px] px-2 py-1.5 text-center ${cellTone(pct)}`}>
                              <div className="text-[12.5px] font-bold tabular-nums">{formatPct(pct, 0)}</div>
                              <div className="text-[10.5px] tabular-nums opacity-80">
                                {formatCompactNaira((m?.paid_kobo ?? 0) / 100)}
                              </div>
                            </div>
                          </td>
                        )
                      })}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
