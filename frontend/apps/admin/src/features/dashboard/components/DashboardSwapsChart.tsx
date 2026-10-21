import { Skeleton } from '@mantine/core'
import { ADMIN_CHART_COLORS, AdminLineChart } from '@shared/components'
import { useCommandCentre } from '../hooks/use-command-centre'

/** Completed swaps per hour (Lagos), today against yesterday. */
export function DashboardSwapsChart() {
  const { data, isPending } = useCommandCentre()
  const hourly = data?.hourly_swaps
  const nowHour = Number(
    new Intl.DateTimeFormat('en-GB', { hour: 'numeric', hourCycle: 'h23', timeZone: 'Africa/Lagos' })
      .format(new Date()),
  )
  // 05:00–22:00 covers hub hours; widen if anything happened outside it.
  const activeHours = Array.from({ length: 24 }, (_, h) => h).filter(
    (h) => (hourly?.today[h] ?? 0) > 0 || (hourly?.yesterday[h] ?? 0) > 0,
  )
  const first = Math.min(5, ...activeHours)
  const last = Math.max(22, ...activeHours)
  const series = Array.from({ length: last - first + 1 }, (_, i) => {
    const h = first + i
    return {
      label: `${String(h).padStart(2, '0')}:00`,
      yesterday: hourly?.yesterday[h] ?? 0,
      // Hours still ahead today are left off rather than drawn as zero.
      ...(h <= nowHour ? { today: hourly?.today[h] ?? 0 } : {}),
    }
  })
  const todayTotal = (hourly?.today ?? []).reduce((a, b) => a + b, 0)

  return (
    <div className="flex flex-col gap-2.5 rounded-[10px] border border-[var(--bd)] p-3.5 sm:p-[14px_16px]">
      <div className="flex items-baseline justify-between">
        <div className="text-[14px] font-bold text-[var(--tx)]">Swaps per hour</div>
        <div className="text-[12px] text-[var(--mu)]">
          Completed · today vs yesterday (WAT)
        </div>
      </div>
      {isPending && !hourly ? (
        <Skeleton height={160} radius="md" />
      ) : todayTotal === 0 && (hourly?.yesterday ?? []).every((n) => n === 0) ? (
        <p className="py-10 text-center text-[13px] text-[var(--mu)]">
          No completed swaps today or yesterday.
        </p>
      ) : (
        <AdminLineChart
          data={series}
          series={[
            { dataKey: 'today', name: 'Today', color: ADMIN_CHART_COLORS.teal, strokeWidth: 2.5 },
            { dataKey: 'yesterday', name: 'Yesterday', color: ADMIN_CHART_COLORS.muted },
          ]}
          height={160}
          showLegend
        />
      )}
    </div>
  )
}
