import { useState, type ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Skeleton, Text } from '@mantine/core'
import {
  AdminConfirmModal,
  AdminDetailPage,
  KuraIllustrationModal,
  type AdminDetailAction,
} from '@shared/components'
import { useReviewRiskEvent, useRiskEvent } from '@features/risk'
import { useCapabilities } from '../auth/useCapabilities'
import { ruleLabel, severityTone } from './riskQueueMetrics'

type ReviewChoice = 'REVIEWED_OK' | 'REVIEWED_FRAUD' | 'ESCALATED'

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

function formatWhen(iso: string) {
  try {
    return new Date(iso).toLocaleString()
  } catch {
    return iso
  }
}

function contextLines(context: Record<string, unknown>): string[] {
  return Object.entries(context).map(([key, val]) => {
    const rendered =
      typeof val === 'string' || typeof val === 'number' || typeof val === 'boolean'
        ? String(val)
        : JSON.stringify(val)
    return `${key}: ${rendered}`
  })
}

export function RiskDetailPanel() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { can } = useCapabilities()
  const { event, isPending, isError, refetch } = useRiskEvent(id)
  const review = useReviewRiskEvent(id ?? '')
  const [pending, setPending] = useState<ReviewChoice | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  if (isPending) {
    return (
      <div className="p-6">
        <Skeleton height={320} radius="md" />
      </div>
    )
  }

  if (isError || !event) {
    return (
      <AdminDetailPage
        backLabel="Back to risk"
        onBack={() => navigate('/risk')}
        title="Event not found"
        summaryRows={[{ label: 'ID', value: id ?? '—' }]}
      />
    )
  }

  const open = event.status === 'OPEN' || event.status === 'ESCALATED'
  const canReview = can('risk:review') && open

  const actions: AdminDetailAction[] = []
  if (canReview) {
    actions.push(
      {
        id: 'ok',
        label: 'Mark OK',
        onClick: () => setPending('REVIEWED_OK'),
      },
      {
        id: 'fraud',
        label: 'Confirm fraud',
        onClick: () => setPending('REVIEWED_FRAUD'),
      },
      {
        id: 'escalate',
        label: 'Escalate',
        onClick: () => setPending('ESCALATED'),
      },
    )
  }

  const isVelocity = event.rule_code === 'SWAP_VELOCITY'
  const confirmCopy: Record<
    ReviewChoice,
    { title: string; body: string; confirmLabel: string }
  > = {
    REVIEWED_OK: {
      title: isVelocity ? 'Allow bay exception?' : 'Mark as reviewed OK?',
      body: isVelocity
        ? 'Marks this velocity block reviewed and grants a short-lived bay exception (default 1 swap / 4 hours). Note is required for audit.'
        : 'Clears this flag as a false positive or acceptable risk.',
      confirmLabel: isVelocity ? 'Allow exception' : 'Mark OK',
    },
    REVIEWED_FRAUD: {
      title: 'Confirm fraud?',
      body: 'Records a fraud decision on this event. Follow account freeze playbooks separately. No bay exception is granted.',
      confirmLabel: 'Confirm fraud',
    },
    ESCALATED: {
      title: 'Escalate this event?',
      body: 'Keeps the item open for senior review.',
      confirmLabel: 'Escalate',
    },
  }

  const why = contextLines(event.context ?? {})

  return (
    <>
      <AdminDetailPage
        backLabel="Back to risk"
        onBack={() => navigate('/risk')}
        breadcrumbs={[
          { label: 'Risk', to: '/risk' },
          { label: event.rule_code },
        ]}
        title={ruleLabel(event.rule_code)}
        subtitle={`${event.severity} · ${event.rule_name}`}
        statusLabel={event.status.replace(/_/g, ' ')}
        statusTone={
          event.status === 'REVIEWED_OK'
            ? 'success'
            : event.status === 'REVIEWED_FRAUD'
              ? 'danger'
              : 'warning'
        }
        actions={actions}
        showActivity={false}
        showNotes={false}
      >
        <section className="rounded-[12px] border border-[var(--bd)] bg-[var(--sf)] p-4 shadow-[var(--sh)]">
          <Text fw={700} size="sm" className="mb-3 text-[var(--tx)]">
            Event
          </Text>
          <div className="grid gap-4 sm:grid-cols-2">
            <Fact label="Rule" value={event.rule_code} />
            <Fact
              label="Severity"
              value={
                <span
                  className={
                    severityTone(event.severity) === 'danger'
                      ? 'font-bold text-[var(--er)]'
                      : undefined
                  }
                >
                  {event.severity}
                </span>
              }
            />
            <Fact
              label="Operator"
              value={
                event.account_id ? (
                  <Link
                    to={`/operators/${event.account_id}`}
                    className="font-semibold text-[var(--pr)] hover:underline"
                  >
                    {event.account_kura_id} · {event.account_display_name}
                  </Link>
                ) : (
                  '—'
                )
              }
            />
            <Fact
              label="Subject"
              value={`${event.subject_type}:${event.subject_id}`}
            />
            <Fact label="Action taken" value={event.action_taken || '—'} />
            <Fact label="Score" value={String(event.score)} />
            <Fact label="Opened" value={formatWhen(event.created_at)} />
            <Fact
              label="Review note"
              value={event.review_note?.trim() || '—'}
            />
            {event.active_velocity_grant ? (
              <Fact
                label="Bay exception"
                value={`${event.active_velocity_grant.uses_remaining}/${event.active_velocity_grant.max_uses} left · until ${formatWhen(event.active_velocity_grant.expires_at)}`}
              />
            ) : null}
          </div>
        </section>

        <section className="mt-4 rounded-[12px] border border-[var(--bd)] bg-[var(--sf)] p-4 shadow-[var(--sh)]">
          <Text fw={700} size="sm" className="mb-3 text-[var(--tx)]">
            Why flagged
          </Text>
          {why.length === 0 ? (
            <p className="text-[13px] text-[var(--mu)]">No context payload.</p>
          ) : (
            <ul className="space-y-1.5 text-[13px] text-[var(--tx)]">
              {why.map((line) => (
                <li key={line} className="font-mono text-[12px]">
                  {line}
                </li>
              ))}
            </ul>
          )}
        </section>
      </AdminDetailPage>

      <AdminConfirmModal
        opened={pending != null}
        onClose={() => setPending(null)}
        title={pending ? confirmCopy[pending].title : ''}
        body={pending ? confirmCopy[pending].body : ''}
        confirmLabel={pending ? confirmCopy[pending].confirmLabel : 'Confirm'}
        reasonRequired
        illustrationId="confirm-action"
        onConfirm={async (reason) => {
          if (!pending) return
          const choice = pending
          setPending(null)
          await review.mutateAsync({
            status: choice,
            note: reason || choice,
            ...(choice === 'REVIEWED_OK' && event.rule_code === 'SWAP_VELOCITY'
              ? { allow_swap: true }
              : {}),
          })
          await refetch()
          setSuccess(
            choice === 'REVIEWED_OK'
              ? event.rule_code === 'SWAP_VELOCITY'
                ? 'Exception granted'
                : 'Marked OK'
              : choice === 'REVIEWED_FRAUD'
                ? 'Fraud confirmed'
                : 'Escalated',
          )
        }}
      />

      <KuraIllustrationModal
        opened={!!success}
        onClose={() => setSuccess(null)}
        illustrationId="success-check"
        title={success ?? undefined}
        description={`${event.rule_code} · ${event.severity}`}
        primaryAction={{
          label: 'Done',
          onClick: () => setSuccess(null),
        }}
      />
    </>
  )
}
