import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  MultiSelect,
  NumberInput,
  Select,
  Text,
  TextInput,
  Title,
} from '@mantine/core'
import {
  AdminFormSuccessModal,
  FormFooterActions,
  SidebarFormLayout,
} from '@shared/components'
import type {
  AlertRuleChannel,
  AlertRuleOp,
  AlertRuleRecord,
  AlertRuleSignal,
} from '@shared/mock/adminMockData'
import {
  ALERT_CHANNEL_OPTIONS,
  ALERT_OP_OPTIONS,
  ALERT_SCOPE_OPTIONS,
  ALERT_SEVERITY_OPTIONS,
  ALERT_SIGNAL_CATALOG,
  defaultRuleName,
  getAlertSignalMeta,
} from './alertRuleCatalog'
import {
  findAlertRule,
  nextAlertRuleId,
  upsertAlertRule,
} from './alertRulesStore'

const CREATE_TIPS = [
  'Signals are a fixed catalog — the backend evaluator only understands these IDs.',
  'Cooldown stops the same rule + scope from re-firing until it expires.',
  'Dashboard is always available; SMS / WhatsApp need ops numbers configured.',
]

const EDIT_TIPS = [
  'Changing the signal resets default op, threshold, severity, and cooldown.',
  'Paused rules stay in the catalog but are skipped by the evaluator.',
  'Channel changes apply on the next fire after save.',
]

export function AlertRuleFormPanel({ ruleId }: { ruleId?: string }) {
  const navigate = useNavigate()
  const existing = useMemo(
    () => (ruleId ? findAlertRule(ruleId) : null),
    [ruleId],
  )
  const isEdit = Boolean(existing)

  const seed = existing ?? null
  const initialSignal = seed?.signal ?? ALERT_SIGNAL_CATALOG[0]!.id
  const initialMeta = getAlertSignalMeta(initialSignal)

  const [name, setName] = useState(seed?.name ?? '')
  const [signal, setSignal] = useState<AlertRuleSignal>(initialSignal)
  const [op, setOp] = useState<AlertRuleOp>(seed?.op ?? initialMeta.defaultOp)
  const [thresholdValue, setThresholdValue] = useState(
    seed?.thresholdValue ?? initialMeta.defaultValue,
  )
  const [severity, setSeverity] = useState<AlertRuleRecord['severity']>(
    seed?.severity ?? initialMeta.defaultSeverity,
  )
  const [scope, setScope] = useState<AlertRuleRecord['scope']>(
    seed?.scope ?? 'all',
  )
  const [channels, setChannels] = useState<AlertRuleChannel[]>(
    seed?.channels ?? ['dashboard'],
  )
  const [cooldownMinutes, setCooldownMinutes] = useState(
    seed?.cooldownMinutes ?? initialMeta.defaultCooldownMinutes,
  )
  const [savedId, setSavedId] = useState<string | null>(null)

  const meta = getAlertSignalMeta(signal)
  const valid =
    thresholdValue > 0 && channels.length > 0 && cooldownMinutes >= 1

  const leave = () => navigate('/alerts?tab=rules')

  const applySignal = (next: AlertRuleSignal) => {
    const m = getAlertSignalMeta(next)
    setSignal(next)
    setOp(m.defaultOp)
    setThresholdValue(m.defaultValue)
    setSeverity(m.defaultSeverity)
    setCooldownMinutes(m.defaultCooldownMinutes)
    setName((prev) => {
      const auto = defaultRuleName(signal, op, thresholdValue)
      if (!prev.trim() || prev === auto) {
        return defaultRuleName(next, m.defaultOp, m.defaultValue)
      }
      return prev
    })
  }

  const onSave = () => {
    if (!valid) return
    const resolvedName =
      name.trim() || defaultRuleName(signal, op, thresholdValue)
    const id = existing?.id ?? nextAlertRuleId()
    upsertAlertRule({
      id,
      name: resolvedName,
      signal,
      op,
      thresholdValue,
      severity,
      scope,
      channels,
      cooldownMinutes,
      status: existing?.status ?? 'ACTIVE',
    })
    setSavedId(id)
  }

  return (
    <>
      <SidebarFormLayout
        sidebarTitle={isEdit ? 'Edit alert rule' : 'New alert rule'}
        sidebarSubtitle="Ops · Alerts"
        sidebarTips={isEdit ? EDIT_TIPS : CREATE_TIPS}
        steps={[{ label: 'Signal & threshold' }]}
        activeStep={0}
        onClose={leave}
        headerActionLabel="Close ×"
        footer={
          <FormFooterActions
            onBack={leave}
            submitLabel={isEdit ? 'Save rule' : 'Create rule'}
            submitType="button"
            disabled={!valid}
            onSubmitClick={onSave}
          />
        }
      >
        <div>
          <Title order={2} className="text-[var(--tx)]">
            {isEdit ? 'Rule configuration' : 'Create rule'}
          </Title>
          <Text size="sm" c="dimmed" mt={6}>
            Pick a built-in signal, set the threshold and channels. The evaluator
            owns firing — this screen is config only.
          </Text>
        </div>

        <Select
          label="Signal"
          description={meta.description}
          data={ALERT_SIGNAL_CATALOG.map((s) => ({
            value: s.id,
            label: s.label,
          }))}
          value={signal}
          onChange={(v) => {
            if (v) applySignal(v as AlertRuleSignal)
          }}
          allowDeselect={false}
        />

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[120px_1fr]">
          <Select
            label="Operator"
            data={ALERT_OP_OPTIONS}
            value={op}
            onChange={(v) => {
              if (v) setOp(v as AlertRuleOp)
            }}
            allowDeselect={false}
          />
          <NumberInput
            label={`Threshold (${meta.unit})`}
            value={thresholdValue}
            min={1}
            onChange={(v) => {
              if (typeof v === 'number') setThresholdValue(v)
            }}
          />
        </div>

        <TextInput
          label="Display name"
          description="Optional — defaults from signal + threshold"
          value={name}
          onChange={(e) => setName(e.currentTarget.value)}
          placeholder={defaultRuleName(signal, op, thresholdValue)}
        />

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Select
            label="Severity"
            data={ALERT_SEVERITY_OPTIONS}
            value={severity}
            onChange={(v) => {
              if (v) setSeverity(v as AlertRuleRecord['severity'])
            }}
            allowDeselect={false}
          />
          <Select
            label="Scope"
            data={ALERT_SCOPE_OPTIONS}
            value={scope}
            onChange={(v) => {
              if (v) setScope(v as AlertRuleRecord['scope'])
            }}
            allowDeselect={false}
          />
        </div>

        <MultiSelect
          label="Channels"
          data={ALERT_CHANNEL_OPTIONS}
          value={channels}
          onChange={(v) => setChannels(v as AlertRuleChannel[])}
        />

        <NumberInput
          label="Cooldown (minutes)"
          description="Suppress re-fire for the same rule + scope"
          value={cooldownMinutes}
          min={1}
          onChange={(v) => {
            if (typeof v === 'number') setCooldownMinutes(v)
          }}
        />

        <Text size="xs" c="dimmed">
          Eval: {meta.evalMode === 'poll' ? 'periodic poll' : 'on domain event'} ·
          unit {meta.unit}
        </Text>
      </SidebarFormLayout>

      <AdminFormSuccessModal
        opened={!!savedId}
        onClose={() => {
          setSavedId(null)
          leave()
        }}
        title={isEdit ? 'Rule updated' : 'Rule created'}
        description={
          isEdit
            ? 'Config saved. The evaluator will use this on the next poll or matching event.'
            : 'Rule is active in the catalog. Pause it anytime from Alert Rules.'
        }
        actionLabel="Back to rules"
      />
    </>
  )
}
