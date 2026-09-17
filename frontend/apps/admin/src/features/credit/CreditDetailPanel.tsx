import { useState, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button, NumberInput, Textarea, useMantineColorScheme } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import {
  AdminConfirmModal,
  AdminDetailPage,
  DetailPageLoadingSkeleton,
  IllustratedFormModal,
  KuraIllustrationModal,
} from '@shared/components'
import { illustrationSrc } from '@shared/illustrations/catalog'
import { useOperator } from '@features/operators'
import { useConfigNamespace } from '@features/platform-config'
import { formatNaira } from '@shared/utils/currency'
import { downloadCsv } from '@shared/utils/downloadCsv'
import { scoreTone } from './creditScoreMap'
import {
  useAccountCreditScore,
  useCreditLoans,
  useOverrideCreditScore,
} from './hooks/use-credit'

function Fact({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="min-w-0">
      <div className="text-[11.5px] font-semibold uppercase tracking-wide text-[var(--su)]">
        {label}
      </div>
      <div className="mt-0.5 text-[13.5px] font-medium text-[var(--tx)]">{value}</div>
    </div>
  )
}

export function CreditDetailPanel({ id }: { id: string }) {
  const navigate = useNavigate()
  const { colorScheme } = useMantineColorScheme()
  const themeKey = colorScheme === 'dark' ? 'dark' : 'light'
  const { data: creditConfig } = useConfigNamespace('credit')
  const threshold = Number(creditConfig?.effective?.score_threshold ?? 60)
  const { score, isPending, isError, refetch } = useAccountCreditScore(id, {
    threshold,
  })
  const { operator } = useOperator(id)
  const { loans } = useCreditLoans(
    { page_size: 50 },
    { enabled: Boolean(id) },
  )
  const override = useOverrideCreditScore()

  const [overrideOpen, setOverrideOpen] = useState(false)
  const [draftScore, setDraftScore] = useState<number | string>(70)
  const [draftLimitNaira, setDraftLimitNaira] = useState<number | string>(50000)
  const [reason, setReason] = useState('')
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [success, setSuccess] = useState(false)

  if (isPending) return <DetailPageLoadingSkeleton />

  if (isError || !score) {
    return (
      <AdminDetailPage
        backLabel="Back to credit"
        onBack={() => navigate('/credit')}
        title="Score not found"
        summaryRows={[{ label: 'Account', value: id }]}
      />
    )
  }

  const activeLoans = loans.filter(
    (l) =>
      l.account_id === id &&
      ['ACTIVE', 'GRACE', 'RESTRICTED'].includes(l.status),
  ).length
  const displayName = operator?.name ?? score.accountId

  const submitOverride = () => {
    const nextScore = Number(draftScore)
    const limitKobo = Math.round(Number(draftLimitNaira) * 100)
    if (!Number.isFinite(nextScore) || !Number.isFinite(limitKobo) || !reason.trim()) {
      return
    }
    override.mutate(
      {
        account_id: id,
        score: Math.min(100, Math.max(0, Math.round(nextScore))),
        recommended_limit_kobo: Math.max(0, limitKobo),
        reason: reason.trim(),
      },
      {
        onSuccess: () => {
          setConfirmOpen(false)
          setOverrideOpen(false)
          setSuccess(true)
          refetch()
        },
        onError: () =>
          notifications.show({
            color: 'red',
            title: 'Override failed',
            message: 'Check credit:approve and input values.',
          }),
      },
    )
  }

  const overview = (
    <div className="grid gap-4 sm:grid-cols-2">
      <Fact
        label="Account"
        value={
          <Link
            to={`/operators/${id}`}
            className="font-semibold text-[var(--pr)] hover:underline"
          >
            {displayName}
          </Link>
        }
      />
      <Fact label="KURA ID" value={operator?.kuraId ?? '—'} />
      <Fact label="Score" value={String(score.score)} />
      <Fact
        label="Limit"
        value={formatNaira(score.limitKobo, { fromKobo: true })}
      />
      <Fact label="Active loans" value={String(activeLoans)} />
      <Fact label="Computed by" value={score.computedBy} />
      <Fact
        label="Computed at"
        value={new Date(score.computedAt).toLocaleString()}
      />
      {score.overrideReason ? (
        <Fact label="Override reason" value={score.overrideReason} />
      ) : null}
    </div>
  )

  return (
    <>
      <AdminDetailPage
        backLabel="Back to credit"
        onBack={() => navigate('/credit')}
        breadcrumbs={[
          { label: 'Credit Scoring', to: '/credit' },
          { label: displayName },
        ]}
        title={displayName}
        subtitle={`${operator?.kuraId ?? id} · ${formatNaira(score.limitKobo, { fromKobo: true })} limit`}
        statusLabel={score.status.replace(/_/g, ' ')}
        statusTone={scoreTone(score.status)}
        actions={[
          {
            id: 'override',
            label: 'Manual Override',
            onClick: () => {
              setDraftScore(score.score)
              setDraftLimitNaira(Math.round(score.limitKobo / 100))
              setReason('')
              setOverrideOpen(true)
            },
          },
          {
            id: 'export',
            label: 'Export CSV',
            onClick: () =>
              downloadCsv(
                `${id}-score.csv`,
                ['account_id', 'score', 'limit_kobo', 'status'],
                [[id, score.score, score.limitKobo, score.status]],
              ),
          },
        ]}
        tabs={[{ id: 'overview', label: 'Overview', content: overview }]}
      />

      <IllustratedFormModal
        opened={overrideOpen}
        onClose={() => setOverrideOpen(false)}
        illustration={illustrationSrc('manual-override', themeKey)}
        title="Manual score override"
        description="Sets score and recommended limit. Requires an audit reason."
      >
        <NumberInput
          label="Score"
          min={0}
          max={100}
          value={draftScore}
          onChange={setDraftScore}
        />
        <NumberInput
          mt="sm"
          label="Recommended limit (₦)"
          min={0}
          thousandSeparator
          value={draftLimitNaira}
          onChange={setDraftLimitNaira}
        />
        <Textarea
          mt="sm"
          label="Reason"
          required
          minRows={2}
          value={reason}
          onChange={(e) => setReason(e.currentTarget.value)}
        />
        <Button
          mt="md"
          color="brand"
          disabled={!reason.trim()}
          loading={override.isPending}
          onClick={() => setConfirmOpen(true)}
        >
          Continue
        </Button>
      </IllustratedFormModal>

      <AdminConfirmModal
        opened={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Apply override?"
        body="This updates eligibility outside the model and is audited."
        confirmLabel="Apply"
        reasonRequired={false}
        illustrationId="confirm-action"
        onConfirm={submitOverride}
      />

      <KuraIllustrationModal
        opened={success}
        onClose={() => setSuccess(false)}
        illustrationId="manual-override"
        title="Override applied"
        description={`${displayName} · score updated`}
        primaryAction={{ label: 'Done', onClick: () => setSuccess(false) }}
      />
    </>
  )
}
