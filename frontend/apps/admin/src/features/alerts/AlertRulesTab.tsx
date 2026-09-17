import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@mantine/core'
import { PlusSignIcon } from 'hugeicons-react'
import {
  DynamicTableSection,
  TableStatusBadge,
  type TableHeader,
} from '@shared/components'
import type { AlertRuleRecord } from '@shared/mock/adminMockData'
import {
  formatAlertRuleChannels,
  formatAlertRuleMetric,
  formatAlertRuleThreshold,
} from './alertRuleCatalog'
import { listAlertRules, setAlertRuleStatus } from './alertRulesStore'

const RULE_HEADERS: TableHeader[] = [
  { key: 'name', label: 'RULE' },
  { key: 'metric', label: 'SIGNAL' },
  { key: 'threshold', label: 'THRESHOLD' },
  { key: 'severity', label: 'SEVERITY' },
  { key: 'channels', label: 'CHANNELS' },
  { key: 'cooldown', label: 'COOLDOWN' },
  { key: 'status', label: 'STATUS' },
]

function severityTone(severity: AlertRuleRecord['severity']) {
  if (severity === 'CRITICAL') return 'danger' as const
  if (severity === 'OPERATIONAL') return 'warning' as const
  return 'default' as const
}

export function rulesKpis(openAlertCount: number | string) {
  const rules = listAlertRules()
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

export function AlertRulesTab() {
  const navigate = useNavigate()
  const [rules, setRules] = useState<AlertRuleRecord[]>(() => listAlertRules())

  const toggleStatus = (rule: AlertRuleRecord) => {
    setAlertRuleStatus(rule.id, rule.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE')
    setRules(listAlertRules())
  }

  return (
    <DynamicTableSection<AlertRuleRecord>
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
        <span key="metric" className="text-xs text-[var(--mu)]">
          {formatAlertRuleMetric(rule.signal)}
        </span>,
        <span key="threshold" className="font-mono text-xs text-[var(--tx)]">
          {formatAlertRuleThreshold(rule)}
        </span>,
        <TableStatusBadge
          key="sev"
          label={rule.severity}
          tone={severityTone(rule.severity)}
        />,
        <span key="ch" className="text-xs text-[var(--mu)]">
          {formatAlertRuleChannels(rule.channels)}
        </span>,
        <span key="cd" className="text-xs text-[var(--mu)]">
          {rule.cooldownMinutes} min
        </span>,
        <button
          key="st"
          type="button"
          title={rule.status === 'ACTIVE' ? 'Pause rule' : 'Activate rule'}
          onClick={(event) => {
            event.stopPropagation()
            toggleStatus(rule)
          }}
        >
          <TableStatusBadge
            label={rule.status === 'ACTIVE' ? 'Active' : 'Paused'}
            tone={rule.status === 'ACTIVE' ? 'success' : 'warning'}
          />
        </button>,
      ]}
    />
  )
}
