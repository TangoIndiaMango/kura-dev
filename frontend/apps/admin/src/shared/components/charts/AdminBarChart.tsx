import { BarChart } from '@mantine/charts'
import { ADMIN_CHART_COLORS, type AdminChartPoint } from './AdminLineChart'

export interface AdminBarSeries {
  dataKey: string
  name?: string
  color?: string
  stackId?: string
}

export interface AdminBarChartProps {
  data: AdminChartPoint[]
  series: AdminBarSeries[]
  height?: number
  showLegend?: boolean
  showGrid?: boolean
  /** Tick + tooltip formatter (e.g. naira). */
  valueFormatter?: (value: number) => string
  /** Y axis width in px — widen for long tick labels. */
  yAxisWidth?: number
}

export function AdminBarChart({
  data,
  series,
  height = 220,
  showLegend = false,
  valueFormatter,
  yAxisWidth = 40,
}: AdminBarChartProps) {
  const stacked = series.some((s) => s.stackId)
  return (
    <div className="relative z-0 w-full min-w-0 overflow-hidden px-1">
      <BarChart
        h={height}
        data={data}
        dataKey="label"
        type={stacked ? 'stacked' : 'default'}
        series={series.map((s, i) => ({
          name: s.dataKey,
          label: s.name ?? s.dataKey,
          color: s.color ?? Object.values(ADMIN_CHART_COLORS)[i % 5],
          stackId: s.stackId,
        }))}
        withLegend={showLegend}
        gridAxis="y"
        tickLine="none"
        maxBarWidth={36}
        valueFormatter={valueFormatter}
        yAxisProps={{ width: yAxisWidth, tickMargin: 6 }}
        xAxisProps={{ padding: { left: 8, right: 8 }, tickMargin: 8 }}
        mb={showLegend ? 8 : 4}
      />
    </div>
  )
}
