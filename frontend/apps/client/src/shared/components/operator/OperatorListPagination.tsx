import React from 'react'
import { ArrowLeft01Icon, ArrowRight01Icon } from 'hugeicons-react'

interface OperatorListPaginationProps {
  page: number
  totalPages: number
  totalItems: number
  pageSize: number
  onPageChange: (page: number) => void
}

/** Compact dark pagination for operator lists (transactions, etc.). */
export const OperatorListPagination: React.FC<OperatorListPaginationProps> = ({
  page,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
}) => {
  if (totalPages <= 1) return null

  const from = (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, totalItems)

  return (
    <div className="flex items-center justify-between gap-3 pt-1">
      <span className="text-[11px] text-[var(--kura-muted)]">
        Showing {from}–{to} of {totalItems}
      </span>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          aria-label="Previous page"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--kura-border)] text-[var(--kura-text)]/70 transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ArrowLeft01Icon size={14} />
        </button>
        {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onPageChange(n)}
            className={`inline-flex h-8 min-w-8 items-center justify-center rounded-lg px-2 text-xs font-bold transition ${
              n === page
                ? 'bg-[var(--kura-teal)] text-[var(--kura-text-inverse)]'
                : 'border border-[var(--kura-border)] text-[var(--kura-text)]/70 hover:bg-white/5'
            }`}
          >
            {n}
          </button>
        ))}
        <button
          type="button"
          aria-label="Next page"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--kura-border)] text-[var(--kura-text)]/70 transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ArrowRight01Icon size={14} />
        </button>
      </div>
    </div>
  )
}
