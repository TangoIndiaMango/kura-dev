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
