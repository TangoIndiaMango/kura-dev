import { axiosInstance } from '@lib/api/client'
import { WALLET_API, type WalletMineApi } from '../wallet/hooks/use-operator-wallet'
import { openPaystackPopup } from './paystack-popup'

/** Paystack's smallest checkout we open (₦100). */
const MIN_CHECKOUT_KOBO = 10_000

type CheckoutStart = { reference: string; access_code: string; amount_kobo: number }
type CheckoutResult = { status: 'PENDING' | 'SUCCESS' | 'FAILED' }

export type CoverOutcome = 'covered' | 'cancelled' | 'failed' | 'pending'

const sleep = (ms: number) => new Promise((r) => window.setTimeout(r, ms))

/**
 * Makes sure the rider's Kura balance covers `dueKobo`: anything short is
 * paid now through Paystack's popup (card, transfer, USSD) and confirmed by
 * the server before we continue. Nothing is opened when the balance is enough.
 */
export async function coverShortfall(dueKobo: number): Promise<CoverOutcome> {
  const { data: wallet } = await axiosInstance.get<WalletMineApi>(WALLET_API.mine, { silentError: true })
  const short = dueKobo - (wallet.available_kobo ?? 0)
  if (short <= 0) return 'covered'
  const { data: checkout } = await axiosInstance.post<CheckoutStart>(WALLET_API.checkout, {
    amount_kobo: Math.max(short, MIN_CHECKOUT_KOBO),
  }, { silentError: true })
  const outcome = await openPaystackPopup(checkout.access_code)
  if (outcome !== 'success') return outcome === 'cancelled' ? 'cancelled' : 'failed'
  for (let attempt = 0; attempt < 6; attempt++) {
    const { data } = await axiosInstance.post<CheckoutResult>(WALLET_API.checkoutVerify, {
      reference: checkout.reference,
    }, { silentError: true })
    if (data.status === 'SUCCESS') return 'covered'
    if (data.status === 'FAILED') return 'failed'
    await sleep(2500)
  }
  return 'pending'
}
