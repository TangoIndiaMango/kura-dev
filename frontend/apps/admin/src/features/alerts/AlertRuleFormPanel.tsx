import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MultiSelect, NumberInput, Select, TextInput } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import {
  AdminFormSuccessModal,
  FormFooterActions,
  LoadingState,
  SidebarFormLayout,
} from '@shared/components'
import { apiErrorMessage } from '@lib/api/auth'
import { ALERT_RULE_CHANNELS, ALERT_RULE_KINDS } from './constants'
import {
  useAlertRule,
  useCreateAlertRule,
  useUpdateAlertRule,
} from './hooks/use-alert-rules'

const TIPS = [
  'Kind maps to Alert.kind — evaluator matches open alerts of the same kind.',
  'Cooldown stops the same rule from re-firing until it expires.',
  'Channels are delivery hints; IN_APP is always available.',
]

export function AlertRuleFormPanel({ ruleId }: { ruleId?: string }) {
  const navigate = useNavigate()
  const isEdit = Boolean(ruleId)
  const existing = useAlertRule(ruleId, { enabled: isEdit })
  const create = useCreateAlertRule()
  const update = useUpdateAlertRule(ruleId ?? '')

  const [name, setName] = useState('')
  const [kind, setKind] = useState<string>(ALERT_RULE_KINDS[0]!.value)
  const [severity, setSeverity] = useState('WARNING')
  const [thresholdValue, setThresholdValue] = useState<number | string>(1)
  const [channels, setChannels] = useState<string[]>(['IN_APP'])
  const [cooldown, setCooldown] = useState(30)
  const [savedId, setSavedId] = useState<string | null>(null)

  useEffect(() => {
    const row = existing.data
    if (!row) return
    setName(row.name)
    setKind(row.kind)
    setSeverity(row.severity)
    const tv = row.threshold?.value
    setThresholdValue(typeof tv === 'number' ? tv : Number(tv) || 1)
    setChannels(row.channels?.length ? row.channels : ['IN_APP'])
    setCooldown(row.cooldown_minutes || 30)
  }, [existing.data])

  const leave = () => navigate('/alerts?tab=rules')
  const valid =
    name.trim().length > 0 &&
    kind &&
    channels.length > 0 &&
    Number(cooldown) >= 1 &&
    Number(thresholdValue) > 0

  const onSave = async () => {
    if (!valid) return
    const payload = {
      name: name.trim(),
      kind,
      severity,
      threshold: { value: Number(thresholdValue) },
      channels,
      cooldown_minutes: Number(cooldown),
    }
    try {
      if (isEdit && ruleId) {
        const row = await update.mutateAsync(payload)
        setSavedId(row.id)
      } else {
        const row = await create.mutateAsync(payload)
        setSavedId(row.id)
      }
    } catch (err) {
      notifications.show({
        color: 'red',
        message: apiErrorMessage(err, 'Could not save rule'),
      })
    }
  }

  if (isEdit && existing.isPending) {
    return <LoadingState variant="inline" cols={2} rows={8} />
  }

  return (
    <>
      <SidebarFormLayout
        sidebarTitle={isEdit ? 'Edit alert rule' : 'New alert rule'}
        sidebarTips={TIPS}
        steps={[{ label: 'Rule' }]}
        activeStep={0}
        onClose={leave}
        footer={
          <FormFooterActions
            onBack={leave}
            onSubmitClick={onSave}
            submitType="button"
            submitLabel={isEdit ? 'Save rule' : 'Create rule'}
            disabled={!valid}
            loading={create.isPending || update.isPending}
          />
        }
      >
        <div className="flex flex-col gap-3">
          <TextInput
            label="Name"
            value={name}
            onChange={(e) => setName(e.currentTarget.value)}
            required
          />
          <Select
            label="Kind"
            data={[...ALERT_RULE_KINDS]}
            value={kind}
            onChange={(v) => v && setKind(v)}
            required
          />
          <Select
            label="Severity"
            data={[
              { value: 'INFO', label: 'Info' },
              { value: 'WARNING', label: 'Warning' },
              { value: 'CRITICAL', label: 'Critical' },
            ]}
            value={severity}
            onChange={(v) => v && setSeverity(v)}
          />
          <NumberInput
            label="Threshold value"
            value={thresholdValue}
            onChange={setThresholdValue}
            min={1}
          />
          <MultiSelect
            label="Channels"
            data={[...ALERT_RULE_CHANNELS]}
            value={channels}
            onChange={setChannels}
          />
          <NumberInput
            label="Cooldown (minutes)"
            value={cooldown}
            onChange={(v) => setCooldown(typeof v === 'number' ? v : 30)}
            min={1}
          />
        </div>
      </SidebarFormLayout>
      <AdminFormSuccessModal
        opened={Boolean(savedId)}
        mode={isEdit ? 'saved' : 'created'}
        title={isEdit ? 'Rule updated' : 'Rule created'}
        description="Persisted to operations alert-rules. Evaluator can match open alerts by kind."
        onClose={leave}
      />
    </>
  )
}
