import {
  isCredit,
  isRiderFacing,
  paymentAmount,
  paymentMeta,
  paymentTitle,
} from '@shared/utils/paymentDisplay'
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
  return payments.filter(isRiderFacing).map((payment) => ({
    id: payment.id,
    title: paymentTitle(payment),
    meta: paymentMeta(payment),
    amountLabel: paymentAmount(payment),
    tone: isCredit(payment) ? 'credit' : 'debit',
    receiptId: payment.id,
  }))
}
