import { ADMIN_CHART_COLORS } from '@shared/components/charts'
import type { SupportCaseStats } from '@features/support'

export const CASE_KIND_COLORS: Record<string, string> = {
  GENERAL: ADMIN_CHART_COLORS.teal,
  PAYMENT_DISPUTE: ADMIN_CHART_COLORS.amber,
  IDENTITY: ADMIN_CHART_COLORS.sky,
  ENGINE_RELEASE: ADMIN_CHART_COLORS.navy,
  RISK_REFERRAL: ADMIN_CHART_COLORS.red,
  OTHER: ADMIN_CHART_COLORS.green,
}

export function kindLabel(kind: string) {
  return kind.replace(/_/g, ' ')
}

export function caseStatusTone(status: string) {
  if (status === 'CLOSED' || status === 'RESOLVED') return 'success' as const
  if (status === 'PENDING') return 'warning' as const
  return 'danger' as const
}

export function casesDonutFromStats(stats: SupportCaseStats | undefined) {
  const rows = stats?.period.by_kind ?? []
  return rows
    .filter((r) => r.count > 0)
    .map((r) => ({
      name: kindLabel(r.kind),
      value: r.count,
      color: CASE_KIND_COLORS[r.kind] ?? ADMIN_CHART_COLORS.teal,
    }))
}

export function casesKpisFromStats(stats: SupportCaseStats | undefined) {
  const queue = stats?.queue
  const period = stats?.period
  const openBacklog = (queue?.open ?? 0) + (queue?.pending ?? 0)
  const slaPressure = (queue?.sla_at_risk ?? 0) + (queue?.sla_breached ?? 0)
  return [
    {
      title: 'Open queue',
      value: stats ? String(openBacklog) : '—',
      sub: `${queue?.high_priority ?? 0} high/urgent`,
      tone: openBacklog > 0 ? ('warning' as const) : ('success' as const),
    },
    {
      title: 'Unassigned',
      value: stats ? String(queue?.unassigned ?? 0) : '—',
      sub: 'Needs owner',
      tone: (queue?.unassigned ?? 0) > 0 ? ('danger' as const) : ('default' as const),
    },
    {
      title: 'SLA pressure',
      value: stats ? String(slaPressure) : '—',
      sub: `${queue?.sla_breached ?? 0} breached · ${queue?.sla_at_risk ?? 0} at risk`,
      tone:
        (queue?.sla_breached ?? 0) > 0
          ? ('danger' as const)
          : slaPressure > 0
            ? ('warning' as const)
            : ('success' as const),
    },
    {
      title: 'Disputes',
      value: stats ? String(queue?.disputes ?? 0) : '—',
      sub: `${period?.opened ?? 0} opened in range`,
      tone: 'default' as const,
    },
  ]
}
