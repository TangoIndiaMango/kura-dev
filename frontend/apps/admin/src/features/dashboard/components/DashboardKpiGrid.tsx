import { Skeleton } from '@mantine/core'
import { AdminKpiCard, type AdminKpiTone } from '@shared/components'
import { formatNaira } from '@shared/utils/currency'
import { useCommandCentre } from '../hooks/use-command-centre'

export function DashboardKpiGrid() {
  const { data, isPending } = useCommandCentre()
  const k = data?.kpis

  if (isPending && !k) {
    return (
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} height={88} radius={12} />
        ))}
      </div>
    )
  }

  const ready = (data?.hubs ?? []).reduce((s, h) => s + h.ready, 0)
  const cards: Array<{ title: string; value: string; sub: string; tone: AdminKpiTone }> = [
    {
      title: 'Hubs online',
      value: `${k?.online_hubs ?? 0} / ${k?.total_hubs ?? 0}`,
      sub: 'Network status',
      tone: 'success',
    },
    {
      title: 'Swaps today',
      value: String(k?.today_swaps ?? 0),
      sub: 'Completed today',
      tone: 'default',
    },
    {
      title: 'Ready batteries',
      value: String(ready),
      sub: 'Across hubs',
      tone: 'default',
    },
    {
      title: 'Revenue today',
      value: formatNaira(k?.today_revenue_kobo ?? 0, { fromKobo: true }),
      sub: 'Successful payments',
      tone: 'success',
    },
    {
      title: 'Open alerts',
      value: String(k?.active_alerts ?? 0),
      sub: 'Needs attention',
      tone: (k?.active_alerts ?? 0) > 0 ? 'danger' : 'default',
    },
    {
      title: 'Agent cash today',
      value: formatNaira(k?.today_cash_kobo ?? 0, { fromKobo: true }),
      sub: 'Cash deposits recorded',
      tone: 'default',
    },
  ]

  return (
    <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((stat) => (
        <AdminKpiCard
          key={stat.title}
          title={stat.title}
          value={stat.value}
          sub={stat.sub}
          tone={stat.tone}
        />
      ))}
    </div>
  )
}
