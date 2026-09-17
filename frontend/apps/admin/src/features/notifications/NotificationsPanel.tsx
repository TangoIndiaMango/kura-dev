import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Group, Text } from '@mantine/core'
import {
  LinkSquare02Icon,
  Notification03Icon,
  TickDouble02Icon,
} from 'hugeicons-react'
import {
  DateRangePicker,
  DetailsDrawer,
  KuraIllustrationModal,
  LoadingState,
} from '@shared/components'
import { CategoryTabs } from './components/CategoryTabs'
import { NotificationRow } from './components/NotificationRow'
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotificationStats,
  useNotifications,
  type NotificationApi,
} from './hooks/use-notifications'
import {
  CATEGORIES,
  countByCategory,
  formatReceivedAt,
  normalizeSeverity,
  type CategoryId,
} from './utils/categories'

export function NotificationsPanel() {
  const navigate = useNavigate()
  const [selectedCategory, setSelectedCategory] = useState<CategoryId>('all')
  const [dateRange, setDateRange] = useState<{
    start_date?: string
    end_date?: string
  }>({})
  const [readModalOpen, setReadModalOpen] = useState(false)
  const [peek, setPeek] = useState<NotificationApi | null>(null)

  const { notifications, isPending, isError } = useNotifications({
    start_date: dateRange.start_date,
    end_date: dateRange.end_date,
  })
  const { data: stats } = useNotificationStats()
  const markRead = useMarkNotificationRead()
  const markAll = useMarkAllNotificationsRead()

  const unreadCount = stats?.totals.unread ?? 0

  const categoryCounts = useMemo(
    () => countByCategory(notifications),
    [notifications],
  )
  const unreadByCategory = useMemo(
    () => countByCategory(notifications, (n) => !n.is_read),
    [notifications],
  )

  const filtered = useMemo(() => {
    const cat = CATEGORIES.find((c) => c.id === selectedCategory)
    if (!cat) return notifications
    return notifications.filter(cat.match)
  }, [notifications, selectedCategory])

  const markAsRead = (id: string) => {
    if (markRead.isPending) return
    markRead.mutate(id)
    setPeek((prev) =>
      prev && prev.id === id ? { ...prev, is_read: true, read_at: prev.read_at ?? new Date().toISOString() } : prev,
    )
  }

  const markAllAsRead = () => {
    if (unreadCount === 0 || markAll.isPending) return
    markAll.mutate({}, {
      onSuccess: () => setReadModalOpen(true),
    })
  }

  const openPeek = (n: NotificationApi) => {
    if (!n.is_read) markAsRead(n.id)
    setPeek({ ...n, is_read: true })
  }

  return (
    <>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-[22px] font-bold tracking-tight text-[var(--tx)]">
                Notifications
              </h1>
              {unreadCount > 0 ? (
                <span className="rounded-full bg-[var(--ta)] px-2.5 py-0.5 text-[11px] font-extrabold text-[#C47D0E]">
                  {unreadCount} unread
                </span>
              ) : (
                <span className="rounded-full bg-[var(--tg)] px-2.5 py-0.5 text-[11px] font-extrabold text-[#1E8E4E]">
                  All caught up
                </span>
              )}
            </div>
            <p className="mt-1 text-[13px] text-[var(--mu)]">
              Ops inbox — tap a row for the full message.
            </p>
          </div>

          <Group gap="sm" wrap="wrap" className="shrink-0">
            <DateRangePicker
              date={dateRange}
              onChange={(value) =>
                setDateRange({
                  start_date: value.start_date,
                  end_date: value.end_date,
                })
              }
              placeholder="Select date"
            />
            <Button
              variant="light"
              leftSection={<TickDouble02Icon size={16} />}
              onClick={markAllAsRead}
              disabled={unreadCount === 0}
              loading={markAll.isPending}
              size="sm"
              styles={{
                root: {
                  backgroundColor: 'var(--in)',
                  color: 'var(--pr)',
                  border: '1px solid var(--bd)',
                  fontWeight: 600,
                },
              }}
            >
              Mark all as read
            </Button>
          </Group>
        </div>

        <div className="overflow-hidden rounded-[16px] border border-[var(--bd)] bg-[var(--sf)] shadow-[var(--sh)]">
          <div className="border-b border-[var(--bd)] p-3 lg:hidden">
            <CategoryTabs
              selected={selectedCategory}
              counts={categoryCounts}
              unreadByCategory={unreadByCategory}
              onSelect={setSelectedCategory}
              variant="scroll"
            />
          </div>

          <div className="flex min-h-[420px] p-3 sm:p-4 lg:p-5">
            <div className="hidden lg:block">
              <CategoryTabs
                selected={selectedCategory}
                counts={categoryCounts}
                unreadByCategory={unreadByCategory}
                onSelect={setSelectedCategory}
                variant="rail"
              />
            </div>

            <div className="min-w-0 flex-1 lg:pl-5">
              <div className="mb-3 flex items-center justify-between gap-2">
                <Text fz="sm" fw={700} className="text-[var(--tx)]">
                  {CATEGORIES.find((c) => c.id === selectedCategory)?.label ?? 'Inbox'}
                </Text>
                <Text fz="xs" c="dimmed">
                  {filtered.length} {filtered.length === 1 ? 'item' : 'items'}
                </Text>
              </div>

              {isPending ? (
                <LoadingState cols={1} rows={6} />
              ) : isError ? (
                <p className="px-4 py-12 text-center text-sm text-[var(--mu)]">
                  Could not load notifications.
                </p>
              ) : filtered.length === 0 ? (
                <div className="flex min-h-[280px] flex-col items-center justify-center gap-2 px-4 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--tn)] text-[var(--mu)]">
                    <Notification03Icon size={22} />
                  </div>
                  <p className="text-[15px] font-bold text-[var(--tx)]">Nothing here</p>
                  <p className="max-w-[280px] text-[13px] text-[var(--mu)]">
                    No notifications in this category for the selected range.
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-2.5 sm:gap-3">
                  {filtered.map((notification) => (
                    <NotificationRow
                      key={notification.id}
                      notification={notification}
                      onOpen={openPeek}
                      onMarkAsRead={markAsRead}
                      markPending={markRead.isPending}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <DetailsDrawer
        opened={Boolean(peek)}
        onClose={() => setPeek(null)}
        title={peek?.title ?? 'Notification'}
        rows={
          peek
            ? [
                { label: 'Message', value: peek.body },
                { label: 'Source', value: peek.source || 'System' },
                { label: 'Severity', value: normalizeSeverity(peek.severity) },
                { label: 'Status', value: peek.is_read ? 'Read' : 'Unread' },
                { label: 'Received', value: formatReceivedAt(peek.at) },
                { label: 'ID', value: peek.id },
              ]
            : []
        }
        footer={
          peek?.link_path ? (
            <Button
              fullWidth
              leftSection={<LinkSquare02Icon size={16} />}
              className="bg-[var(--pr)] hover:opacity-90"
              onClick={() => {
                const path = peek.link_path
                setPeek(null)
                if (path && path !== '/notifications') navigate(path)
              }}
            >
              Open related
            </Button>
          ) : null
        }
      />

      <KuraIllustrationModal
        opened={readModalOpen}
        onClose={() => setReadModalOpen(false)}
        illustrationId="alert-acknowledged"
        title="All caught up"
        description="Every notification is marked as read."
        primaryAction={{
          label: 'Done',
          onClick: () => setReadModalOpen(false),
        }}
      />
    </>
  )
}
