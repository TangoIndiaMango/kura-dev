export type ReceiptKind = 'funded' | 'swap' | 'plan' | 'loan' | 'declined'

export interface ReceiptData {
  id: string
  kind: ReceiptKind
  amountLabel: string
  headline: string
  success?: boolean
  rows: Array<{ label: string; value: string; emphasize?: boolean }>
  footer: string
}

const FOOTER =
  'Kura’s ledger is the source of truth. Amounts are system-calculated, agents do not type the fee. Disputes open a support case against this receipt.'

const CASH_FOOTER =
  'Cash receipts are emailed with a signed PDF (SMS when live). If the amount differs from cash you handed over, tap Report a problem.'

export const RECEIPTS: Record<string, ReceiptData> = {
  'rc-funded-1': {
    id: 'rc-funded-1',
    kind: 'funded',
    amountLabel: '+₦10,000',
    headline: 'Wallet funded · Sep 3, 2026 · 18:20',
    success: true,
    rows: [
      { label: 'Type', value: 'Bank transfer to virtual account' },
      { label: 'From', value: 'GTBank · ****4412' },
      { label: 'To', value: '9012 3456 78 · Wema Bank' },
      { label: 'PSP reference', value: 'PSP-8F3A2C' },
      { label: 'Receipt code', value: 'RC-77120' },
      { label: 'Balance after', value: '₦18,450' },
      { label: 'Status', value: 'Completed', emphasize: true },
    ],
    footer: FOOTER,
  },
  'rc-swap-1': {
    id: 'rc-swap-1',
    kind: 'swap',
    amountLabel: 'Plan',
    headline: 'Battery swap · Today · 07:02',
    success: true,
    rows: [
      { label: 'Type', value: 'Battery swap' },
      { label: 'Hub', value: 'Yaba Motor Park' },
      { label: 'Agent', value: 'Chinedu O.' },
      { label: 'Vehicle', value: 'Spiro E-Moto · LSR-482-XA' },
      { label: 'Battery out', value: 'BAT-100351 · Spiro Moto 48V · 94%' },
      { label: 'Battery in', value: 'BAT-100188 · returned · 18%' },
      { label: 'Payment', value: 'Covered by Monthly plan' },
      { label: 'Reservation', value: 'KB-4820' },
      { label: 'Receipt code', value: 'RC-88201' },
      { label: 'Status', value: 'Completed', emphasize: true },
    ],
    footer: FOOTER,
  },
  'rc-swap-2': {
    id: 'rc-swap-2',
    kind: 'swap',
    amountLabel: 'Plan',
    headline: 'Battery swap · Sep 2, 2026 · 16:40',
    success: true,
    rows: [
      { label: 'Type', value: 'Battery swap' },
      { label: 'Hub', value: 'Igbokoda Waterfront' },
      { label: 'Agent', value: 'Amina B.' },
      { label: 'Vehicle', value: 'Asobo E-Boarder · HULL-IGB-14' },
      { label: 'Battery out', value: 'BAT-100288 · Asobo Marine 72V · 91%' },
      { label: 'Battery in', value: 'BAT-100201 · returned · 22%' },
      { label: 'Payment', value: 'Covered by Weekly plan' },
      { label: 'Receipt code', value: 'RC-88190' },
      { label: 'Status', value: 'Completed', emphasize: true },
    ],
    footer: FOOTER,
  },
  'rc-plan-1': {
    id: 'rc-plan-1',
    kind: 'plan',
    amountLabel: '−₦42,750',
    headline: 'Plan renewal · Aug 29, 2026 · 09:12',
    success: true,
    rows: [
      { label: 'Type', value: 'Plan renewal' },
      { label: 'Plan', value: 'Monthly · E-Moto' },
      { label: 'Vehicle', value: 'Spiro E-Moto · LSR-482-XA' },
      { label: 'List amount', value: '₦45,000' },
      { label: 'Discount', value: 'LOYAL-5 · −₦2,250' },
      { label: 'Paid', value: '₦42,750', emphasize: true },
      { label: 'Valid until', value: 'Sep 28, 2026' },
      { label: 'PSP reference', value: 'PSP-PLAN-441' },
      { label: 'Receipt code', value: 'RC-77010' },
      { label: 'Status', value: 'Completed', emphasize: true },
    ],
    footer: FOOTER,
  },
  'rc-loan-1': {
    id: 'rc-loan-1',
    kind: 'loan',
    amountLabel: '−₦1,000',
    headline: 'Loan repayment · Sep 3, 2026 · 06:00',
    success: true,
    rows: [
      { label: 'Type', value: 'Loan auto-debit' },
      { label: 'Principal left', value: '₦12,000' },
      { label: 'Days left', value: '9' },
      { label: 'PSP reference', value: 'PSP-LOAN-903' },
      { label: 'Receipt code', value: 'RC-77105' },
      { label: 'Status', value: 'Completed', emphasize: true },
    ],
    footer: FOOTER,
  },
  'rc-declined-1': {
    id: 'rc-declined-1',
    kind: 'declined',
    amountLabel: '₦1,200',
    headline: 'Payment declined · Aug 27, 2026 · 14:05',
    success: false,
    rows: [
      { label: 'Type', value: 'Wallet debit for swap' },
      { label: 'Hub', value: 'Ikeja Along' },
      { label: 'PSP reference', value: 'PSP-DEC-220' },
      { label: 'Receipt code', value: 'RC-76990' },
      { label: 'Status', value: 'Declined' },
    ],
    footer: FOOTER,
  },
  'rc-cash-1': {
    id: 'rc-cash-1',
    kind: 'funded',
    amountLabel: '₦1,500',
    headline: 'Cash at hub · Today · 08:14',
    success: true,
    rows: [
      { label: 'Type', value: 'Swap settle · cash at hub' },
      { label: 'Hub', value: 'Yaba Commercial Hub' },
      { label: 'Agent', value: 'Chinedu O.' },
      { label: 'Amount source', value: 'System tariff (agent did not type)' },
      { label: 'Receipt code', value: 'RC-CASH01' },
      { label: 'Integrity', value: 'HMAC-SHA256 signed' },
      { label: 'Status', value: 'Completed', emphasize: true },
    ],
    footer: CASH_FOOTER,
  },
}

/** @deprecated use RECEIPTS['rc-funded-1'] */
export const RECEIPT_MOCK = RECEIPTS['rc-funded-1']

export function getReceipt(id?: string | null): ReceiptData {
  if (id && RECEIPTS[id]) return RECEIPTS[id]
  return RECEIPTS['rc-funded-1']
}
