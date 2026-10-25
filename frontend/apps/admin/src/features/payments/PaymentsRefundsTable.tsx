import { useState } from 'react'
import { Button, SegmentedControl } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import {
  AdminConfirmModal,
  DynamicTableSection,
  TableStatusBadge,
  type TableHeader,
} from '@shared/components'
import { useFetchData, usePostData } from '@shared/hooks/api'
import { apiErrorMessage } from '@lib/api/auth'
import { formatNaira } from '@shared/utils/currency'

const REFUNDS_API = '/finance/refunds/'

type RefundRow = {
  id: string
  reference: string
  amount_kobo: number
  status: string
  reason: string
  channel: string
  kura_id: string
  account_name: string
  purpose: string
  created_at: string
  updated_at: string
}

const STATUS_TABS = [
  { value: 'REFUND_REVIEW', label: 'To review' },
  { value: 'REFUND_PENDING', label: 'Approved' },
  { value: 'REFUNDED', label: 'Sent' },
  { value: 'REFUND_REJECTED', label: 'Rejected' },
]

const HEADERS: TableHeader[] = [
  { key: 'rider', label: 'RIDER' },
  { key: 'amount', label: 'AMOUNT' },
  { key: 'reason', label: 'WHY' },
  { key: 'action', label: '' },
]

const WHEN = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'Africa/Lagos',
})

/**
 * Paystack refunds are never sent automatically: a rider's unused payment
 * waits here until finance approves it (the worker then refunds it to the
 * card / account it came from) or rejects it with a note.
 */
export function PaymentsRefundsTable() {
  const [status, setStatus] = useState('REFUND_REVIEW')
  const [pending, setPending] = useState<{ action: 'approve' | 'reject'; row: RefundRow } | null>(null)
  const list = useFetchData<{ results: RefundRow[] }>(REFUNDS_API, { status }, { refetchOnWindowFocus: true })
  const review = usePostData<{ id: string; action: 'approve' | 'reject'; note?: string }, unknown>(
    (v) => `${REFUNDS_API}${v.id}/${v.action}/`,
    [REFUNDS_API],
    { body: (v) => ({ note: v.note ?? '' }), silentError: true },
  )
  const rows = list.data?.results ?? []
  const reviewing = status === 'REFUND_REVIEW'

  return (
    <>
      <DynamicTableSection<RefundRow>
        variant="embedded"
        headers={reviewing ? HEADERS : HEADERS.filter((h) => h.key !== 'action')}
        data={rows}
        getRowKey={(r) => r.id}
        emptyTitle={reviewing ? 'Nothing to review' : 'No refunds here'}
        emptyMessage={
          reviewing
            ? 'Unused Paystack payments (cancelled or lapsed bookings, cancelled swaps) appear here for approval.'
            : 'Refunds move here as they are reviewed and sent.'
        }
        toolbar={{
          title: 'Refunds',
          showFilter: false,
          actions: (
            <SegmentedControl size="xs" value={status} onChange={setStatus} data={STATUS_TABS} />
          ),
        }}
        renderItems={(r) => [
          <span key="rider" className="text-xs">
            <span className="font-bold text-[var(--tx)]">{r.account_name || r.kura_id}</span>
            <span className="block text-[var(--mu)]">
              {r.kura_id} · {WHEN.format(new Date(reviewing ? r.created_at : r.updated_at))}
            </span>
          </span>,
          <span key="amount" className="text-xs font-bold tabular-nums text-[var(--tx)]">
            {formatNaira(r.amount_kobo / 100)}
          </span>,
          <span key="reason" className="text-xs text-[var(--tx)]">
            {r.reason || '—'}
            <span className="mt-0.5 block font-mono text-[10.5px] text-[var(--mu)]">{r.reference}</span>
          </span>,
          ...(reviewing
            ? [
                <span key="action" className="flex justify-end gap-2">
                  <Button size="xs" color="brand" onClick={() => setPending({ action: 'approve', row: r })}>
                    Approve
                  </Button>
                  <Button size="xs" variant="subtle" color="red" onClick={() => setPending({ action: 'reject', row: r })}>
                    Reject
                  </Button>
                </span>,
              ]
            : [
                <TableStatusBadge
                  key="action"
                  label={STATUS_TABS.find((s) => s.value === r.status)?.label ?? r.status}
                  tone={r.status === 'REFUNDED' ? 'success' : r.status === 'REFUND_REJECTED' ? 'warning' : 'neutral'}
                />,
              ]),
        ]}
      />
      <AdminConfirmModal
        opened={Boolean(pending)}
        onClose={() => setPending(null)}
        title={
          pending?.action === 'approve'
            ? `Refund ${pending ? formatNaira(pending.row.amount_kobo / 100) : ''}?`
            : 'Reject this refund?'
        }
        body={
          pending?.action === 'approve'
            ? `Paystack sends ${pending ? formatNaira(pending.row.amount_kobo / 100) : ''} back to how ${pending?.row.account_name || 'the rider'} paid (${pending?.row.reason}). It usually reaches them in a few working days.`
            : 'The payment is kept and the rider is not refunded. Note why — it is kept with the record.'
        }
        confirmLabel={pending?.action === 'approve' ? 'Approve refund' : 'Reject refund'}
        confirmTone={pending?.action === 'approve' ? 'primary' : 'danger'}
        reasonRequired={pending?.action === 'reject'}
        reasonLabel="Note"
        reasonPlaceholder="e.g. Rider was served with cash on the same visit"
        loading={review.isPending}
        onConfirm={async (note) => {
          if (!pending) return
          try {
            await review.mutateAsync({ id: pending.row.id, action: pending.action, note })
            notifications.show({
              color: 'teal',
              message: pending.action === 'approve' ? 'Refund approved — sending to Paystack' : 'Refund rejected',
            })
            setPending(null)
            void list.refetch()
          } catch (err) {
            notifications.show({ color: 'red', message: apiErrorMessage(err, 'Could not update the refund') })
          }
        }}
      />
    </>
  )
}
