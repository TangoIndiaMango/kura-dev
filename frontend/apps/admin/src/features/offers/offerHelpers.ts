import { formatNaira } from '@shared/utils/currency'
import type { OfferDetailApi, OfferListApi, OfferStatus, OfferType } from './types'

export function offerTone(status: string) {
  if (status === 'ACTIVE') return 'success' as const
  if (status === 'PAUSED' || status === 'DRAFT') return 'warning' as const
  return 'danger' as const
}

export function offerTypeLabel(type: string) {
  if (type === 'CREDIT') return 'Credit'
  if (type === 'INSURANCE') return 'Insurance'
  if (type === 'FINANCING') return 'Financing'
  return type
}

export function offerTypeBlurb(type: string) {
  if (type === 'CREDIT' || type === 'Credit') return 'Working capital line — swaps & plans'
  if (type === 'INSURANCE' || type === 'Insurance') return 'Partner-distributed cover'
  return 'Partner financing referral'
}

export function termsLabelFrom(terms: Record<string, unknown> | undefined): string {
  if (!terms || Object.keys(terms).length === 0) return '—'
  const min = Number(terms.min_amount_kobo ?? terms.minAmountKobo ?? NaN)
  const max = Number(terms.max_amount_kobo ?? terms.maxAmountKobo ?? NaN)
  const tenors = Array.isArray(terms.tenor_days) ? (terms.tenor_days as number[]) : []
  const bps = Number(terms.interest_rate_bps ?? NaN)
  const parts: string[] = []
  if (Number.isFinite(min) && Number.isFinite(max)) {
    parts.push(
      `${formatNaira(min, { fromKobo: true })}–${formatNaira(max, { fromKobo: true })}`,
    )
  }
  if (tenors.length) parts.push(tenors.map((d) => `${d}d`).join('/'))
  if (Number.isFinite(bps)) parts.push(`${(bps / 100).toFixed(1)}%`)
  if (typeof terms.partner_name === 'string' && terms.partner_name) {
    parts.push(String(terms.partner_name))
  }
  if (typeof terms.premium_label === 'string' && terms.premium_label) {
    parts.push(String(terms.premium_label))
  }
  return parts.join(' · ') || '—'
}

export function offerTermsFacts(
  offer: OfferDetailApi,
): { label: string; value: string }[] {
  const terms = offer.terms ?? {}
  const rows: { label: string; value: string }[] = [
    { label: 'Product type', value: offerTypeLabel(offer.offer_type) },
  ]
  const min = Number(terms.min_amount_kobo ?? NaN)
  const max = Number(terms.max_amount_kobo ?? NaN)
  if (Number.isFinite(min) && Number.isFinite(max)) {
    rows.push({
      label: 'Amount range',
      value: `${formatNaira(min, { fromKobo: true })} – ${formatNaira(max, { fromKobo: true })}`,
    })
  }
  const tenors = Array.isArray(terms.tenor_days) ? (terms.tenor_days as number[]) : []
  if (tenors.length) {
    rows.push({ label: 'Tenor', value: tenors.map((d) => `${d}d`).join(' · ') })
  }
  const bps = Number(terms.interest_rate_bps ?? NaN)
  if (Number.isFinite(bps)) {
    rows.push({ label: 'Interest', value: `${bps} bps over tenor` })
  }
  if (typeof terms.partner_name === 'string' && terms.partner_name) {
    rows.push({ label: 'Partner', value: terms.partner_name })
  }
  if (typeof terms.premium_label === 'string' && terms.premium_label) {
    rows.push({ label: 'Premium', value: terms.premium_label })
  }
  if (typeof terms.disbursement === 'string' && terms.disbursement) {
    rows.push({ label: 'Disbursement', value: terms.disbursement })
  }
  return rows
}

export function segmentLabel(criteria: Record<string, unknown> | undefined): string {
  if (!criteria || Object.keys(criteria).length === 0) return 'All / unscoped'
  if (typeof criteria.segment_id === 'string') return criteria.segment_id
  if (typeof criteria.name === 'string') return criteria.name
  return JSON.stringify(criteria)
}

/** Filter live offers that reference a segment id in criteria (detail required). */
export function offersForSegment(
  offers: Array<OfferListApi | OfferDetailApi>,
  segmentId: string,
): Array<OfferListApi | OfferDetailApi> {
  return offers.filter((o) => {
    const criteria =
      'segment_criteria' in o && o.segment_criteria
        ? o.segment_criteria
        : undefined
    if (!criteria) return false
    return (
      criteria.segment_id === segmentId ||
      (Array.isArray(criteria.segment_ids) &&
        criteria.segment_ids.includes(segmentId))
    )
  })
}

export type { OfferStatus, OfferType }
