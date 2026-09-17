import { ADMIN_CHART_COLORS } from '@shared/components/charts'
import type { AlertStats } from './types'

export function kindTitle(kind: string) {
  return kind.replace(/_/g, ' ')
}

export function severityLabel(severity: string) {
  if (severity === 'INFO') return 'INFORMATIONAL'
  if (severity === 'WARNING') return 'OPERATIONAL'
  return severity
}

export function alertStatusTone(status: string) {
  if (status === 'RESOLVED') return 'success' as const
  if (status === 'ACKNOWLEDGED') return 'warning' as const
  if (status === 'ESCALATED') return 'danger' as const
  return 'danger' as const
}

export function severityToneClass(severity: string) {
  if (severity === 'CRITICAL') return 'text-[#C0392B]'
  if (severity === 'WARNING') return 'text-[#C47D0E]'
  return 'text-[var(--pr)]'
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

export function formatWhen(iso: string) {
  try {
    return new Date(iso).toLocaleString()
  } catch {
    return iso
  }
}

export function alertsDonutFromStats(stats: AlertStats | undefined) {
  const rows = stats?.period.by_severity ?? []
  const colorFor = (sev: string) => {
    if (sev === 'CRITICAL') return ADMIN_CHART_COLORS.red
    if (sev === 'WARNING') return ADMIN_CHART_COLORS.amber
    return ADMIN_CHART_COLORS.sky
  }
  return rows
    .filter((r) => r.count > 0)
    .map((r) => ({
      name: severityLabel(r.severity),
      value: r.count,
      color: colorFor(r.severity),
    }))
}

export function alertsKpisFromStats(stats: AlertStats | undefined) {
  const queue = stats?.queue
  return [
    {
      title: 'Open alerts',
      value: stats ? String(queue?.open ?? 0) : '—',
      sub: `${queue?.critical_open ?? 0} critical`,
      tone: (queue?.open ?? 0) > 0 ? ('danger' as const) : ('success' as const),
    },
    {
      title: 'Acknowledged',
      value: stats ? String(queue?.acknowledged ?? 0) : '—',
      sub: 'In triage',
      tone: (queue?.acknowledged ?? 0) > 0 ? ('warning' as const) : ('default' as const),
    },
    {
      title: 'Escalated',
      value: stats ? String(queue?.escalated ?? 0) : '—',
      sub: 'Needs lead',
      tone: (queue?.escalated ?? 0) > 0 ? ('danger' as const) : ('default' as const),
    },
    {
      title: 'Resolved',
      value: stats ? String(stats.period.resolved ?? 0) : '—',
      sub: 'In selected range',
      tone: 'success' as const,
    },
  ]
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
  if (Array.isArray(raw)) return raw.length ? String(raw[0]) : undefined
  return String(raw)
}
