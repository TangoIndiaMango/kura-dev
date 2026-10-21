import { useNavigate } from 'react-router-dom'
import { Button } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { PlusSignIcon } from 'hugeicons-react'
import {
  DynamicTableSection,
  LoadingState,
  TableStatusBadge,
  type TableHeader,
} from '@shared/components'
import { apiErrorMessage } from '@lib/api/auth'
import { ALERT_RULE_KINDS } from './constants'
import {
  useAlertRules,
  useUpdateAlertRule,
  type AlertRuleApi,
} from './hooks/use-alert-rules'

const RULE_HEADERS: TableHeader[] = [
  { key: 'name', label: 'RULE' },
  { key: 'kind', label: 'KIND' },
  { key: 'threshold', label: 'THRESHOLD' },
  { key: 'severity', label: 'SEVERITY' },
  { key: 'channels', label: 'CHANNELS' },
  { key: 'cooldown', label: 'COOLDOWN' },
  { key: 'status', label: 'STATUS' },
]

function kindLabel(kind: string) {
  return ALERT_RULE_KINDS.find((k) => k.value === kind)?.label ?? kind
}

function thresholdLabel(threshold: Record<string, unknown>) {
  if (!threshold || Object.keys(threshold).length === 0) return '—'
  const value = threshold.value ?? threshold.min ?? threshold.max
  if (value != null) return String(value)
  return JSON.stringify(threshold)
}

function severityTone(severity: string) {
  if (severity === 'CRITICAL') return 'danger' as const
  if (severity === 'WARNING') return 'warning' as const
  return 'default' as const
}

export function rulesKpis(openAlertCount: number | string, rules: AlertRuleApi[]) {
  return [
    {
      title: 'Active rules',
      value: String(rules.filter((r) => r.status === 'ACTIVE').length),
      sub: `${rules.length} configured`,
      tone: 'success' as const,
    },
    {
      title: 'Paused rules',
      value: String(rules.filter((r) => r.status === 'PAUSED').length),
      sub: 'Skipped by evaluator',
      tone: 'warning' as const,
    },
    {
      title: 'Critical rules',
      value: String(rules.filter((r) => r.severity === 'CRITICAL').length),
      sub: 'Page ops on fire',
      tone: 'default' as const,
    },
    {
      title: 'Open alerts',
      value: String(openAlertCount),
      sub: 'Live alert queue',
      tone: 'default' as const,
    },
  ]
}

function RuleStatusToggle({ rule }: { rule: AlertRuleApi }) {
  const update = useUpdateAlertRule(rule.id)
  const next = rule.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE'
  return (
    <button
      type="button"
      title={rule.status === 'ACTIVE' ? 'Pause rule' : 'Activate rule'}
      disabled={update.isPending}
      onClick={(event) => {
        event.stopPropagation()
        update.mutate(
          { status: next },
          {
            onError: (err) =>
              notifications.show({
                color: 'red',
                message: apiErrorMessage(err, 'Could not update rule'),
              }),
          },
        )
      }}
    >
      <TableStatusBadge
        label={rule.status === 'ACTIVE' ? 'Active' : 'Paused'}
        tone={rule.status === 'ACTIVE' ? 'success' : 'warning'}
      />
    </button>
  )
}

export function AlertRulesTab() {
  const navigate = useNavigate()
  const { rules, isPending, isError } = useAlertRules()

  if (isPending) return <LoadingState variant="inline" cols={7} rows={6} />
  if (isError) {
    return (
      <p className="p-4 text-[13px] text-[var(--mu)]">
        Could not load alert rules (need alerts:read).
      </p>
    )
  }

  return (
    <DynamicTableSection<AlertRuleApi>
      variant="embedded"
      headers={RULE_HEADERS}
      data={rules}
      getRowKey={(item) => item.id}
      onRowClick={(item) => navigate(`/alerts/rules/${item.id}/edit`)}
      rowActionLabel="Edit rule"
      toolbar={{
        title: 'Alert rules',
        showFilter: false,
        actions: (
          <Button
            leftSection={<PlusSignIcon size={16} />}
            className="bg-[var(--pr)] hover:opacity-90"
            onClick={() => navigate('/alerts/rules/new')}
          >
            New rule
          </Button>
        ),
      }}
      renderItems={(rule) => [
        <span key="name" className="text-xs font-bold text-[var(--tx)]">
          {rule.name}
        </span>,
        <span key="kind" className="text-xs text-[var(--mu)]">
          {kindLabel(rule.kind)}
        </span>,
        <span key="threshold" className="font-mono text-xs text-[var(--tx)]">
          {thresholdLabel(rule.threshold)}
        </span>,
        <TableStatusBadge
          key="sev"
          label={rule.severity}
          tone={severityTone(rule.severity)}
        />,
        <span key="ch" className="text-xs text-[var(--mu)]">
          {(rule.channels ?? []).join(', ') || '—'}
        </span>,
        <span key="cd" className="text-xs text-[var(--mu)]">
          {rule.cooldown_minutes} min
        </span>,
        <RuleStatusToggle key="st" rule={rule} />,
      ]}
    />
  )
}
