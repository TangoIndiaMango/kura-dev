import { CompositeChart } from '@mantine/charts'
import { Skeleton } from '@mantine/core'
import { Activity01Icon } from 'hugeicons-react'
import { ADMIN_CHART_COLORS } from '@shared/components/charts/AdminLineChart'
import type { DailyMetricPoint } from '../types'

interface OperatorCompositeChartProps {
  data?: DailyMetricPoint[]
  isLoading?: boolean
  startDate?: string
  endDate?: string
}

export function OperatorCompositeChart({
  data = [],
  isLoading,
  startDate,
  endDate,
}: OperatorCompositeChartProps) {
  if (isLoading && data.length === 0) {
    return (
      <div className="flex h-full min-h-[300px] flex-col justify-between rounded-[14px] border border-[var(--bd)] bg-[var(--sf)] p-4 shadow-[var(--sh)] sm:p-5">
        <div className="mb-3 flex items-center justify-between">
          <Skeleton height={18} width={200} radius="sm" />
          <Skeleton height={18} width={100} radius="sm" />
        </div>
        <Skeleton height={230} width="100%" radius="md" />
      </div>
    )
  }

  const chartData = data.map((d) => ({
    label: d.label,
    swaps: d.swaps,
    energy_kwh: d.energy_kwh,
    target: d.target,
  }))

  const hasActivity = chartData.some((d) => d.swaps > 0 || d.energy_kwh > 0)

  return (
    <div className="flex h-full min-h-[320px] flex-col justify-between rounded-[14px] border border-[var(--bd)] bg-[var(--sf)] p-4 shadow-[var(--sh)] sm:p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-[13.5px] font-bold text-[var(--tx)]">
            Swap Cadence & Energy Trajectory
          </h3>
          <p className="mt-0.5 text-[11.5px] text-[var(--mu)]">
            Volume bars against energy drawn (kWh) & daily target benchmark
          </p>
        </div>
        <span className="rounded-[6px] bg-[var(--in)] px-2 py-0.5 text-[10.5px] font-bold tracking-wide text-[var(--mu)]">
          COMPOSITE TELEMETRY
        </span>
      </div>

      {!hasActivity ? (
        <div className="flex flex-1 flex-col items-center justify-center rounded-[10px] border border-dashed border-[var(--bd)] bg-[var(--in)]/40 p-6 text-center">
          <Activity01Icon size={26} color="var(--mu)" className="mb-1.5" />
          <p className="text-[13px] font-semibold text-[var(--tx)]">
            No swap activity recorded
          </p>
          <p className="mt-0.5 max-w-xs text-[11.5px] text-[var(--mu)]">
            Zero swaps fulfilled between {startDate} and {endDate}.
          </p>
        </div>
      ) : (
        <div className="min-w-0 flex-1 overflow-hidden pt-1">
          <CompositeChart
            h={240}
            data={chartData}
            dataKey="label"
            series={[
              {
                name: 'swaps',
                label: 'Daily Swaps',
                type: 'bar',
                color: ADMIN_CHART_COLORS.teal,
              },
              {
                name: 'energy_kwh',
                label: 'Energy (kWh)',
                type: 'line',
                color: ADMIN_CHART_COLORS.sky,
              },
              {
                name: 'target',
                label: 'Target Cadence (2.0)',
                type: 'line',
                color: ADMIN_CHART_COLORS.amber,
                strokeDasharray: '4 4',
              },
            ]}
            curveType="monotone"
            withLegend
            withDots={chartData.length <= 14}
            gridAxis="y"
            tickLine="none"
            maxBarWidth={28}
            yAxisProps={{ width: 36, tickMargin: 4 }}
            xAxisProps={{ padding: { left: 4, right: 4 }, tickMargin: 6 }}
          />
        </div>
      )}
    </div>
  )
}
