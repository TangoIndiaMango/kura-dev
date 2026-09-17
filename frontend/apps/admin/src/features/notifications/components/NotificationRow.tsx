import { ActionIcon, Badge, Menu } from '@mantine/core'
import {
  MoreHorizontalIcon,
  Notification03Icon,
  TickDouble02Icon,
} from 'hugeicons-react'
import type { NotificationApi } from '../hooks/use-notifications'
import { formatReceivedAt, normalizeSeverity } from '../utils/categories'

function severityTone(severity: string) {
  const tone = normalizeSeverity(severity)
  if (tone === 'CRITICAL') {
    return { bar: 'bg-[#C0392B]', icon: 'bg-[var(--tr)] text-[#C0392B]' }
  }
  if (tone === 'WARNING') {
    return { bar: 'bg-[#C47D0E]', icon: 'bg-[var(--ta)] text-[#C47D0E]' }
  }
  return { bar: 'bg-[var(--pr)]', icon: 'bg-[var(--in)] text-[var(--pr)]' }
}

export function NotificationRow({
  notification,
  onOpen,
  onMarkAsRead,
  markPending,
}: {
  notification: NotificationApi
  onOpen: (n: NotificationApi) => void
  onMarkAsRead: (id: string) => void
  markPending?: boolean
}) {
  const unread = !notification.is_read
  const severity = normalizeSeverity(notification.severity)
  const tone = severityTone(severity)

  return (
    <article
      className={`relative overflow-hidden rounded-[12px] border bg-[var(--sf)] transition ${
        unread
          ? 'border-[color-mix(in_srgb,var(--pr)_35%,var(--bd))] shadow-[var(--sh)]'
          : 'border-[var(--bd)]'
      }`}
    >
      <div className={`absolute inset-y-0 left-0 w-[3px] ${tone.bar}`} />

      <div className="flex items-start gap-3 p-3.5 pl-4 sm:p-4 sm:pl-5">
        <button
          type="button"
          className="flex min-w-0 flex-1 items-start gap-3 text-left"
          onClick={() => onOpen(notification)}
        >
          <div
            className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] ${tone.icon}`}
          >
            <Notification03Icon size={17} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-[13.5px] font-bold leading-snug text-[var(--tx)] sm:text-[14px]">
                {notification.title}
              </p>
              {unread ? (
                <span className="rounded-md bg-[var(--ta)] px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-[#C47D0E]">
                  Unread
                </span>
              ) : null}
            </div>
            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              <Badge
                variant="light"
                radius="sm"
                size="sm"
                tt="none"
                styles={{
                  root: {
                    backgroundColor: 'var(--tn)',
                    color: 'var(--mu)',
                    fontWeight: 600,
                  },
                }}
              >
                {notification.source || 'System'}
              </Badge>
              {severity !== 'INFO' ? (
                <span
                  className={`text-[10px] font-extrabold uppercase tracking-wide ${
                    severity === 'CRITICAL' ? 'text-[#C0392B]' : 'text-[#C47D0E]'
                  }`}
                >
                  {severity}
                </span>
              ) : null}
              <span className="text-[11px] text-[var(--mu)]">
                {formatReceivedAt(notification.at)}
              </span>
            </div>
          </div>
        </button>

        <Menu position="bottom-end" withinPortal>
          <Menu.Target>
            <ActionIcon
              variant="subtle"
              color="gray"
              size="sm"
              aria-label="Notification actions"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreHorizontalIcon size={16} />
            </ActionIcon>
          </Menu.Target>
          <Menu.Dropdown>
            <Menu.Item
              leftSection={<Notification03Icon size={16} />}
              onClick={() => onOpen(notification)}
            >
              Open
            </Menu.Item>
            {unread ? (
              <Menu.Item
                leftSection={<TickDouble02Icon size={16} />}
                disabled={markPending}
                onClick={() => onMarkAsRead(notification.id)}
              >
                Mark as read
              </Menu.Item>
            ) : null}
          </Menu.Dropdown>
        </Menu>
      </div>
    </article>
  )
}
