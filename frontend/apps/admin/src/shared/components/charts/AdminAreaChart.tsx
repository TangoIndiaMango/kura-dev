import { AreaChart } from '@mantine/charts'
import { ADMIN_CHART_COLORS, type AdminChartPoint } from './AdminLineChart'

export interface AdminAreaSeries {
  dataKey: string
  name?: string
  color?: string
}

export interface AdminAreaChartProps {
  data: AdminChartPoint[]
  series: AdminAreaSeries[]
  height?: number
  showLegend?: boolean
  /** stacked | default — PRD revenue layers stack cleanly as stacked. */
  type?: 'default' | 'stacked' | 'percent'
  valueFormatter?: (value: number) => string
}

export function AdminAreaChart({
  data,
  series,
  height = 220,
  showLegend = false,
  type = 'stacked',
  valueFormatter,
}: AdminAreaChartProps) {
  if (data.length === 0 || series.length === 0) {
    return (
      <div
        className="flex w-full items-center justify-center text-[13px] text-[var(--mu)]"
        style={{ minHeight: height }}
      >
        No trend data for this range.
      </div>
    )
  }

  /**
   * Mantine AreaChart builds SVG gradient ids from React useId + hex colors.
   * Those ids often fail to resolve (colons / leading digits), so fills vanish and
   * only dots remain. Solid fills avoid that. Dots are also off for stacked series:
   * Mantine's ghost "dot" areas have fill="none" and empty the tooltip payload.
   */
  const stacked = type === 'stacked' || type === 'percent'

  return (
    <div className="w-full min-w-0 overflow-visible px-1">
      <AreaChart
        h={height}
        data={data}
        dataKey="label"
        type={type}
        series={series.map((s, i) => ({
          name: s.dataKey,
          label: s.name ?? s.dataKey,
          color: s.color ?? Object.values(ADMIN_CHART_COLORS)[i % 5],
        }))}
        curveType="monotone"
        withLegend={showLegend}
        withDots={false}
        withGradient={false}
        fillOpacity={stacked ? 0.72 : 0.35}
        gridAxis="y"
        tickLine="none"
        strokeWidth={2}
        valueFormatter={valueFormatter}
        areaProps={(item) => ({
          fill: item.color,
        })}
        yAxisProps={{
          width: 42,
          tickMargin: 6,
          tickFormatter: valueFormatter,
        }}
        xAxisProps={{ padding: { left: 8, right: 8 }, tickMargin: 8 }}
        mb={showLegend ? 8 : 4}
      />
    </div>
  )
}
