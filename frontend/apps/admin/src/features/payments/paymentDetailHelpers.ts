import type { KuraIllustrationId } from '@shared/illustrations/catalog'

export type PaymentAction = 'export'

export const PAYMENT_ACTION_META: Record<
  PaymentAction,
  {
    confirmTitle: string
    confirmBody: string
    confirmTone: 'primary' | 'danger'
    confirmLabel?: string
    illustrationId: KuraIllustrationId
    successTitle: string
    successBody: (ref: string) => string
  }
> = {
  export: {
    confirmTitle: 'Export this record?',
    confirmBody: 'Downloads a CSV snapshot of the payment.',
    confirmTone: 'primary',
    confirmLabel: 'Export CSV',
    illustrationId: 'record-exported',
    successTitle: 'Export ready',
    successBody: (ref) => `${ref} was downloaded.`,
  },
}

export function paymentStatusTone(status: string) {
  if (status === 'SUCCESS' || status === 'COMPLETED') return 'success' as const
  if (status === 'PENDING') return 'warning' as const
  if (status === 'REVERSED' || status === 'REFUNDED') return 'info' as const
  return 'danger' as const
}

export function paymentStatusLabel(status: string) {
  if (status === 'SUCCESS') return 'Successful'
  if (status === 'REVERSED') return 'Reversed'
  return status
}

export function paymentChannelLabel(channel: string) {
  if (channel === 'NUBAN_TRANSFER') return 'Bank transfer (NUBAN)'
  if (channel === 'WALLET_DEBIT') return 'Wallet'
  if (channel === 'AGENT_CASH') return 'Cash at hub'
  if (channel === 'CARD') return 'Card'
  if (channel === 'CREDIT') return 'Credit'
  return channel
}

export function paymentDateParts(isoOrLabel: string) {
  try {
    const d = new Date(isoOrLabel)
    if (!Number.isFinite(d.getTime())) {
      return { dateLabel: isoOrLabel, timeLabel: '—' }
    }
    return {
      dateLabel: d.toLocaleDateString(),
      timeLabel: d.toLocaleTimeString(),
    }
  } catch {
    return { dateLabel: isoOrLabel, timeLabel: '—' }
  }
}

export function paymentReceiptBannerClass(status: string) {
  const tone = paymentStatusTone(status)
  if (tone === 'success') return 'bg-[#E8F5EE]'
  if (tone === 'warning') return 'bg-[#FEF6E7]'
  if (tone === 'info') return 'bg-[#EEF4FF]'
  return 'bg-[#FEF3F2]'
}

export function paymentReceiptIllustration(status: string): KuraIllustrationId {
  if (status === 'SUCCESS' || status === 'COMPLETED') return 'wallet-funded'
  if (status === 'PENDING') return 'processing-payment'
  if (status === 'REVERSED' || status === 'REFUNDED') return 'success-check'
  return 'payment-declined'
}

export function shortPaymentRef(id: string) {
  return id.replace(/-/g, '').slice(0, 8).toUpperCase()
}

// Single source of truth for cash phase labels/tones.
export { cashStatusLabel, cashStatusTone } from './cashReconHelpers'
