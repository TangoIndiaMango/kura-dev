import {
  MOCK_DISCOUNTS,
  type DiscountPeriod,
  type DiscountRecord,
} from '@shared/mock/adminMockData'
import { formatNaira } from '@shared/utils/currency'
import { formatDiscountValue } from './discountHelpers'

export type DiscountChannel = 'App' | 'USSD' | 'Hub'

export type DiscountRedeemContext = {
  channel: DiscountChannel
  period: DiscountPeriod
  /** Plan catalog id (e.g. PLN-02) when charging a plan. */
  planId?: string | null
  vehicleCount?: number
  /** When set, SEGMENT audience only accepts if grant matches this discount. */
  grantedDiscountId?: string | null
}

export type DiscountRedeemOk = {
  ok: true
  discount: DiscountRecord
  listNaira: number
  discountNaira: number
  dueNaira: number
  code: string
  valueLabel: string
}

export type DiscountRedeemErr = {
  ok: false
  reason: string
}

export type DiscountRedeemResult = DiscountRedeemOk | DiscountRedeemErr

function normalizeCode(raw: string) {
  return raw.trim().toUpperCase().replace(/\s+/g, '')
}

function channelAllowed(channels: string, channel: DiscountChannel) {
  const parts = channels.split(/[·,|/]/).map((p) => p.trim().toLowerCase())
  return parts.some((p) => p === channel.toLowerCase())
}

function findByCode(code: string): DiscountRecord | undefined {
  const normalized = normalizeCode(code)
  return MOCK_DISCOUNTS.find((d) => normalizeCode(d.code) === normalized)
}

/** Never auto-apply — only after explicit code entry + confirm. */
export function redeemDiscountCode(
  rawCode: string,
  listNaira: number,
  ctx: DiscountRedeemContext,
): DiscountRedeemResult {
  const code = normalizeCode(rawCode)
  if (!code) {
    return { ok: false, reason: 'Enter a discount code.' }
  }

  // No charge ⇒ nothing to discount (plan-covered swap, etc.).
  if (listNaira <= 0) {
    return { ok: false, reason: 'No charge on this payment — discount does not apply.' }
  }

  const discount = findByCode(code)
  if (!discount) {
    return { ok: false, reason: 'Code not found.' }
  }

  if (discount.status !== 'ACTIVE') {
    if (discount.status === 'SCHEDULED') {
      return { ok: false, reason: 'This code is not live yet.' }
    }
    if (discount.status === 'EXPIRED') {
      return { ok: false, reason: 'This code has expired.' }
    }
    if (discount.status === 'PAUSED') {
      return { ok: false, reason: 'This code is paused.' }
    }
    if (discount.status === 'PENDING' || discount.status === 'DRAFT') {
      return { ok: false, reason: 'This code is not available.' }
    }
    return { ok: false, reason: 'This code is not available.' }
  }

  if (!channelAllowed(discount.channels, ctx.channel)) {
    return {
      ok: false,
      reason: `Not valid on ${ctx.channel}. Use: ${discount.channels}.`,
    }
  }

  if (!discount.periods.includes(ctx.period)) {
    const periodLabel =
      ctx.period === 'swap'
        ? 'pay-per-swap'
        : ctx.period === 'daily'
          ? 'daily plans'
          : ctx.period === 'weekly'
            ? 'weekly plans'
            : 'monthly plans'
    return { ok: false, reason: `Not valid for ${periodLabel}.` }
  }

  if (!discount.appliesToAllPlans && ctx.period !== 'swap') {
    if (!ctx.planId || !discount.planIds.includes(ctx.planId)) {
      return { ok: false, reason: 'Not valid for this plan.' }
    }
  }

  if (discount.audience === 'FLEET') {
    const min = discount.fleetMinVehicles ?? 2
    if ((ctx.vehicleCount ?? 0) < min) {
      return {
        ok: false,
        reason: `Needs ${min}+ vehicles on the account.`,
      }
    }
  }

  if (discount.audience === 'SEGMENT') {
    if (ctx.grantedDiscountId && ctx.grantedDiscountId !== discount.id) {
      return {
        ok: false,
        reason: 'Not eligible for this segment code.',
      }
    }
    // Without a grant on file, still allow if they have the code (issued offline / email).
    // Strict segment membership is enforced by the grant + notify path in production.
  }

  const discountNaira =
    discount.valueType === 'PERCENT'
      ? Math.round((listNaira * discount.value) / 100)
      : Math.min(listNaira, discount.value)
  const dueNaira = Math.max(0, listNaira - discountNaira)

  return {
    ok: true,
    discount,
    listNaira,
    discountNaira,
    dueNaira,
    code: discount.code,
    valueLabel: formatDiscountValue(discount),
  }
}

export function discountReceiptRows(applied: DiscountRedeemOk | null) {
  if (!applied) return [] as { label: string; value: string }[]
  return [
    { label: 'List amount', value: formatNaira(applied.listNaira) },
    { label: 'Discount', value: `${applied.code} · −${formatNaira(applied.discountNaira)}` },
    { label: 'Amount due', value: formatNaira(applied.dueNaira) },
  ]
}
