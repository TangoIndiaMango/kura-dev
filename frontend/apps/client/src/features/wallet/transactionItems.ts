import { formatNaira } from '@shared/utils/currency'
import type { PaymentApi } from './hooks/use-operator-wallet'

export interface WalletTxItem {
  id: string
  title: string
  meta: string
  amountLabel: string
  tone: 'credit' | 'debit'
  receiptId: string
}

export function toWalletTxItems(payments: PaymentApi[]): WalletTxItem[] {
  return payments.map((payment) => ({
    id: payment.id,
    title: payment.purpose || payment.channel,
    meta: `${payment.status} · ${new Date(payment.created_at).toLocaleString()}`,
    amountLabel: formatNaira(payment.amount_kobo, { fromKobo: true }),
    tone:
      payment.purpose?.toLowerCase().includes('fund') ||
      payment.channel === 'NUBAN_TRANSFER'
        ? 'credit'
        : 'debit',
    receiptId: payment.id,
  }))
}
