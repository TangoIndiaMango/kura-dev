import { DonutChart } from '@mantine/charts'
import { ADMIN_CHART_COLORS } from './AdminLineChart'

export interface AdminDonutSlice {
  name: string
  value: number
  color?: string
}

export interface AdminDonutChartProps {
  data: AdminDonutSlice[]
  height?: number
  showLegend?: boolean
  centerLabel?: string
  centerValue?: string | number
}

const DEFAULT_COLORS = [
  ADMIN_CHART_COLORS.teal,
  ADMIN_CHART_COLORS.amber,
  ADMIN_CHART_COLORS.sky,
  ADMIN_CHART_COLORS.green,
  ADMIN_CHART_COLORS.red,
  ADMIN_CHART_COLORS.navy,
]

export function AdminDonutChart({
  data,
  height = 220,
  showLegend = true,
  centerLabel,
  centerValue,
}: AdminDonutChartProps) {
  return (
    <div className="relative flex h-full w-full flex-col items-center justify-center" style={{ minHeight: height }}>
      <DonutChart
        data={data.map((slice, i) => ({
          name: slice.name,
          value: slice.value,
          color: slice.color ?? DEFAULT_COLORS[i % DEFAULT_COLORS.length],
        }))}
        size={Math.min(180, height - 40)}
        thickness={24}
        withLabels={false}
        withTooltip
        chartLabel={
          centerValue != null
            ? String(centerValue)
            : centerLabel
              ? centerLabel
              : undefined
        }
      />
      {showLegend ? (
        <ul className="mt-3 flex flex-wrap justify-center gap-x-3 gap-y-1 px-2">
          {data.map((slice, i) => (
            <li key={slice.name} className="flex items-center gap-1.5 text-[11px] text-[var(--mu)]">
              <span
                className="h-2 w-2 rounded-full"
                style={{
                  background: slice.color ?? DEFAULT_COLORS[i % DEFAULT_COLORS.length],
                }}
              />
              {slice.name}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
