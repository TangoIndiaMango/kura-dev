import { useState } from 'react'
import { ActionIcon } from '@mantine/core'
import {
  Cancel01Icon,
  Notification03Icon,
  TickDouble02Icon,
} from 'hugeicons-react'
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotificationStats,
  useNotifications,
} from '../hooks/use-notifications'
import { formatReceivedAt, normalizeSeverity } from '../utils/categories'

interface AdminNotificationsDrawerProps {
  opened: boolean
  onClose: () => void
  onNavigate?: (path: string) => void
}

export function AdminNotificationsDrawer({
  opened,
  onClose,
  onNavigate,
}: AdminNotificationsDrawerProps) {
  const [doneOpen, setDoneOpen] = useState(false)
  const { notifications, isPending, isError } = useNotifications()
  const { data: stats } = useNotificationStats()
  const markRead = useMarkNotificationRead()
  const markAll = useMarkAllNotificationsRead()

  const unreadCount = stats?.totals.unread ?? 0

  const markAsRead = (id: string) => {
    if (markRead.isPending) return
    markRead.mutate(id)
  }

  const markAllAsRead = () => {
    if (unreadCount === 0 || markAll.isPending) return
    markAll.mutate({}, {
      onSuccess: () => setDoneOpen(true),
    })
  }

  if (!opened) return null

  return (
    <>
      <div className="fixed inset-0 z-[300]" role="dialog" aria-modal="true">
        <button
          type="button"
          aria-label="Dismiss notifications"
          className="absolute inset-0 bg-black/45"
          onClick={onClose}
        />
        <div className="absolute bottom-4 right-4 top-4 flex w-[min(100%-2rem,420px)] flex-col overflow-hidden rounded-2xl border border-[var(--bd)] bg-[var(--sf)] shadow-2xl">
          <div className="flex shrink-0 items-start justify-between gap-3 border-b border-[var(--bd)] px-4 py-4">
            <div>
              <h2 className="text-[16px] font-bold text-[var(--tx)]">Notifications</h2>
              <p className="mt-0.5 text-[12px] text-[var(--mu)]">
                {unreadCount} unread · ops inbox
              </p>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={unreadCount === 0 || markAll.isPending}
                onClick={markAllAsRead}
                className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-[11px] font-bold text-[var(--pr)] disabled:opacity-40"
              >
                <TickDouble02Icon size={14} />
                Mark all read
              </button>
              <ActionIcon variant="subtle" color="gray" onClick={onClose} aria-label="Close">
                <Cancel01Icon size={18} />
              </ActionIcon>
            </div>
          </div>

          <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
            {isPending ? (
              <p className="py-16 text-center text-sm text-[var(--mu)]">Loading…</p>
            ) : isError ? (
              <p className="py-16 text-center text-sm text-[var(--mu)]">
                Could not load notifications.
              </p>
            ) : notifications.length === 0 ? (
              <p className="py-16 text-center text-sm text-[var(--mu)]">No notifications.</p>
            ) : (
              notifications.map((n) => {
                const unread = !n.is_read
                const severity = normalizeSeverity(n.severity)
                return (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => {
                      if (unread) markAsRead(n.id)
                      onClose()
                      const path = n.link_path
                      if (
                        path &&
                        path !== '/notifications' &&
                        !path.startsWith('/notifications/')
                      ) {
                        onNavigate?.(path)
                      } else {
                        onNavigate?.('/notifications')
                      }
                    }}
                    className="flex w-full items-start gap-3 rounded-[12px] border border-[var(--bd)] bg-[var(--sf)] px-3 py-3 text-left hover:border-[var(--pr)]"
                  >
                    <span
                      className={`mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${
                        severity === 'CRITICAL'
                          ? 'bg-[var(--tr)] text-[#C0392B]'
                          : 'bg-[var(--ta)] text-[#C47D0E]'
                      }`}
                    >
                      <Notification03Icon size={15} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-start justify-between gap-2">
                        <span className="text-[13px] font-bold text-[var(--tx)]">
                          {n.title}
                        </span>
                        <span
                          className={`shrink-0 rounded-md px-1.5 py-0.5 text-[9px] font-extrabold uppercase ${
                            unread
                              ? 'bg-[var(--ta)] text-[#C47D0E]'
                              : 'bg-[var(--tg)] text-[#1E8E4E]'
                          }`}
                        >
                          {unread ? 'Unread' : 'Read'}
                        </span>
                      </span>
                      <span className="mt-0.5 line-clamp-1 block text-[12px] text-[var(--mu)]">
                        {n.body}
                      </span>
                      <span className="mt-1 block text-[11px] text-[var(--mu)]">
                        {n.source || 'System'} · {formatReceivedAt(n.at)}
                      </span>
                    </span>
                  </button>
                )
              })
            )}
          </div>

          <div className="shrink-0 border-t border-[var(--bd)] p-3">
            <button
              type="button"
              className="w-full rounded-xl bg-[var(--pr)] py-2.5 text-[13px] font-bold text-white"
              onClick={() => {
                onClose()
                onNavigate?.('/notifications')
              }}
            >
              Open inbox
            </button>
          </div>
        </div>
      </div>

      {doneOpen ? (
        <div className="fixed inset-0 z-[350] flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-black/50"
            aria-label="Close"
            onClick={() => setDoneOpen(false)}
          />
          <div className="relative z-10 w-full max-w-[340px] rounded-2xl border border-[var(--bd)] bg-[var(--sf)] p-6 shadow-2xl">
            <h3 className="text-[18px] font-bold text-[var(--tx)]">Notifications read</h3>
            <p className="mt-2 text-[13px] leading-relaxed text-[var(--mu)]">
              All notifications have been marked as read.
            </p>
            <button
              type="button"
              onClick={() => setDoneOpen(false)}
              className="mt-5 w-full rounded-xl bg-[var(--pr)] py-3 text-[14px] font-bold text-white"
            >
              Done
            </button>
          </div>
        </div>
      ) : null}
    </>
  )
}
