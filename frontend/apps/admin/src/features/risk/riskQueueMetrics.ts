import { ADMIN_CHART_COLORS } from '@shared/components/charts'
import type { RiskEventStats } from '@features/risk'

export const RULE_COLORS: Record<string, string> = {
  BATTERY_MISMATCH: ADMIN_CHART_COLORS.amber,
  SWAP_VELOCITY: ADMIN_CHART_COLORS.red,
  GEO_IMPOSSIBLE: ADMIN_CHART_COLORS.navy,
  MANUAL_FLAG: ADMIN_CHART_COLORS.sky,
  NEW_DEVICE: ADMIN_CHART_COLORS.teal,
  CHARGEBACK: ADMIN_CHART_COLORS.red,
  FUNDING_ANOMALY: ADMIN_CHART_COLORS.amber,
}

export function ruleLabel(code: string) {
  return code.replace(/_/g, ' ')
}

export function riskStatusTone(status: string) {
  if (status === 'REVIEWED_OK') return 'success' as const
  if (status === 'REVIEWED_FRAUD') return 'danger' as const
  if (status === 'ESCALATED') return 'warning' as const
  return 'warning' as const
}

export function severityTone(severity: string) {
  if (severity === 'CRITICAL' || severity === 'HIGH') return 'danger' as const
  if (severity === 'MEDIUM') return 'warning' as const
  return 'neutral' as const
}

export function riskDonutFromStats(stats: RiskEventStats | undefined) {
  const rows = stats?.period.by_rule ?? []
  return rows
    .filter((r) => r.count > 0)
    .map((r) => ({
      name: ruleLabel(r.rule),
      value: r.count,
      color: RULE_COLORS[r.rule] ?? ADMIN_CHART_COLORS.teal,
    }))
}

export function riskKpisFromStats(stats: RiskEventStats | undefined) {
  const queue = stats?.queue
  const period = stats?.period
  return [
    {
      title: 'Open queue',
      value: stats ? String(queue?.open ?? 0) : '—',
      sub: `${queue?.high_severity ?? 0} high/critical`,
      tone: (queue?.open ?? 0) > 0 ? ('warning' as const) : ('success' as const),
    },
    {
      title: 'Critical',
      value: stats ? String(queue?.critical ?? 0) : '—',
      sub: 'Open · critical severity',
      tone: (queue?.critical ?? 0) > 0 ? ('danger' as const) : ('default' as const),
    },
    {
      title: 'Escalated',
      value: stats ? String(queue?.escalated ?? 0) : '—',
      sub: 'Needs senior review',
      tone: (queue?.escalated ?? 0) > 0 ? ('warning' as const) : ('default' as const),
    },
    {
      title: 'Period volume',
      value: stats ? String(period?.opened ?? 0) : '—',
      sub: `${period?.reviewed ?? 0} reviewed in range`,
      tone: 'default' as const,
    },
  ]
}

export function formatAge(iso: string) {
  const ms = Date.now() - new Date(iso).getTime()
  if (Number.isNaN(ms) || ms < 0) return '—'
  const mins = Math.floor(ms / 60_000)
  if (mins < 60) return `${mins}m`
  const hours = Math.floor(mins / 60)
  if (hours < 48) return `${hours}h`
  return `${Math.floor(hours / 24)}d`
}

export function readFilterValue(
  values: Record<string, unknown>,
  logicalKey: string,
): string | undefined {
  const raw =
    logicalKey in values
      ? values[logicalKey]
      : Object.entries(values).find(
          ([k]) => k === logicalKey || k.endsWith(`_${logicalKey}`),
        )?.[1]
  if (raw == null || raw === '' || raw === 'all') return undefined
  if (Array.isArray(raw)) {
    return raw.length ? String(raw[0]) : undefined
  }
  return String(raw)
}
