import { useMemo } from 'react'
import dayjs from 'dayjs'
import { ChartHistogramIcon } from 'hugeicons-react'
import { DateRangePicker } from '@shared/components/date-range/DateRangePicker'
import { OperatorMetricsGrid } from './OperatorMetricsGrid'
import { OperatorCompositeChart } from './OperatorCompositeChart'
import { OperatorSocDonutCard } from './OperatorSocDonutCard'
import type { AccountDetailStats } from '../types'

interface OperatorAnalyticsCockpitProps {
  stats?: AccountDetailStats
  isLoading?: boolean
  startDate: string
  endDate: string
  onRangeChange: (start: string, end: string) => void
}

export function OperatorAnalyticsCockpit({
  stats,
  isLoading,
  startDate,
  endDate,
  onRangeChange,
}: OperatorAnalyticsCockpitProps) {
  const dateRangeValue = useMemo(
    () => ({ start_date: startDate, end_date: endDate }),
    [startDate, endDate],
  )

  const formattedStart = dayjs(startDate).format('D MMM YYYY')
  const formattedEnd = dayjs(endDate).format('D MMM YYYY')

  return (
    <div className="flex flex-col gap-3.5">
      {/* Cockpit Control Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-[12px] border border-[var(--bd)] bg-[var(--sf)] p-3 shadow-[var(--sh)] sm:px-4 sm:py-3.5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-[8px] bg-[var(--in)] border border-[var(--bd)]">
            <ChartHistogramIcon size={18} color="var(--pr)" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-[14px] font-bold text-[var(--tx)]">
                Fleet Telemetry & Throughput
              </h2>
              <span className="rounded-[6px] bg-[var(--in)] px-2 py-0.5 text-[11px] font-semibold text-[var(--mu)]">
                {formattedStart} – {formattedEnd}
              </span>
            </div>
            <p className="text-[12px] text-[var(--mu)]">
              Real-time swap fulfillment cadence, pack DoD throughput and battery health
            </p>
          </div>
        </div>

        {/* Date picker with high z-index popover */}
        <div className="relative z-30">
          <DateRangePicker
            date={dateRangeValue}
            onChange={(val) => {
              if (val?.start_date && val?.end_date) {
                onRangeChange(val.start_date, val.end_date)
              }
            }}
            maxDate={new Date()}
            className="scale-95 origin-right"
          />
        </div>
      </div>

      {/* 4 High-Density Efficiency KPIs */}
      <OperatorMetricsGrid stats={stats} isLoading={isLoading} />

      {/* Dual Chart Cockpit: Composite Bar/Line + Battery SoC Donut */}
      <div className="grid grid-cols-1 gap-3.5 lg:grid-cols-12">
        <div className="lg:col-span-8">
          <OperatorCompositeChart
            data={stats?.daily_metrics}
            isLoading={isLoading}
            startDate={formattedStart}
            endDate={formattedEnd}
          />
        </div>
        <div className="lg:col-span-4">
          <OperatorSocDonutCard stats={stats} isLoading={isLoading} />
        </div>
      </div>
    </div>
  )
}
