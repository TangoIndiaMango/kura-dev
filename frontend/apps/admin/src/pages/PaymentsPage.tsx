import { useParams } from 'react-router-dom'
import { PaymentsPanel } from '@features/payments/PaymentsPanel'
import { PaymentsDetailPanel } from '@features/payments/PaymentsDetailPanel'
import { CashDepositFormPanel } from '@features/payments/CashDepositFormPanel'

export default function PaymentsPage() {
  const { id } = useParams<{ id: string }>()
  if (id === 'record-cash') return <CashDepositFormPanel />
  if (id) return <PaymentsDetailPanel />
  return <PaymentsPanel />
}
