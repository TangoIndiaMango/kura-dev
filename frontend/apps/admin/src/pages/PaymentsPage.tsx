import { useParams } from 'react-router-dom'
import { PaymentsPanel } from '@features/payments/PaymentsPanel'
import { PaymentsDetailPanel } from '@features/payments/PaymentsDetailPanel'
import { CashDepositFormPanel } from '@features/payments/CashDepositFormPanel'
import { CashReconDetail } from '@features/payments/CashReconDetail'

export default function PaymentsPage() {
  const { id, shiftId } = useParams<{ id: string; shiftId: string }>()
  // Duty windows have their own route — they are not payments.
  if (shiftId) return <CashReconDetail id={shiftId} />
  if (id === 'record-cash') return <CashDepositFormPanel />
  if (id) return <PaymentsDetailPanel />
  return <PaymentsPanel />
}
