import { useEffect, useState } from 'react'
import {
  Badge,
  Button,
  Group,
  Modal,
  NumberInput,
  Select,
  Switch,
  Text,
} from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { apiErrorMessage } from '@lib/api/auth'
import { useUpdateRiskRule } from './hooks/use-risk'
import { getRiskRuleMeta } from './riskRulesCatalog'
import type { RiskRuleApi } from './types'

const ACTION_OPTIONS = [
  { value: 'FLAG', label: 'FLAG — Flag for manual investigation' },
  { value: 'BLOCK', label: 'BLOCK — Hard block swap / transaction' },
  { value: 'SUSPEND', label: 'SUSPEND — Suspend driver account' },
  { value: 'RESTRICT', label: 'RESTRICT — Restrict finance / credit limits' },
  { value: 'FREEZE', label: 'FREEZE — Freeze wallet cash-outs' },
  { value: 'STEP_UP', label: 'STEP_UP — Enforce step-up MFA challenge' },
]

const SEVERITY_OPTIONS = [
  { value: 'LOW', label: 'Low' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HIGH', label: 'High' },
  { value: 'CRITICAL', label: 'Critical' },
]

type Props = {
  rule: RiskRuleApi | null
  opened: boolean
  onClose: () => void
  onUpdated?: () => void
}

export function EditRiskRuleModal({ rule, opened, onClose, onUpdated }: Props) {
  const updateRule = useUpdateRiskRule()
  const [action, setAction] = useState<string>('FLAG')
  const [severity, setSeverity] = useState<string>('MEDIUM')
  const [enabled, setEnabled] = useState<boolean>(true)
  const [params, setParams] = useState<Record<string, unknown>>({})

  useEffect(() => {
    if (rule) {
      setAction(rule.action)
      setSeverity(rule.severity)
      setEnabled(rule.enabled)
      setParams(rule.params ? { ...rule.params } : {})
    }
  }, [rule])

  if (!rule) return null

  const meta = getRiskRuleMeta(rule.code)

  const handleParamChange = (key: string, value: number | string) => {
    setParams((prev) => ({
      ...prev,
      [key]: value,
    }))
  }

  const handleSave = async () => {
    try {
      await updateRule.mutateAsync({
        id: rule.id,
        action,
        severity: severity as any,
        enabled,
        params,
      })
      notifications.show({
        color: 'green',
        message: `Risk rule "${rule.name}" updated successfully`,
      })
      onUpdated?.()
      onClose()
    } catch (err) {
      notifications.show({
        color: 'red',
        message: apiErrorMessage(err, 'Failed to update risk rule'),
      })
    }
  }

  const paramKeys = Object.keys(params)

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <span className="text-[15px] font-bold text-[var(--tx)]">
            Configure Risk Rule
          </span>
          <Badge size="sm" variant="light" color="cyan">
            {rule.code}
          </Badge>
        </div>
      }
      centered
      size="md"
      radius="md"
    >
      <div className="flex flex-col gap-4">
        <div className="rounded-[8px] border border-[var(--bd)] bg-[var(--bg-muted)] p-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[var(--tx)]">
              {rule.name}
            </span>
            <span className="text-[11px] font-semibold text-[var(--mu)]">
              {meta.domain} · {meta.subject}
            </span>
          </div>
          <p className="mt-1 text-xs text-[var(--mu)] leading-relaxed">
            {meta.description}
          </p>
        </div>

        <div className="flex items-center justify-between rounded-[8px] border border-[var(--bd)] p-3">
          <div>
            <Text size="xs" fw={700} className="text-[var(--tx)]">
              Rule Status
            </Text>
            <Text size="xs" c="dimmed">
              {enabled
                ? 'Active: Evaluated automatically on live transactions.'
                : 'Paused: Evaluator skips this rule.'}
            </Text>
          </div>
          <Switch
            checked={enabled}
            onChange={(e) => setEnabled(e.currentTarget.checked)}
            color="teal"
            size="md"
          />
        </div>

        <Select
          label="Enforcement Action"
          description="Action executed when this fraud rule triggers"
          data={ACTION_OPTIONS}
          value={action}
          onChange={(val) => val && setAction(val)}
        />

        <Select
          label="Alert Severity"
          description="Severity assigned to resulting review events"
          data={SEVERITY_OPTIONS}
          value={severity}
          onChange={(val) => val && setSeverity(val)}
        />

        {paramKeys.length > 0 ? (
          <div className="flex flex-col gap-2.5 rounded-[8px] border border-[var(--bd)] p-3">
            <Text size="xs" fw={700} className="text-[var(--tx)]">
              Threshold Parameters
            </Text>
            {paramKeys.map((key) => {
              const val = params[key]
              const isNumeric = typeof val === 'number'
              return (
                <div key={key}>
                  {isNumeric ? (
                    <NumberInput
                      label={key.replace(/_/g, ' ')}
                      value={val as number}
                      onChange={(num) => handleParamChange(key, num ?? 0)}
                      min={0}
                      size="xs"
                    />
                  ) : (
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[var(--mu)]">{key}:</span>
                      <span className="font-mono text-[var(--tx)]">
                        {String(val)}
                      </span>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        ) : null}

        <Group justify="flex-end" mt="xs">
          <Button variant="subtle" onClick={onClose} color="gray">
            Cancel
          </Button>
          <Button
            className="bg-[var(--pr)] hover:opacity-90"
            loading={updateRule.isPending}
            onClick={handleSave}
          >
            Save Changes
          </Button>
        </Group>
      </div>
    </Modal>
  )
}
