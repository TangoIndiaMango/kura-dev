import type {
  AlertRuleChannel,
  AlertRuleOp,
  AlertRuleRecord,
  AlertRuleSignal,
} from '@shared/mock/adminMockData'

export interface AlertSignalMeta {
  id: AlertRuleSignal
  label: string
  description: string
  unit: string
  defaultOp: AlertRuleOp
  defaultValue: number
  defaultSeverity: AlertRuleRecord['severity']
  defaultCooldownMinutes: number
  /** How the backend evaluates this signal. */
  evalMode: 'poll' | 'event'
}

/** Closed catalog — new signals require a deploy + evaluator support. */
export const ALERT_SIGNAL_CATALOG: AlertSignalMeta[] = [
  {
    id: 'hub.last_sync_age',
    label: 'Hub last sync age',
    description: 'Minutes since a hub last checked in.',
    unit: 'minutes',
    defaultOp: 'gt',
    defaultValue: 5,
    defaultSeverity: 'CRITICAL',
    defaultCooldownMinutes: 30,
    evalMode: 'poll',
  },
  {
    id: 'hub.ready_count',
    label: 'Hub ready packs',
    description: 'Batteries marked ready at a hub.',
    unit: 'packs',
    defaultOp: 'lt',
    defaultValue: 4,
    defaultSeverity: 'OPERATIONAL',
    defaultCooldownMinutes: 60,
    evalMode: 'poll',
  },
  {
    id: 'psp.webhook_fail_streak',
    label: 'PSP webhook fail streak',
    description: 'Consecutive failed payment webhook deliveries.',
    unit: 'failures',
    defaultOp: 'gte',
    defaultValue: 3,
    defaultSeverity: 'CRITICAL',
    defaultCooldownMinutes: 15,
    evalMode: 'event',
  },
  {
    id: 'battery.soh_pct',
    label: 'Battery SoH',
    description: 'State of health below mobility threshold.',
    unit: '%',
    defaultOp: 'lt',
    defaultValue: 60,
    defaultSeverity: 'INFORMATIONAL',
    defaultCooldownMinutes: 1440,
    evalMode: 'poll',
  },
]

export const ALERT_OP_OPTIONS: Array<{ value: AlertRuleOp; label: string }> = [
  { value: 'gt', label: '>' },
  { value: 'gte', label: '≥' },
  { value: 'lt', label: '<' },
  { value: 'lte', label: '≤' },
  { value: 'eq', label: '=' },
]

export const ALERT_CHANNEL_OPTIONS: Array<{ value: AlertRuleChannel; label: string }> = [
  { value: 'dashboard', label: 'Dashboard' },
  { value: 'sms', label: 'SMS' },
  { value: 'whatsapp', label: 'WhatsApp' },
]

export const ALERT_SCOPE_OPTIONS: Array<{
  value: AlertRuleRecord['scope']
  label: string
}> = [
  { value: 'all', label: 'All hubs / platform' },
  { value: 'hub', label: 'Single hub (set in scope later)' },
  { value: 'region', label: 'Region' },
]

export const ALERT_SEVERITY_OPTIONS: Array<{
  value: AlertRuleRecord['severity']
  label: string
}> = [
  { value: 'CRITICAL', label: 'Critical' },
  { value: 'OPERATIONAL', label: 'Operational' },
  { value: 'INFORMATIONAL', label: 'Informational' },
]

export function getAlertSignalMeta(signal: AlertRuleSignal): AlertSignalMeta {
  return (
    ALERT_SIGNAL_CATALOG.find((s) => s.id === signal) ?? ALERT_SIGNAL_CATALOG[0]!
  )
}

export function formatAlertRuleOp(op: AlertRuleOp): string {
  return ALERT_OP_OPTIONS.find((o) => o.value === op)?.label ?? op
}

export function formatAlertRuleThreshold(rule: AlertRuleRecord): string {
  const meta = getAlertSignalMeta(rule.signal)
  return `${formatAlertRuleOp(rule.op)} ${rule.thresholdValue} ${meta.unit}`
}

export function formatAlertRuleChannels(channels: AlertRuleChannel[]): string {
  if (channels.length === 0) return '—'
  return channels
    .map((c) => ALERT_CHANNEL_OPTIONS.find((o) => o.value === c)?.label ?? c)
    .join(' + ')
}

export function formatAlertRuleMetric(signal: AlertRuleSignal): string {
  return getAlertSignalMeta(signal).label
}

export function defaultRuleName(signal: AlertRuleSignal, op: AlertRuleOp, value: number): string {
  const meta = getAlertSignalMeta(signal)
  return `${meta.label} ${formatAlertRuleOp(op)} ${value}`
}
