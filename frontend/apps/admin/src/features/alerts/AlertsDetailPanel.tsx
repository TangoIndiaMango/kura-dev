import { useState, type ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Skeleton, Text } from '@mantine/core'
import {
  AdminConfirmModal,
  AdminDetailPage,
  KuraIllustrationModal,
  type AdminDetailAction,
  type KuraIllustrationId,
} from '@shared/components'
import { useCapabilities } from '../auth/useCapabilities'
import {
  useAckAlert,
  useAlert,
  useEscalateAlert,
  useResolveAlert,
} from './hooks/use-alerts'
import {
  alertStatusTone,
  formatAge,
  formatWhen,
  kindTitle,
  severityLabel,
} from './alertsQueueMetrics'

type ActionId = 'ack' | 'resolve' | 'escalate'

const ACTION_META: Record<
  ActionId,
  {
    confirmTitle: string
    confirmBody: string
    illustrationId: KuraIllustrationId
    title: string
  }
> = {
  ack: {
    confirmTitle: 'Acknowledge this alert?',
    confirmBody: 'Your name is logged and the SMS escalation timer pauses.',
    illustrationId: 'alert-acknowledged',
    title: 'Alert acknowledged',
  },
  resolve: {
    confirmTitle: 'Resolve this alert?',
    confirmBody: 'Marks the incident closed and clears it from the open queue.',
    illustrationId: 'alert-resolved',
    title: 'Alert resolved',
  },
  escalate: {
    confirmTitle: 'Escalate this alert?',
    confirmBody: 'Raises severity to critical and flags for ops lead review.',
    illustrationId: 'alert-escalated',
    title: 'Alert escalated',
  },
}

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

export function AlertsDetailPanel() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { can } = useCapabilities()
  const { alert, isPending, isError, refetch } = useAlert(id)
  const ack = useAckAlert(id ?? '')
  const resolve = useResolveAlert(id ?? '')
  const escalate = useEscalateAlert(id ?? '')
  const [pending, setPending] = useState<ActionId | null>(null)
  const [success, setSuccess] = useState<ActionId | null>(null)

  if (isPending) {
    return (
      <div className="p-6">
        <Skeleton height={320} radius="md" />
      </div>
    )
  }

  if (isError || !alert) {
    return (
      <AdminDetailPage
        backLabel="Back to alerts"
        onBack={() => navigate('/alerts')}
        title="Alert not found"
        summaryRows={[{ label: 'ID', value: id ?? '—' }]}
      />
    )
  }

  const canManage = can('alerts:manage')
  const openish =
    alert.status === 'OPEN' ||
    alert.status === 'ACKNOWLEDGED' ||
    alert.status === 'ESCALATED'

  const actions: AdminDetailAction[] = []
  if (canManage && alert.status === 'OPEN') {
    actions.push({
      id: 'ack',
      label: 'Acknowledge',
      onClick: () => setPending('ack'),
    })
  }
  if (canManage && openish) {
    actions.push({
      id: 'resolve',
      label: 'Resolve',
      onClick: () => setPending('resolve'),
    })
  }
  if (
    canManage &&
    alert.status !== 'ESCALATED' &&
    alert.status !== 'RESOLVED'
  ) {
    actions.push({
      id: 'escalate',
      label: 'Escalate',
      tone: 'danger',
      onClick: () => setPending('escalate'),
    })
  }

  const meta = pending
    ? ACTION_META[pending]
    : success
      ? ACTION_META[success]
      : null

  return (
    <>
      <AdminDetailPage
        backLabel="Back to alerts"
        onBack={() => navigate('/alerts')}
        breadcrumbs={[
          { label: 'Alerts', to: '/alerts' },
          { label: kindTitle(alert.kind) },
        ]}
        title={kindTitle(alert.kind)}
        subtitle={`${severityLabel(alert.severity)} · ${formatAge(alert.created_at)}`}
        statusLabel={alert.status}
        statusTone={alertStatusTone(alert.status)}
        actions={actions}
        showActivity={false}
        showNotes={false}
      >
        <section className="rounded-[12px] border border-[var(--bd)] bg-[var(--sf)] p-4 shadow-[var(--sh)]">
          <Text fw={700} size="sm" className="mb-3 text-[var(--tx)]">
            Alert
          </Text>
          <div className="grid gap-4 sm:grid-cols-2">
            <Fact label="Message" value={alert.message} />
            <Fact label="Severity" value={severityLabel(alert.severity)} />
            <Fact label="Raised" value={formatWhen(alert.created_at)} />
            <Fact label="Elapsed" value={formatAge(alert.created_at)} />
            <Fact
              label="Dispatch channel"
              value={alert.delivery_channel || 'IN_APP'}
            />
            <Fact
              label="Hub"
              value={
                alert.hub_id ? (
                  <Link
                    to={`/hubs/${alert.hub_id}`}
                    className="font-semibold text-[var(--pr)] hover:underline"
                  >
                    {alert.hub_code} · {alert.hub_name}
                  </Link>
                ) : (
                  '—'
                )
              }
            />
            <Fact
              label="Resolve note"
              value={alert.resolve_note?.trim() || '—'}
            />
            <Fact label="Alert ID" value={alert.id} />
          </div>
        </section>
      </AdminDetailPage>

      <AdminConfirmModal
        opened={!!pending}
        onClose={() => setPending(null)}
        title={meta?.confirmTitle ?? ''}
        body={meta?.confirmBody ?? ''}
        confirmLabel="Confirm"
        confirmTone={pending === 'escalate' ? 'danger' : 'primary'}
        reasonRequired={pending === 'escalate' || pending === 'resolve'}
        illustrationId="confirm-action"
        onConfirm={async (reason) => {
          const action = pending
          setPending(null)
          if (!action) return
          const note = reason || action
          if (action === 'ack') await ack.mutateAsync({})
          if (action === 'resolve') await resolve.mutateAsync({ note })
          if (action === 'escalate') await escalate.mutateAsync({ note })
          await refetch()
          setSuccess(action)
        }}
      />

      <KuraIllustrationModal
        opened={!!success}
        onClose={() => setSuccess(null)}
        illustrationId={
          success ? ACTION_META[success].illustrationId : 'alert-acknowledged'
        }
        title={success ? ACTION_META[success].title : undefined}
        description={kindTitle(alert.kind)}
        primaryAction={{
          label: 'Done',
          onClick: () => setSuccess(null),
        }}
      />
    </>
  )
}
