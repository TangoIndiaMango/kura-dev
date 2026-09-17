/**
 * Full commercial catalog (mirrors admin MOCK_OFFERS).
 * Wallet filters by session.segmentIds — never show every tier to one rider.
 */

export type OperatorOfferType = 'Credit' | 'Insurance' | 'Financing'

export type OperatorOfferAssignmentStatus =
  | 'OFFERED'
  | 'ACCEPTED'
  | 'ACTIVE'
  | 'COMPLETED'
  | 'DEFAULTED'

export interface OperatorOffer {
  id: string
  name: string
  type: OperatorOfferType
  summary: string
  termsLabel: string
  /** Catalog publish state for this surface. */
  status: 'ACTIVE' | 'COMING_SOON'
  partnerConfigured: boolean
  partnerName?: string
  disbursement: 'SWAP_CREDIT' | 'WALLET_TOPUP' | 'PARTNER_POLICY' | 'PARTNER_REFERRAL'
  minAmountNaira?: number
  maxAmountNaira?: number
  tenorDays?: number[]
  interestRate?: number
  premiumLabel?: string
  segmentId: string
  segment: string
}

export interface OperatorOfferAssignment {
  offerId: string
  status: OperatorOfferAssignmentStatus
  amountNaira?: number
  updatedAt: string
  channel: 'App' | 'USSD'
}

/** Admin-aligned catalog. Visibility = Active/Coming soon + segment membership. */
export const OPERATOR_OFFER_CATALOG: OperatorOffer[] = [
  {
    id: 'OFF-01',
    name: 'Working capital · Tier 1',
    type: 'Credit',
    summary: 'Borrow ₦5k–₦50k for swaps and plans. One line at a time — daily wallet auto-debit.',
    termsLabel: '₦5k–₦50k · 7/14/30d · 5%',
    status: 'ACTIVE',
    partnerConfigured: true,
    disbursement: 'SWAP_CREDIT',
    minAmountNaira: 5000,
    maxAmountNaira: 50000,
    tenorDays: [7, 14, 30],
    interestRate: 0.05,
    segmentId: 'SEG-01',
    segment: 'High-tenure riders',
  },
  {
    id: 'OFF-02',
    name: 'Working capital · Tier 2',
    type: 'Credit',
    summary: 'Smaller line if you are newly credit-eligible.',
    termsLabel: '₦5k–₦20k · 7/14d · 5%',
    status: 'ACTIVE',
    partnerConfigured: true,
    disbursement: 'SWAP_CREDIT',
    minAmountNaira: 5000,
    maxAmountNaira: 20000,
    tenorDays: [7, 14],
    interestRate: 0.05,
    segmentId: 'SEG-05',
    segment: 'Credit-eligible',
  },
  {
    id: 'OFF-03',
    name: 'Parametric weather cover',
    type: 'Insurance',
    summary: 'Weather-triggered payout for fishing days lost.',
    termsLabel: 'Partner setting up',
    status: 'COMING_SOON',
    partnerConfigured: false,
    partnerName: 'Partner pending',
    disbursement: 'PARTNER_POLICY',
    premiumLabel: 'Premium set by partner',
    segmentId: 'SEG-03',
    segment: 'Igbokoda fishermen',
  },
  {
    id: 'OFF-04',
    name: 'E-Moto financing referral',
    type: 'Financing',
    summary: 'Apply with our financing partner for an e-moto.',
    termsLabel: 'Partner setting up',
    status: 'COMING_SOON',
    partnerConfigured: false,
    partnerName: 'Partner pending',
    disbursement: 'PARTNER_REFERRAL',
    segmentId: 'SEG-02',
    segment: 'Lagos keke weekly',
  },
]

/** @deprecated use offersVisibleToOperator — kept for any stray imports */
export const OPERATOR_OFFERS = OPERATOR_OFFER_CATALOG.filter(
  (o) => o.segmentId === 'SEG-01' || o.segmentId === 'SEG-03',
)

export function findOperatorOffer(id: string) {
  return OPERATOR_OFFER_CATALOG.find((o) => o.id === id)
}

/**
 * Offers this operator may see:
 * - segmentIds must include offer.segmentId
 * - catalog ACTIVE or COMING_SOON (partner pending still visible)
 * At most one Credit product is actionable; membership already scopes tiers.
 */
export function offersVisibleToOperator(segmentIds: string[] | undefined | null) {
  const set = new Set(segmentIds ?? [])
  if (set.size === 0) return [] as OperatorOffer[]
  return OPERATOR_OFFER_CATALOG.filter(
    (o) =>
      set.has(o.segmentId) &&
      (o.status === 'ACTIVE' || o.status === 'COMING_SOON'),
  )
}

export function primaryCreditOffer(offers: OperatorOffer[]) {
  return offers.find(
    (o) => o.type === 'Credit' && o.status === 'ACTIVE' && o.partnerConfigured,
  )
}

export function assignmentForOffer(
  assignments: OperatorOfferAssignment[] | undefined | null,
  offerId: string,
) {
  return assignments?.find((a) => a.offerId === offerId)
}

export function offerCtaLabel(
  offer: OperatorOffer,
  opts: {
    loanActive: boolean
    activeCreditOfferId?: string | null
    assignment?: OperatorOfferAssignment | null
  },
) {
  if (offer.status === 'COMING_SOON' || !offer.partnerConfigured) return 'Coming soon'
  if (offer.type === 'Credit') {
    if (opts.assignment?.status === 'ACTIVE' || opts.activeCreditOfferId === offer.id) {
      return 'View schedule'
    }
    if (opts.loanActive) return 'Unavailable'
    return 'Apply'
  }
  if (opts.assignment?.status === 'ACCEPTED' || opts.assignment?.status === 'OFFERED') {
    return 'Interested'
  }
  if (offer.type === 'Insurance') return 'Review'
  return 'Review'
}
