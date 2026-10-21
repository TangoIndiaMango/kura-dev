import { useFetchData } from '@shared/hooks/api'
import { formatNaira } from '../../../shared/utils/currency'
import type { ReceiptData, ReceiptKind } from '../receiptTypes'

export type { ReceiptData, ReceiptKind }

export type PaymentReceiptApi = {
  schema: string
  kind: string
  receipt_code: string
  payment_id: string
  account_id: string
  account_kura_id: string
  channel: string
  channel_label?: string
  amount_kobo: number
  list_price_kobo?: number
  discount_code?: string
  discount_kobo?: number
  net_kobo?: number
  vat_kobo?: number
  amount_label: string
  purpose: string
  purpose_label: string
  operator_name?: string
  psp_reference?: string
  status: string
  status_label?: string
  issued_at: string
  hub_code?: string | null
  hub_name?: string | null
  vehicle_plate?: string | null
  agent_name?: string | null
  /** Issued pack (rider leaves with). */
  battery_out?: string | null
  /** Returned pack (rider handed in). */
  battery_in?: string | null
}

export function usePaymentReceipt(
  paymentId: string | null | undefined,
  options?: { enabled?: boolean },
) {
  const id = paymentId ?? ''
  const looksLive = Boolean(id) && !id.startsWith('rc-') && id.length > 12
  const query = useFetchData<PaymentReceiptApi>(
    id ? `/finance/payments/${id}/receipt/` : '/finance/payments/',
    undefined,
    {
      enabled: looksLive && options?.enabled !== false,
      staleTime: 60_000,
    },
  )
  return { ...query, receipt: query.data ?? null, looksLive }
}

function purposeKind(purpose: string): ReceiptKind {
  const p = purpose.toUpperCase()
  if (p === 'FUND') return 'funded'
  if (p === 'PLAN') return 'plan'
  if (p.includes('CREDIT') || p.includes('LOAN')) return 'loan'
  return 'swap'
}

export function mapPaymentReceipt(doc: PaymentReceiptApi): ReceiptData {
  const ok = !['FAILED', 'DECLINED', 'CANCELLED'].includes(
    (doc.status || '').toUpperCase(),
  )
  const when = new Intl.DateTimeFormat('en-GB', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Africa/Lagos',
  }).format(new Date(doc.issued_at))
  const naira = (kobo: number) => formatNaira(kobo, { fromKobo: true, showDecimals: true })
  const funded = purposeKind(doc.purpose) === 'funded'
  const base = formatNaira(doc.amount_kobo, { fromKobo: true })
  const amountLabel = funded ? `+${base}` : `−${base}`
  const hubLabel =
    doc.hub_name || doc.hub_code
      ? [doc.hub_name, doc.hub_code].filter(Boolean).join(' · ')
      : null

  return {
    id: doc.payment_id,
    kind: ok ? purposeKind(doc.purpose) : 'declined',
    amountLabel,
    headline: `${doc.purpose_label} · ${when}`,
    success: ok,
    rows: [
      { label: 'Type', value: doc.purpose_label },
      { label: 'Paid by', value: doc.channel_label || doc.channel || '—' },
      ...(doc.discount_code && doc.list_price_kobo
        ? [
            { label: 'List price', value: naira(doc.list_price_kobo) },
            {
              label: `Discount (${doc.discount_code})`,
              value: `−${naira(doc.discount_kobo ?? 0)}`,
            },
          ]
        : []),
      ...(doc.vat_kobo
        ? [
            { label: 'Net', value: naira(doc.net_kobo ?? doc.amount_kobo - doc.vat_kobo) },
            { label: 'VAT (7.5%)', value: naira(doc.vat_kobo) },
          ]
        : []),
      ...(hubLabel ? [{ label: 'Hub', value: hubLabel }] : []),
      ...(doc.vehicle_plate
        ? [{ label: 'Vehicle', value: doc.vehicle_plate }]
        : []),
      ...(doc.battery_out
        ? [{ label: 'Battery issued', value: doc.battery_out }]
        : []),
      ...(doc.battery_in
        ? [{ label: 'Battery returned', value: doc.battery_in }]
        : []),
      ...(doc.agent_name ? [{ label: 'Agent', value: doc.agent_name }] : []),
      ...(doc.psp_reference
        ? [{ label: 'PSP reference', value: doc.psp_reference }]
        : []),
      { label: 'Receipt code', value: doc.receipt_code },
      ...(doc.operator_name
        ? [{ label: 'Account', value: doc.operator_name }]
        : []),
      {
        label: 'Status',
        value: doc.status_label || doc.status,
        emphasize: true,
      },
    ],
    footer:
      'Kura’s ledger is the source of truth. Amounts are system-calculated, agents do not type the fee. Disputes open a support case against this receipt.',
  }
}

export function resolveReceiptView(
  live: PaymentReceiptApi | null,
  looksLive: boolean,
): ReceiptData | null {
  if (looksLive && live) return mapPaymentReceipt(live)
  return null
}
