import React, { useMemo, useState } from 'react'
import { Skeleton } from '@mantine/core'
import { TickDouble02Icon } from 'hugeicons-react'
import { OperatorBackHeader } from '../../shared/components/operator/OperatorBackHeader'
import { useOperatorSession } from '../../shared/session'
import { applyPwaUpdate, getPendingPwaUpdate } from '../../shared/pwa/registerOperatorPwa'
import {
  relativeTime,
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
  type NotificationApi,
} from './hooks/use-notifications'

interface OperatorNotificationsScreenProps {
  onBack: () => void
  onOpenIdentity?: () => void
  onOpenCase?: (caseId: string) => void
}

type Row = {
  id: string
  title: string
  body: string
  time: string
  unread: boolean
  action?: 'upload-id-photos' | 'apply-update' | 'open-case' | null
  caseId?: string | null
  api?: NotificationApi
  local?: boolean
}

function caseIdFromLink(path: string | null | undefined): string | null {
  if (!path) return null
  const match = path.match(/\/(?:account\/)?cases\/([0-9a-f-]{36})/i)
  return match?.[1] ?? null
}

function actionFromApi(n: NotificationApi): Pick<Row, 'action' | 'caseId'> {
  if (
    n.template_code?.includes('kyc') ||
    n.template_code === 'account.ops_note' ||
    n.link_path?.includes('identity')
  ) {
    return { action: 'upload-id-photos', caseId: null }
  }
  const caseId = caseIdFromLink(n.link_path)
  if (caseId || n.template_code?.startsWith('support.')) {
    return { action: caseId ? 'open-case' : null, caseId }
  }
  return { action: null, caseId: null }
}

export const OperatorNotificationsScreen: React.FC<
  OperatorNotificationsScreenProps
> = ({ onBack, onOpenIdentity, onOpenCase }) => {
  const { clearAppUpdateNotification, session, pwaUpdateNotification } =
    useOperatorSession()
  const live = useNotifications({ enabled: Boolean(session) })
  const markRead = useMarkNotificationRead()
  const markAll = useMarkAllNotificationsRead()
  const [updating, setUpdating] = useState(false)

  const localRows: Row[] = useMemo(() => {
    if (!pwaUpdateNotification) return []
    const pwa = pwaUpdateNotification
    return [
      {
        id: pwa.id,
        title: pwa.title,
        body: pwa.body,
        time: pwa.time,
        unread: pwa.unread,
        action: 'apply-update' as const,
        local: true,
      },
    ]
  }, [pwaUpdateNotification])

  const apiRows: Row[] = useMemo(
    () =>
      live.notifications.map((n) => {
        const mapped = actionFromApi(n)
        return {
          id: n.id,
          title: n.title,
          body: n.body,
          time: relativeTime(n.at),
          unread: !n.is_read,
          action: mapped.action,
          caseId: mapped.caseId,
          api: n,
        }
      }),
    [live.notifications],
  )

  const items = [...localRows, ...apiRows]
  const unreadCount = items.filter((n) => n.unread).length

  const onTap = async (n: Row) => {
    if (n.api && n.unread) {
      try {
        await markRead.mutateAsync(n.id)
      } catch {
        /* silent */
      }
    }

    if (n.action === 'upload-id-photos') {
      sessionStorage.setItem('kura_account_open', 'identity')
      onOpenIdentity?.()
      return
    }

    if (n.action === 'open-case' && n.caseId) {
      sessionStorage.setItem('kura_account_open', 'case')
      sessionStorage.setItem('kura_account_case_id', n.caseId)
      onOpenCase?.(n.caseId)
      return
    }

    if (n.action === 'apply-update') {
      setUpdating(true)
      try {
        clearAppUpdateNotification()
        sessionStorage.removeItem('kura_pwa_update_banner_snoozed')
        await applyPwaUpdate(getPendingPwaUpdate())
      } finally {
        setUpdating(false)
      }
    }
  }

  const onMarkAll = async () => {
    try {
      await markAll.mutateAsync({})
    } catch {
      /* silent */
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <OperatorBackHeader
        title="Notifications"
        onBack={onBack}
        trailing={
          unreadCount > 0 ? (
            <button
              type="button"
              onClick={() => {
                onMarkAll()
              }}
              disabled={markAll.isPending}
              className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[12px] font-bold text-[var(--kura-teal-bright)] disabled:opacity-60"
              aria-label="Mark all as read"
              title="Mark all as read"
            >
              <TickDouble02Icon size={18} />
              <span className="hidden min-[360px]:inline">Mark all read</span>
            </button>
          ) : null
        }
      />

      {live.isPending && items.length === 0 ? (
        <div className="flex flex-col gap-2.5">
          <Skeleton height={72} radius="lg" />
          <Skeleton height={72} radius="lg" />
          <Skeleton height={72} radius="lg" />
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-[var(--kura-border)] bg-[var(--kura-bg-elevated)] px-4 py-10 text-center">
          <p className="text-[14px] font-bold text-[var(--kura-text)]">You’re all caught up</p>
          <p className="mt-1.5 text-[12.5px] leading-relaxed text-[var(--kura-muted)]">
            Holds, completed swaps, wallet receipts, and plan reminders show up here.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {items.map((n) => {
            const hint =
              n.action === 'upload-id-photos'
                ? 'Upload photos'
                : n.action === 'apply-update'
                  ? 'Update app'
                  : null
            return (
              <button
                key={n.id}
                type="button"
                disabled={updating && n.action === 'apply-update'}
                onClick={() => {
                  onTap(n)
                }}
                className={`rounded-2xl border px-4 py-3.5 text-left transition-colors disabled:opacity-60 ${
                  n.unread
                    ? 'border-[var(--kura-teal)]/30 bg-[var(--kura-teal)]/10'
                    : 'border-[var(--kura-border)] bg-[var(--kura-bg-elevated)]'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2">
                    {n.unread ? (
                      <span
                        className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--kura-teal)]"
                        aria-hidden
                      />
                    ) : null}
                    <p className="text-[13px] font-bold text-[var(--kura-text)]">{n.title}</p>
                  </div>
                  <span className="shrink-0 text-[11px] text-[var(--kura-muted)]">{n.time}</span>
                </div>
                <p className="mt-1 text-[12px] leading-relaxed text-[var(--kura-muted)]">
                  {n.body}
                </p>
                {hint ? (
                  <span className="mt-2.5 inline-flex rounded-lg bg-[var(--kura-teal)]/15 px-2.5 py-1 text-[11px] font-bold text-[var(--kura-teal-bright)]">
                    {updating && n.action === 'apply-update' ? 'Updating…' : `${hint} →`}
                  </span>
                ) : null}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
