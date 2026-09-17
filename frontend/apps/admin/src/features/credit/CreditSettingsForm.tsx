import { useEffect, useMemo, useState } from 'react'
import { Button, NumberInput, MultiSelect, Switch, Text } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import {
  AdminConfirmModal,
  KuraIllustrationModal,
} from '@shared/components'
import { apiErrorMessage } from '@lib/api/auth'
import {
  FeatureMasterSwitch,
  useConfigNamespace,
  useProposeConfig,
} from '@features/platform-config'
import type { CreditSettingsDraft } from './types'

const TENOR_OPTIONS = [
  { value: '7', label: '7 days' },
  { value: '14', label: '14 days' },
  { value: '30', label: '30 days' },
]

function draftFromEffective(
  effective: Record<string, unknown> | undefined,
): CreditSettingsDraft {
  const tenorRaw = effective?.tenor_days
  const tenor =
    Array.isArray(tenorRaw) && tenorRaw.every((n) => typeof n === 'number')
      ? (tenorRaw as number[])
      : [7, 14, 30]
  return {
    score_threshold: Number(effective?.score_threshold ?? 60),
    min_active_days: Number(effective?.min_active_days ?? 60),
    min_on_time_pct: Number(effective?.min_on_time_pct ?? 80),
    min_trusted_device_days: Number(effective?.min_trusted_device_days ?? 7),
    min_amount_kobo: Number(effective?.min_amount_kobo ?? 500_000),
    max_amount_kobo: Number(effective?.max_amount_kobo ?? 5_000_000),
    tenor_days: tenor,
    interest_rate_bps: Number(effective?.interest_rate_bps ?? 500),
    auto_approve_max_kobo: Number(effective?.auto_approve_max_kobo ?? 0),
    enabled: Boolean(effective?.enabled),
  }
}

export function CreditSettingsForm() {
  const { data, isLoading } = useConfigNamespace('credit')
  const propose = useProposeConfig('credit')
  const [draft, setDraft] = useState<CreditSettingsDraft>(() =>
    draftFromEffective(undefined),
  )
  const [confirmPropose, setConfirmPropose] = useState(false)
  const [proposedOk, setProposedOk] = useState(false)

  useEffect(() => {
    if (data?.effective) setDraft(draftFromEffective(data.effective))
  }, [data?.effective])

  const baseline = useMemo(
    () => draftFromEffective(data?.effective),
    [data?.effective],
  )
  const dirty = JSON.stringify(draft) !== JSON.stringify(baseline)

  const patch = <K extends keyof CreditSettingsDraft>(
    key: K,
    value: CreditSettingsDraft[K],
  ) => setDraft((prev) => ({ ...prev, [key]: value }))

  const save = () => {
    propose.mutate(
      {
        value: { ...draft },
        note: 'Credit scoring params update',
      },
      {
        onSuccess: () => {
          setConfirmPropose(false)
          setProposedOk(true)
        },
        onError: (err) =>
          notifications.show({
            color: 'red',
            title: 'Could not propose',
            message: apiErrorMessage(err, 'Check credit:approve capability.'),
          }),
      },
    )
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      <FeatureMasterSwitch
        namespace="credit"
        title="Allow Credit"
        description="Master switch for swap-credit. Propose → second admin approves. Off by default in production."
      />
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-[15px] font-bold text-[var(--tx)]">
            Scoring & product params
          </h3>
          <Text size="xs" c="dimmed" mt={4}>
            Proposes a ConfigVersion for maker-checker. Amounts are in kobo.
          </Text>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="default"
            size="xs"
            disabled={!dirty || propose.isPending}
            onClick={() => setDraft(baseline)}
          >
            Reset
          </Button>
          <Button
            size="xs"
            disabled={!dirty || isLoading}
            loading={propose.isPending}
            onClick={() => setConfirmPropose(true)}
          >
            Propose changes
          </Button>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <NumberInput
          label="Score threshold"
          min={0}
          max={100}
          value={draft.score_threshold}
          onChange={(v) => patch('score_threshold', Number(v) || 0)}
        />
        <NumberInput
          label="Min active days"
          min={0}
          value={draft.min_active_days}
          onChange={(v) => patch('min_active_days', Number(v) || 0)}
        />
        <NumberInput
          label="Min on-time %"
          min={0}
          max={100}
          value={draft.min_on_time_pct}
          onChange={(v) => patch('min_on_time_pct', Number(v) || 0)}
        />
        <NumberInput
          label="Min trusted browser days"
          description="PWA: days this browser install must be known"
          min={0}
          value={draft.min_trusted_device_days}
          onChange={(v) => patch('min_trusted_device_days', Number(v) || 0)}
        />
        <NumberInput
          label="Auto-approve max (kobo)"
          description="0 = all apps need ops review"
          min={0}
          thousandSeparator
          value={draft.auto_approve_max_kobo}
          onChange={(v) => patch('auto_approve_max_kobo', Number(v) || 0)}
        />
        <NumberInput
          label="Min amount (kobo)"
          min={0}
          thousandSeparator
          value={draft.min_amount_kobo}
          onChange={(v) => patch('min_amount_kobo', Number(v) || 0)}
        />
        <NumberInput
          label="Max amount (kobo)"
          min={0}
          thousandSeparator
          value={draft.max_amount_kobo}
          onChange={(v) => patch('max_amount_kobo', Number(v) || 0)}
        />
        <NumberInput
          label="Interest (bps)"
          min={0}
          value={draft.interest_rate_bps}
          onChange={(v) => patch('interest_rate_bps', Number(v) || 0)}
        />
        <MultiSelect
          className="sm:col-span-2"
          label="Tenor days"
          data={TENOR_OPTIONS}
          value={draft.tenor_days.map(String)}
          onChange={(vals) =>
            patch(
              'tenor_days',
              vals.map(Number).filter((n) => Number.isFinite(n)),
            )
          }
        />
        <Switch
          className="self-end"
          label="Enabled in proposed value"
          checked={draft.enabled}
          onChange={(e) => patch('enabled', e.currentTarget.checked)}
        />
      </div>
      {data?.pending ? (
        <Text size="xs" c="orange.7" fw={600}>
          Pending proposal from{' '}
          {new Date(data.pending.created_at).toLocaleString()}
        </Text>
      ) : null}

      <AdminConfirmModal
        opened={confirmPropose}
        onClose={() => setConfirmPropose(false)}
        title="Propose credit settings?"
        body="Queues these scoring params for maker-checker. Super Admin can self-approve; other roles need a second admin."
        confirmLabel="Propose changes"
        illustrationId="confirm-action"
        loading={propose.isPending}
        onConfirm={save}
      />

      <KuraIllustrationModal
        opened={proposedOk}
        onClose={() => setProposedOk(false)}
        illustrationId="confirm-action"
        title="Change proposed"
        description="Credit settings queued. Approve when ready."
        primaryAction={{
          label: 'Done',
          onClick: () => setProposedOk(false),
        }}
      />
    </div>
  )
}
