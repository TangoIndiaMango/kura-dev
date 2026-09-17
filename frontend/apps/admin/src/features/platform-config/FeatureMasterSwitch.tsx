import { useState } from 'react'
import { Switch, Text, Button, Group, Stack } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import {
  AdminConfirmModal,
  KuraIllustrationModal,
} from '@shared/components'
import { apiErrorMessage } from '@lib/api/auth'
import {
  useApproveConfig,
  useConfigNamespace,
  useProposeConfig,
  type ConfigNamespaceSnapshot,
} from './use-platform-config'

type Props = {
  namespace: 'credit' | 'offers'
  title: string
  description: string
}

type PendingAction =
  | { kind: 'propose'; next: boolean }
  | { kind: 'approve' }

function pendingEnabled(snap?: ConfigNamespaceSnapshot) {
  const v = snap?.pending?.value?.enabled
  return typeof v === 'boolean' ? v : null
}

export function FeatureMasterSwitch({ namespace, title, description }: Props) {
  const { data, isLoading, refetch } = useConfigNamespace(namespace)
  const propose = useProposeConfig(namespace)
  const approve = useApproveConfig()
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null)
  const [success, setSuccess] = useState<{
    title: string
    description: string
  } | null>(null)

  const enabled = Boolean(data?.effective?.enabled)
  const pending = pendingEnabled(data)
  const busy = propose.isPending || approve.isPending

  const confirmMeta =
    pendingAction?.kind === 'propose'
      ? {
          title: pendingAction.next
            ? `Turn on ${title}?`
            : `Turn off ${title}?`,
          body: pendingAction.next
            ? `Queues turning ${title} on. Super Admin can self-approve; otherwise a second admin must approve.`
            : `Queues turning ${title} off. Super Admin can self-approve; otherwise a second admin must approve.`,
          confirmLabel: 'Propose change',
          illustrationId: 'confirm-action' as const,
        }
      : pendingAction?.kind === 'approve'
        ? {
            title: `Approve ${title} change?`,
            body: `Activates the pending turn ${pending ? 'on' : 'off'}. Super Admin may approve their own proposal; other roles need a different approver.`,
            confirmLabel: 'Approve',
            illustrationId: 'confirm-action' as const,
          }
        : null

  const runConfirm = () => {
    if (!pendingAction) return
    if (pendingAction.kind === 'propose') {
      const next = pendingAction.next
      propose.mutate(
        {
          value: { enabled: next },
          note: next ? `Enable ${namespace}` : `Disable ${namespace}`,
        },
        {
          onSuccess: () => {
            setPendingAction(null)
            setSuccess({
              title: 'Change proposed',
              description: `${title} queued. Approve when ready — Super Admin can self-approve.`,
            })
            refetch()
          },
          onError: (err) =>
            notifications.show({
              color: 'red',
              title: 'Could not propose change',
              message: apiErrorMessage(err, 'Check credit/offers permission.'),
            }),
        },
      )
      return
    }
    if (!data?.pending?.id) return
    approve.mutate(
      { id: data.pending.id },
      {
        onSuccess: () => {
          setPendingAction(null)
          setSuccess({
            title: 'Approved',
            description: `${title} is now ${pending ? 'on' : 'off'}.`,
          })
          refetch()
        },
        onError: (err) =>
          notifications.show({
            color: 'red',
            title: 'Approval failed',
            message: apiErrorMessage(
              err,
              'Creator cannot approve their own change (unless Super Admin).',
            ),
          }),
      },
    )
  }

  return (
    <>
      <div className="rounded-[12px] border border-[var(--bd)] bg-[var(--sf)] p-4">
        <Stack gap="sm">
          <Group justify="space-between" align="flex-start" wrap="nowrap">
            <div>
              <Text fw={700} size="sm" c="var(--tx)">
                {title}
              </Text>
              <Text size="xs" c="dimmed" mt={2}>
                {description}
              </Text>
            </div>
            <Switch
              checked={enabled}
              disabled={isLoading || busy || pending !== null}
              onChange={(e) =>
                setPendingAction({
                  kind: 'propose',
                  next: e.currentTarget.checked,
                })
              }
              label={enabled ? 'On' : 'Off'}
              labelPosition="left"
            />
          </Group>
          {pending !== null && data?.pending ? (
            <Group gap="sm">
              <Text size="xs" c="orange.7" fw={600}>
                Pending: turn {pending ? 'on' : 'off'} (proposed{' '}
                {new Date(data.pending.created_at).toLocaleString()})
              </Text>
              <Button
                size="xs"
                loading={approve.isPending}
                onClick={() => setPendingAction({ kind: 'approve' })}
              >
                Approve
              </Button>
            </Group>
          ) : null}
        </Stack>
      </div>

      <AdminConfirmModal
        opened={Boolean(pendingAction)}
        onClose={() => setPendingAction(null)}
        title={confirmMeta?.title ?? ''}
        body={confirmMeta?.body ?? ''}
        confirmLabel={confirmMeta?.confirmLabel}
        illustrationId={confirmMeta?.illustrationId}
        loading={busy}
        onConfirm={runConfirm}
      />

      <KuraIllustrationModal
        opened={Boolean(success)}
        onClose={() => setSuccess(null)}
        illustrationId={
          success?.title === 'Approved' ? 'approved' : 'confirm-action'
        }
        title={success?.title ?? ''}
        description={success?.description ?? ''}
        primaryAction={{
          label: 'Done',
          onClick: () => setSuccess(null),
        }}
      />
    </>
  )
}
