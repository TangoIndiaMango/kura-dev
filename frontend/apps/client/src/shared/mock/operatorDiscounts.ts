/** Mirrors admin campaign discounts the rider may enter at checkout. */

export type OperatorDiscountValueType = 'PERCENT' | 'AMOUNT'
export type OperatorDiscountAudience = 'ALL' | 'SEGMENT' | 'FLEET'
export type OperatorDiscountPeriod = 'daily' | 'weekly' | 'monthly' | 'swap'
export type OperatorDiscountStatus =
  | 'ACTIVE'
  | 'SCHEDULED'
  | 'EXPIRED'
  | 'PAUSED'
  | 'DRAFT'
  | 'PENDING'

export interface OperatorDiscountRecord {
  id: string
  name: string
  code: string
  valueType: OperatorDiscountValueType
  value: number
  status: OperatorDiscountStatus
  appliesToAllPlans: boolean
  /** Client plan option ids: daily | weekly | monthly | pps */
  planOptionIds: string[]
  periods: OperatorDiscountPeriod[]
  audience: OperatorDiscountAudience
  fleetMinVehicles?: number
  channels: string
  summary: string
}

export const OPERATOR_DISCOUNTS: OperatorDiscountRecord[] = [
  {
    id: 'DSC-01',
    name: 'Fleet volume · 5+',
    code: 'FLEET-8',
    valueType: 'PERCENT',
    value: 8,
    status: 'ACTIVE',
    appliesToAllPlans: true,
    planOptionIds: [],
    periods: ['weekly', 'monthly'],
    audience: 'FLEET',
    fleetMinVehicles: 5,
    channels: 'App · USSD · Hub',
    summary: '8% off weekly/monthly when the account has 5+ vehicles.',
  },
  {
    id: 'DSC-02',
    name: 'High-tenure loyalty',
    code: 'LOYAL-5',
    valueType: 'PERCENT',
    value: 5,
    status: 'ACTIVE',
    appliesToAllPlans: false,
    planOptionIds: ['weekly', 'monthly'],
    periods: ['weekly', 'monthly'],
    audience: 'SEGMENT',
    channels: 'App · USSD',
    summary: '5% off weekly/monthly for high-tenure riders.',
  },
  {
    id: 'DSC-03',
    name: 'Ramadan renewals',
    code: 'RAMADAN-26',
    valueType: 'PERCENT',
    value: 20,
    status: 'PENDING',
    appliesToAllPlans: true,
    planOptionIds: [],
    periods: ['weekly', 'monthly'],
    audience: 'ALL',
    channels: 'App · USSD · Hub',
    summary: 'Pending dual control — not redeemable.',
  },
  {
    id: 'DSC-04',
    name: 'New rider welcome',
    code: 'WELCOME-500',
    valueType: 'AMOUNT',
    value: 500,
    status: 'SCHEDULED',
    appliesToAllPlans: false,
    planOptionIds: ['daily'],
    periods: ['daily'],
    audience: 'ALL',
    channels: 'App',
    summary: '₦500 off Daily Pass — not live yet.',
  },
  {
    id: 'DSC-05',
    name: 'Ikeja hub launch',
    code: 'IKEJA-10',
    valueType: 'PERCENT',
    value: 10,
    status: 'EXPIRED',
    appliesToAllPlans: true,
    planOptionIds: [],
    periods: ['daily', 'weekly', 'monthly', 'swap'],
    audience: 'ALL',
    channels: 'Hub',
    summary: 'Expired launch promo.',
  },
  {
    id: 'DSC-07',
    name: 'Swap saver',
    code: 'SWAP-10',
    valueType: 'PERCENT',
    value: 10,
    status: 'ACTIVE',
    appliesToAllPlans: true,
    planOptionIds: [],
    periods: ['swap'],
    audience: 'ALL',
    channels: 'App · Hub',
    summary: '10% off pay-per-swap charges in app or at the hub.',
  },
]
