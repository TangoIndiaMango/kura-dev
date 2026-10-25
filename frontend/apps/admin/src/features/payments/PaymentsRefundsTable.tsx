import { useState, type ReactNode } from 'react'
import { Button } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import {
  AdminConfirmModal,
  DynamicTableSection,
  TableStatusBadge,
  type TableHeader,
  type TablePaginationConfig,
} from '@shared/components'
import { usePostData } from '@shared/hooks/api'
import { apiErrorMessage } from '@lib/api/auth'
import { formatNaira } from '@shared/utils/currency'
import { REFUNDS_API, type RefundApi } from './hooks/use-refunds'

const HEADERS: TableHeader[] = [
  { key: 'ref', label: 'REFUND' },
  { key: 'account', label: 'ACCOUNT' },
  { key: 'why', label: 'REASON' },
  { key: 'amount', label: 'AMOUNT' },
  { key: 'status', label: 'STATUS' },
  { key: 'action', label: '' },
]

export const REFUND_STATUS_LABEL: Record<RefundApi['status'], string> = {
  REFUND_REVIEW: 'To review',
  REFUND_PENDING: 'Approved',
  REFUNDED: 'Refunded',
  REFUND_REJECTED: 'Rejected',
}

const STATUS_TONE: Record<RefundApi['status'], 'warning' | 'info' | 'success' | 'neutral'> = {
  REFUND_REVIEW: 'warning',
  REFUND_PENDING: 'info',
  REFUNDED: 'success',
  REFUND_REJECTED: 'neutral',
}

const WHEN = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'Africa/Lagos',
})

/**
 * Paystack refunds, newest first. None is sent automatically: rows "To
 * review" need finance to approve (the worker then refunds via Paystack) or
 * reject with a note.
 */
export function PaymentsRefundsTable({
  refunds,
  pending,
  pagination,
  searchQuery,
  onSearchChange,
  filters,
  onReviewed,
}: {
  refunds: RefundApi[]
  pending: boolean
  pagination: TablePaginationConfig
  searchQuery: string
  onSearchChange: (v: string) => void
  /** Status select shown in the toolbar. */
  filters: ReactNode
  onReviewed: () => void
}) {
  const [decision, setDecision] = useState<{ action: 'approve' | 'reject'; row: RefundApi } | null>(null)
  const review = usePostData<{ id: string; action: 'approve' | 'reject'; note?: string }, unknown>(
    (v) => `${REFUNDS_API}${v.id}/${v.action}/`,
    [REFUNDS_API],
    { body: (v) => ({ note: v.note ?? '' }), silentError: true },
  )
  const amount = decision ? formatNaira(decision.row.amount_kobo, { fromKobo: true }) : ''

  return (
    <>
      <DynamicTableSection<RefundApi>
        variant="embedded"
        headers={HEADERS}
        data={refunds}
        loading={pending}
        pagination={pagination}
        getRowKey={(item) => item.id}
        toolbar={{
          title: 'Refunds',
          searchQuery,
          onSearchChange,
          searchPlaceholder: 'Search rider, KURA ID or Paystack ref…',
          showFilter: false,
          filters,
        }}
        emptyTitle="No refunds"
        emptyMessage="Nothing matches this date range and filters."
        renderItems={(item) => [
          <span key="ref" className="flex flex-col gap-0.5">
            <span className="font-mono text-xs font-bold text-[var(--pr)]">{item.reference}</span>
            <span className="text-[11.5px] text-[var(--mu)]">{WHEN.format(new Date(item.created_at))}</span>
          </span>,
          <span key="account" className="flex max-w-[260px] flex-col gap-0.5">
            <span className="truncate text-[13px] font-semibold text-[var(--tx)]" title={item.account_name || undefined}>
              {item.account_name || '—'}
            </span>
            <span className="font-mono text-[11px] text-[var(--mu)]">{item.kura_id}</span>
          </span>,
          <span key="why" className="max-w-[240px] text-[13px] text-[var(--tx)]">
            {item.reason || '—'}
          </span>,
          <span key="amount" className="font-mono text-[13px] font-bold tabular-nums text-[var(--tx)]">
            {formatNaira(item.amount_kobo, { fromKobo: true })}
          </span>,
          <TableStatusBadge key="status" label={REFUND_STATUS_LABEL[item.status]} tone={STATUS_TONE[item.status]} />,
          item.status === 'REFUND_REVIEW' ? (
            <span key="action" className="flex justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
              <Button size="xs" color="brand" onClick={() => setDecision({ action: 'approve', row: item })}>
                Approve
              </Button>
              <Button size="xs" variant="subtle" color="red" onClick={() => setDecision({ action: 'reject', row: item })}>
                Reject
              </Button>
            </span>
          ) : (
            <span key="action" />
          ),
        ]}
      />
      <AdminConfirmModal
        opened={Boolean(decision)}
        onClose={() => setDecision(null)}
        title={decision?.action === 'approve' ? `Refund ${amount}?` : 'Reject this refund?'}
        body={
          decision?.action === 'approve'
            ? `Paystack sends ${amount} back to how ${decision.row.account_name || 'the rider'} paid (${decision.row.reason}). It usually reaches them in a few working days.`
            : 'The payment is kept and the rider is not refunded. Note why — it stays with the record.'
        }
        confirmLabel={decision?.action === 'approve' ? 'Approve refund' : 'Reject refund'}
        confirmTone={decision?.action === 'approve' ? 'primary' : 'danger'}
        reasonRequired={decision?.action === 'reject'}
        reasonLabel="Note"
        reasonPlaceholder="e.g. Rider was served with cash on the same visit"
        loading={review.isPending}
        onConfirm={async (note) => {
          if (!decision) return
          try {
            await review.mutateAsync({ id: decision.row.id, action: decision.action, note })
            notifications.show({
              color: 'teal',
              message: decision.action === 'approve' ? 'Refund approved — sending to Paystack' : 'Refund rejected',
            })
            setDecision(null)
            onReviewed()
          } catch (err) {
            notifications.show({ color: 'red', message: apiErrorMessage(err, 'Could not update the refund') })
          }
        }}
      />
    </>
  )
}
