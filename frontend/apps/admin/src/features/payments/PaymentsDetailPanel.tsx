import { useNavigate, useParams } from 'react-router-dom'
import { Skeleton } from '@mantine/core'
import {
  AdminDetailPage,
  type AdminDetailAction,
} from '@shared/components'
import { usePayment } from '@features/finance'
import { downloadCsv } from '@shared/utils/downloadCsv'
import { formatNaira } from '@shared/utils/currency'
import {
  paymentChannelLabel,
  paymentStatusLabel,
  paymentStatusTone,
  shortPaymentRef,
} from './paymentDetailHelpers'
import { PaymentReceiptCard } from './PaymentReceiptCard'
import { CashReconDetail } from './CashReconDetail'

export function PaymentsDetailPanel() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { payment, isPending, isError } = usePayment(id)

  if (isPending) {
    return (
      <div className="p-6">
        <Skeleton height={320} radius="md" />
      </div>
    )
  }

  if (isError || !payment) {
    if (id) return <CashReconDetail id={id} />
    return (
      <AdminDetailPage
        backLabel="Back to payments"
        onBack={() => navigate('/payments')}
        title="Payment not found"
        summaryRows={[{ label: 'ID', value: id ?? '—' }]}
      />
    )
  }

  const accountShort = shortPaymentRef(payment.account_id)

  const actions: AdminDetailAction[] = [
    {
      id: 'account',
      label: 'Open account',
      onClick: () => navigate(`/operators/${payment.account_id}`),
    },
    {
      id: 'export',
      label: 'Export CSV',
      onClick: () =>
        downloadCsv(
          `${payment.receipt_code}-receipt.csv`,
          ['receipt', 'account', 'amount_kobo', 'channel', 'purpose', 'status', 'date'],
          [
            [
              payment.receipt_code,
              payment.account_id,
              payment.amount_kobo,
              payment.channel,
              payment.purpose,
              payment.status,
              payment.created_at,
            ],
          ],
        ),
    },
  ]

  return (
    <AdminDetailPage
      backLabel="Back to payments"
      onBack={() => navigate('/payments')}
      breadcrumbs={[
        { label: 'Payments', to: '/payments' },
        { label: payment.receipt_code },
      ]}
      title={payment.receipt_code}
      subtitle={new Date(payment.created_at).toLocaleString()}
      statusLabel={paymentStatusLabel(payment.status)}
      statusTone={paymentStatusTone(payment.status)}
      actions={actions}
      summaryRows={[
        {
          label: 'Amount',
          value: formatNaira(payment.amount_kobo, { fromKobo: true }),
        },
        { label: 'Account', value: accountShort },
        { label: 'Channel', value: paymentChannelLabel(payment.channel) },
        { label: 'Purpose', value: payment.purpose },
      ]}
    >
      <PaymentReceiptCard
        record={{
          reference: payment.receipt_code,
          accountId: payment.account_id,
          accountLabel: accountShort,
          amountKobo: payment.amount_kobo,
          channel: paymentChannelLabel(payment.channel),
          purpose: payment.purpose,
          status: payment.status,
          createdAt: payment.created_at,
        }}
        onDownload={() =>
          downloadCsv(
            `${payment.receipt_code}-receipt.csv`,
            ['receipt', 'account', 'amount_kobo', 'status'],
            [
              [
                payment.receipt_code,
                payment.account_id,
                payment.amount_kobo,
                payment.status,
              ],
            ],
          )
        }
      />
    </AdminDetailPage>
  )
}
