import React, { useMemo, useState } from 'react'
import { OperatorListPagination } from '../../../shared/components/operator/OperatorListPagination'
import {
  ActivityTypeIcon,
  activityIconFromTitle,
} from '../../../shared/components/operator/ActivityTypeIcon'
import { OperatorEmptyState } from '../../../shared/components/operator/OperatorEmptyState'

interface TxItem {
  id: string
  title: string
  meta: string
  amountLabel: string
  tone: 'credit' | 'debit' | 'neutral'
  receiptId?: string
}

interface TransactionListProps {
  items: TxItem[]
  pageSize?: number
  loading?: boolean
  onSeeAll?: () => void
  onItemClick?: (id: string, receiptId?: string) => void
}

const toneClass = (tone: TxItem['tone']) => {
  if (tone === 'credit') return 'text-[var(--kura-green)]'
  if (tone === 'debit') return 'text-[var(--kura-coral)]'
  return 'text-[var(--kura-muted)]'
}

export const TransactionList: React.FC<TransactionListProps> = ({
  items,
  pageSize = 5,
  loading = false,
  onSeeAll,
  onItemClick,
}) => {
  const [page, setPage] = useState(1)
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize))

  const pageItems = useMemo(() => {
    const start = (page - 1) * pageSize
    return items.slice(start, start + pageSize)
  }, [items, page, pageSize])

  const handlePageChange = (next: number) => {
    setPage(Math.min(Math.max(1, next), totalPages))
  }

  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-[var(--kura-text)]">Transactions</h3>
        {onSeeAll ? (
          <button
            type="button"
            onClick={onSeeAll}
            className="text-[13px] font-bold text-[var(--kura-teal-bright)]"
          >
            See all
          </button>
        ) : null}
      </div>

      {loading && items.length === 0 ? (
        <div className="flex flex-col gap-2">
          <div className="h-[64px] animate-pulse rounded-2xl bg-[var(--kura-border)]/40" />
          <div className="h-[64px] animate-pulse rounded-2xl bg-[var(--kura-border)]/40" />
          <div className="h-[64px] animate-pulse rounded-2xl bg-[var(--kura-border)]/40" />
        </div>
      ) : items.length === 0 ? (
        <OperatorEmptyState
          illustration="no-activity"
          title="No payments yet"
          description="Every swap or plan you pay for shows up here with a receipt you can open."
        />
      ) : (
        <>
          <div className="divide-y divide-[var(--kura-border-subtle)] rounded-2xl border border-[var(--kura-border)] bg-[var(--kura-bg-elevated)] px-4">
            {pageItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => onItemClick?.(item.id, item.receiptId)}
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
                  className={`shrink-0 text-xs font-bold ${toneClass(item.tone)}`}
                >
                  {item.amountLabel}
                </span>
              </button>
            ))}
          </div>

          <OperatorListPagination
            page={page}
            totalPages={totalPages}
            totalItems={items.length}
            pageSize={pageSize}
            onPageChange={handlePageChange}
          />
        </>
      )}
    </section>
  )
}
