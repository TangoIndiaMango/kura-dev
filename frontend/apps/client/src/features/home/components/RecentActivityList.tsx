import React from 'react'
import {
  ActivityTypeIcon,
  activityIconFromTitle,
} from '../../../shared/components/operator/ActivityTypeIcon'

interface ActivityItem {
  id: string
  title: string
  meta: string
  amountLabel: string
  tone: 'credit' | 'debit' | 'neutral'
  receiptId?: string
}

interface RecentActivityListProps {
  items: ActivityItem[]
  onSeeAll: () => void
  onOpenReceipt?: (receiptId: string) => void
  loading?: boolean
}

const amountClass = (tone: ActivityItem['tone']) => {
  if (tone === 'credit') return 'text-[var(--kura-green)]'
  if (tone === 'debit') return 'text-[var(--kura-text)]/80'
  return 'text-[var(--kura-muted)]'
}

export const RecentActivityList: React.FC<RecentActivityListProps> = ({
  items,
  onSeeAll,
  onOpenReceipt,
  loading = false,
}) => {
  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-center justify-between px-0.5">
        <h2 className="text-sm font-bold text-[var(--kura-text)]">Recent activity</h2>
        <button
          type="button"
          onClick={onSeeAll}
          className="text-xs font-semibold text-[var(--kura-teal-bright)]"
        >
          See all
        </button>
      </div>

      <div className="divide-y divide-[var(--kura-border-subtle)] rounded-2xl border border-[var(--kura-border)] bg-[var(--kura-bg-elevated)] px-4">
        {loading ? (
          <div className="flex flex-col gap-3 py-3">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-12 animate-pulse rounded-xl bg-[var(--kura-border)]/40"
              />
            ))}
          </div>
        ) : items.length === 0 ? (
          <p className="py-8 text-center text-[13px] text-[var(--kura-muted)]">
            No activity yet. Book a swap to get started.
          </p>
        ) : (
          items.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => item.receiptId && onOpenReceipt?.(item.receiptId)}
              className="flex w-full items-center gap-3 py-3.5 text-left"
            >
              <ActivityTypeIcon
                kind={activityIconFromTitle(item.title)}
                size="sm"
              />
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-xs font-bold text-[var(--kura-text)]">
                  {item.title}
                </span>
                <span className="truncate text-[11px] text-[var(--kura-muted)]">
                  {item.meta}
                </span>
              </div>
              <span
                className={`shrink-0 text-xs font-bold ${amountClass(item.tone)}`}
              >
                {item.amountLabel}
              </span>
            </button>
          ))
        )}
      </div>
    </section>
  )
}
