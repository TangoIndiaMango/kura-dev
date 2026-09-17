import { useMemo, useState } from 'react'
import {
  AdminLineChart,
  AdminDonutChart,
  ADMIN_CHART_COLORS,
} from '@shared/components/charts'
import { DateRangePicker, type DateRangeOutput } from '@shared/components'
import type { AgentRecord } from '@shared/mock/adminMockData'
import { formatNaira } from '@shared/utils/currency'
import {
  cashSeriesForAgent,
  overrideReasonMix,
  overrideTrendForAgent,
  swapTrendForAgent,
  type AgentExtras,
} from './agentDetailHelpers'

function defaultRange(): DateRangeOutput {
  return { start_date: '2026-08-01', end_date: '2026-09-05' }
}

/** Per-agent metrics — swaps, overrides, cash. Each chart owns its range control. */
export function AgentAnalytics({
  agent,
  extras,
}: {
  agent: AgentRecord
  extras: AgentExtras
}) {
  const [swapRange, setSwapRange] = useState<DateRangeOutput>(defaultRange)
  const [cashRange, setCashRange] = useState<DateRangeOutput>(defaultRange)

  const swapTrend = useMemo(() => swapTrendForAgent(extras), [extras])
  const overrideTrend = useMemo(() => overrideTrendForAgent(agent), [agent])
  const cashSeries = useMemo(() => cashSeriesForAgent(extras), [extras])
  const reasonMix = useMemo(() => overrideReasonMix(agent), [agent])

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-[12px] border border-[var(--bd)] bg-[var(--in)] px-3.5 py-3">
          <p className="text-[11.5px] font-semibold uppercase tracking-wide text-[var(--su)]">
            Swaps · 30d
          </p>
          <p className="mt-1 text-[22px] font-bold tabular-nums text-[var(--tx)]">
            {extras.swaps30d}
          </p>
          <p className="mt-0.5 text-[12px] text-[var(--mu)]">
            {extras.swapsToday} completed today
          </p>
        </div>
        <div className="rounded-[12px] border border-[var(--bd)] bg-[var(--in)] px-3.5 py-3">
          <p className="text-[11.5px] font-semibold uppercase tracking-wide text-[var(--su)]">
            Registrations
          </p>
          <p className="mt-1 text-[22px] font-bold tabular-nums text-[var(--tx)]">
            {extras.registrationsToday}
          </p>
          <p className="mt-0.5 text-[12px] text-[var(--mu)]">Operators signed up today</p>
        </div>
        <div className="rounded-[12px] border border-[var(--bd)] bg-[var(--in)] px-3.5 py-3">
          <p className="text-[11.5px] font-semibold uppercase tracking-wide text-[var(--su)]">
            Cash collected
          </p>
          <p className="mt-1 text-[22px] font-bold tabular-nums text-[var(--tx)]">
            {formatNaira(extras.cashCollectedToday)}
          </p>
          <p className="mt-0.5 text-[12px] text-[var(--mu)]">
            Deposited {formatNaira(extras.cashDepositedToday)}
          </p>
        </div>
      </div>

      <div className="overflow-visible rounded-[12px] border border-[var(--bd)] bg-[var(--sf)] p-4 pb-5">
        <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-[13px] font-bold text-[var(--tx)]">Swap volume</h3>
            <p className="mt-0.5 text-[12px] text-[var(--mu)]">
              Swaps completed on this agent’s shifts
            </p>
          </div>
          <DateRangePicker date={swapRange} onChange={setSwapRange} />
        </div>
        <AdminLineChart
          data={swapTrend}
          series={[{ dataKey: 'swaps', name: 'Swaps', color: ADMIN_CHART_COLORS.teal }]}
          height={220}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.35fr_1fr]">
        <div className="overflow-visible rounded-[12px] border border-[var(--bd)] bg-[var(--sf)] p-4 pb-5">
          <h3 className="mb-1 text-[13px] font-bold text-[var(--tx)]">Overrides · this week</h3>
          <p className="mb-3 text-[12px] text-[var(--mu)]">
            Daily count · alert at 3 or more in a day
          </p>
          <AdminLineChart
            data={overrideTrend}
            series={[
              {
                dataKey: 'overrides',
                name: 'Overrides',
                color: ADMIN_CHART_COLORS.amber,
              },
            ]}
            height={200}
          />
        </div>
        <div className="overflow-visible rounded-[12px] border border-[var(--bd)] bg-[var(--sf)] p-4 pb-5">
          <h3 className="mb-1 text-[13px] font-bold text-[var(--tx)]">Override reasons</h3>
          <p className="mb-3 text-[12px] text-[var(--mu)]">Why discretion was used</p>
          {reasonMix.length > 0 ? (
            <AdminDonutChart
              data={reasonMix}
              height={200}
              centerValue={reasonMix.reduce((s, r) => s + r.value, 0)}
              centerLabel="Overrides"
            />
          ) : (
            <p className="py-10 text-center text-[13px] text-[var(--mu)]">No overrides yet</p>
          )}
        </div>
      </div>

      <div className="overflow-visible rounded-[12px] border border-[var(--bd)] bg-[var(--sf)] p-4 pb-5">
        <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-[13px] font-bold text-[var(--tx)]">Cash collected vs deposited</h3>
            <p className="mt-0.5 text-[12px] text-[var(--mu)]">
              End-of-day reconciliation (₦ thousands)
            </p>
          </div>
          <DateRangePicker date={cashRange} onChange={setCashRange} />
        </div>
        <AdminLineChart
          data={cashSeries}
          series={[
            {
              dataKey: 'collected',
              name: 'Collected (₦k)',
              color: ADMIN_CHART_COLORS.teal,
            },
            {
              dataKey: 'deposited',
              name: 'Deposited (₦k)',
              color: ADMIN_CHART_COLORS.green,
            },
          ]}
          height={220}
        />
      </div>
    </div>
  )
}
