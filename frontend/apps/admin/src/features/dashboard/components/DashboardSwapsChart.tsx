import { AdminLineChart, ADMIN_CHART_COLORS } from '@shared/components'

const SWAPS_SERIES = [
  { label: '6h', today: 8, forecast: 10 },
  { label: '7h', today: 14, forecast: 16 },
  { label: '8h', today: 28, forecast: 30 },
  { label: '9h', today: 36, forecast: 38 },
  { label: '10h', today: 32, forecast: 34 },
  { label: '11h', today: 24, forecast: 26 },
  { label: '12h', today: 20, forecast: 22 },
  { label: '13h', today: 26, forecast: 28 },
  { label: '14h', today: 34, forecast: 32 },
  { label: '15h', today: 38, forecast: 36 },
  { label: '16h', today: 30, forecast: 28 },
  { label: '17h', today: 18, forecast: 20 },
  { label: '18h', today: 12, forecast: 14 },
  { label: '19h', today: 8, forecast: 10 },
]

export function DashboardSwapsChart() {
  return (
    <div className="flex flex-col gap-2.5 rounded-[10px] border border-[var(--bd)] p-3.5 sm:p-[14px_16px]">
      <div className="flex items-baseline justify-between">
        <div className="text-[14px] font-bold text-[var(--tx)]">Swaps per hour</div>
        <div className="text-[12px] text-[var(--mu)]">Today vs forecast</div>
      </div>
      <AdminLineChart
        data={SWAPS_SERIES}
        series={[
          { dataKey: 'today', name: 'Today', color: ADMIN_CHART_COLORS.teal, strokeWidth: 2.5 },
          { dataKey: 'forecast', name: 'Forecast', color: ADMIN_CHART_COLORS.muted },
        ]}
        height={160}
        showLegend
      />
    </div>
  )
}
