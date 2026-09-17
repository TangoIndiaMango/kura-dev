import { useMemo, useState } from 'react'
import { Skeleton } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import {
  DynamicTableSection,
  TableStatusBadge,
  type TableHeader,
} from '@shared/components'
import { apiErrorMessage } from '@lib/api/auth'
import { EditRiskRuleModal } from './EditRiskRuleModal'
import { useRiskRules, useUpdateRiskRule } from './hooks/use-risk'
import {
  formatRuleParams,
  getRiskRuleMeta,
  riskActionLabel,
  riskActionTone,
} from './riskRulesCatalog'
import { severityTone } from './riskQueueMetrics'
import type { RiskRuleApi } from './types'

const RULE_HEADERS: TableHeader[] = [
  { key: 'name', label: 'RULE' },
  { key: 'domain', label: 'DOMAIN / SUBJECT' },
  { key: 'action', label: 'ACTION' },
  { key: 'threshold', label: 'THRESHOLDS / PARAMS' },
  { key: 'severity', label: 'SEVERITY' },
  { key: 'status', label: 'STATUS' },
]

export function riskRulesKpis(rules: RiskRuleApi[]) {
  const activeCount = rules.filter((r) => r.enabled).length
  const pausedCount = rules.filter((r) => !r.enabled).length
  const blockCount = rules.filter(
    (r) => r.action === 'BLOCK' || r.action === 'SUSPEND' || r.action === 'RESTRICT',
  ).length
  const flagCount = rules.filter((r) => r.action === 'FLAG').length

  return [
    {
      title: 'Active rules',
      value: String(activeCount),
      sub: `${rules.length} configured in catalogue`,
      tone: 'success' as const,
    },
    {
      title: 'Block / Suspend',
      value: String(blockCount),
      sub: 'Hard enforcement rules',
      tone: 'danger' as const,
    },
    {
      title: 'Flag for review',
      value: String(flagCount),
      sub: 'Enters investigator queue',
      tone: 'default' as const,
    },
    {
      title: 'Paused rules',
      value: String(pausedCount),
      sub: 'Skipped by evaluator',
      tone: 'warning' as const,
    },
  ]
}

export function RiskRulesTab() {
  const { rules, isPending, isError, refetch } = useRiskRules()
  const updateRule = useUpdateRiskRule()
  const [selectedRule, setSelectedRule] = useState<RiskRuleApi | null>(null)
  const [modalOpened, setModalOpened] = useState(false)
  const [search, setSearch] = useState('')

  const filteredRules = useMemo(() => {
    if (!search.trim()) return rules
    const q = search.toLowerCase()
    return rules.filter((r) => {
      const meta = getRiskRuleMeta(r.code)
      return (
        r.name.toLowerCase().includes(q) ||
        r.code.toLowerCase().includes(q) ||
        meta.domain.toLowerCase().includes(q) ||
        r.action.toLowerCase().includes(q)
      )
    })
  }, [rules, search])

  const toggleRuleStatus = async (rule: RiskRuleApi) => {
    const nextStatus = !rule.enabled
    try {
      await updateRule.mutateAsync({
        id: rule.id,
        enabled: nextStatus,
      })
      notifications.show({
        color: nextStatus ? 'green' : 'orange',
        message: `Rule "${rule.name}" is now ${nextStatus ? 'Active' : 'Paused'}`,
      })
      refetch()
    } catch (err) {
      notifications.show({
        color: 'red',
        message: apiErrorMessage(err, 'Failed to update rule status'),
      })
    }
  }

  const handleRowClick = (rule: RiskRuleApi) => {
    setSelectedRule(rule)
    setModalOpened(true)
  }

  if (isPending) {
    return <Skeleton height={280} radius="md" />
  }

  if (isError) {
    return (
      <p className="mb-4 text-[13px] text-[var(--mu)]">
        Could not load risk rules (need risk:read).
      </p>
    )
  }

  return (
    <>
      <DynamicTableSection<RiskRuleApi>
        variant="embedded"
        headers={RULE_HEADERS}
        data={filteredRules}
        getRowKey={(item) => item.id}
        onRowClick={handleRowClick}
        rowActionLabel="Configure rule"
        toolbar={{
          title: 'Risk rules',
          searchQuery: search,
          onSearchChange: setSearch,
          searchPlaceholder: 'Search rule name, code, domain…',
          showFilter: false,
          showExport: false,
        }}
        emptyTitle="No risk rules found"
        emptyMessage="Try clearing your search query."
        renderItems={(rule) => {
          const meta = getRiskRuleMeta(rule.code)
          return [
            <div key="name" className="flex flex-col">
              <span className="text-xs font-bold text-[var(--tx)]">
                {rule.name}
              </span>
              <span className="font-mono text-[10px] text-[var(--mu)]">
                {rule.code}
              </span>
            </div>,
            <span key="dom" className="text-xs text-[var(--mu)]">
              {meta.domain} · {meta.subject}
            </span>,
            <TableStatusBadge
              key="act"
              label={riskActionLabel(rule.action)}
              tone={riskActionTone(rule.action)}
            />,
            <span key="th" className="font-mono text-xs text-[var(--tx)]">
              {formatRuleParams(rule.params)}
            </span>,
            <TableStatusBadge
              key="sev"
              label={rule.severity}
              tone={severityTone(rule.severity)}
            />,
            <button
              key="st"
              type="button"
              title={rule.enabled ? 'Click to pause rule' : 'Click to activate rule'}
              onClick={(event) => {
                event.stopPropagation()
                toggleRuleStatus(rule)
              }}
            >
              <TableStatusBadge
                label={rule.enabled ? 'Active' : 'Paused'}
                tone={rule.enabled ? 'success' : 'warning'}
              />
            </button>,
          ]
        }}
      />

      <EditRiskRuleModal
        rule={selectedRule}
        opened={modalOpened}
        onClose={() => {
          setModalOpened(false)
          setSelectedRule(null)
        }}
        onUpdated={() => refetch()}
      />
    </>
  )
}
