import { axiosInstance } from '@lib/api/client'
import { formatNaira } from './currency'

export type DiscountChannel = 'App' | 'USSD' | 'Hub'

export type DiscountRedeemContext = {
  channel: DiscountChannel
  period: 'swap' | 'daily' | 'weekly' | 'monthly'
  planOptionId?: string | null
  vehicleCount?: number
  planId?: string | null
}

export type DiscountRedeemOk = {
  ok: true
  code: string
  listNaira: number
  discountNaira: number
  dueNaira: number
  valueLabel: string
  discountId?: string
}

export type DiscountRedeemErr = {
  ok: false
  reason: string
}

export type DiscountRedeemResult = DiscountRedeemOk | DiscountRedeemErr

type RedeemApi = {
  code: string
  list_price_kobo: number
  discount_kobo: number
  due_kobo: number
  value_label: string
  discount_id?: string
}

function unwrap(data: unknown): RedeemApi {
  const raw = data as { data?: RedeemApi } & RedeemApi
  return (raw?.data ?? raw) as RedeemApi
}

/** Live quote via POST /mobility/discounts/redeem/ — server validates. */
export async function redeemDiscountCode(
  rawCode: string,
  listNaira: number,
  ctx: DiscountRedeemContext,
): Promise<DiscountRedeemResult> {
  const code = rawCode.trim().toUpperCase().replace(/\s+/g, '')
  if (!code) return { ok: false, reason: 'Enter a discount code.' }
  if (listNaira <= 0) {
    return {
      ok: false,
      reason: 'No charge on this payment — discount does not apply.',
    }
  }
  try {
    const { data } = await axiosInstance.post(
      '/mobility/discounts/redeem/',
      {
        code,
        list_price_kobo: Math.round(listNaira * 100),
        period: ctx.period,
        channel: ctx.channel,
        ...(ctx.planId ? { plan: ctx.planId } : {}),
      },
      { silentError: true },
    )
    const quote = unwrap(data)
    return {
      ok: true,
      code: quote.code,
      listNaira: quote.list_price_kobo / 100,
      discountNaira: quote.discount_kobo / 100,
      dueNaira: quote.due_kobo / 100,
      valueLabel: quote.value_label || formatNaira(quote.discount_kobo, { fromKobo: true }),
      discountId: quote.discount_id,
    }
  } catch (err) {
    const ax = err as {
      response?: { data?: { error?: { message?: string } } }
      message?: string
    }
    return {
      ok: false,
      reason:
        ax.response?.data?.error?.message ||
        ax.message ||
        'Could not apply this code.',
    }
  }
}
