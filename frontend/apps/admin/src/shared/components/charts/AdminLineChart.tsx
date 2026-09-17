import { LineChart } from '@mantine/charts'

export const ADMIN_CHART_COLORS = {
  teal: '#0D7C8F',
  amber: '#F5A623',
  sky: '#4FC3F7',
  green: '#27AE60',
  red: '#E74C3C',
  navy: '#003153',
  muted: '#93A7B0',
} as const

export interface AdminChartPoint {
  label: string
  [key: string]: string | number
}

export interface AdminLineSeries {
  dataKey: string
  name?: string
  color?: string
  strokeWidth?: number
  strokeDasharray?: string
}

export interface AdminLineChartProps {
  data: AdminChartPoint[]
  series: AdminLineSeries[]
  height?: number
  showLegend?: boolean
  /** Tighten Y domain around values (good for ARPU — avoid 0→38k empty space). */
  yDomainPadding?: boolean
  valueFormatter?: (value: number) => string
}

export function AdminLineChart({
  data,
  series,
  height = 220,
  showLegend = false,
  yDomainPadding = false,
  valueFormatter,
}: AdminLineChartProps) {
  const yDomain = yDomainPadding
    ? (() => {
        const keys = series.map((s) => s.dataKey)
        const vals = data.flatMap((row) =>
          keys.map((k) => Number(row[k])).filter((n) => Number.isFinite(n)),
        )
        if (vals.length === 0) return undefined
        const min = Math.min(...vals)
        const max = Math.max(...vals)
        const pad = Math.max((max - min) * 0.15, max * 0.04)
        return [Math.max(0, Math.floor(min - pad)), Math.ceil(max + pad)] as [
          number,
          number,
        ]
      })()
    : undefined

  return (
    <div className="relative z-0 w-full min-w-0 overflow-hidden px-1">
      <LineChart
        h={height}
        data={data}
        dataKey="label"
        series={series.map((s, i) => ({
          name: s.dataKey,
          label: s.name ?? s.dataKey,
          color: s.color ?? Object.values(ADMIN_CHART_COLORS)[i % 5],
          strokeDasharray: s.strokeDasharray,
        }))}
        curveType="monotone"
        withLegend={showLegend}
        withDots={data.length <= 12}
        gridAxis="y"
        tickLine="none"
        strokeWidth={series[0]?.strokeWidth ?? 2.25}
        valueFormatter={valueFormatter}
        yAxisProps={{
          width: 48,
          tickMargin: 6,
          domain: yDomain,
          tickFormatter: valueFormatter,
        }}
        xAxisProps={{ padding: { left: 8, right: 8 }, tickMargin: 8 }}
        mb={4}
      />
    </div>
  )
}
