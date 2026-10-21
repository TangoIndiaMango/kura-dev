export type VirtualAccountApi = {
  id: string
  nuban: string | null
  bank_name: string
  account_name: string
  psp_reference: string
  status: string
}

export type WalletListApi = {
  id: string
  account_id: string
  balance_kobo: number
  hold_kobo: number
  available_kobo: number
  status: string
  created_at: string
}

export type WalletDetailApi = WalletListApi & {
  virtual_account_id: string | null
  virtual_account: VirtualAccountApi | null
  updated_at?: string
}

export type PaymentApi = {
  id: string
  account_id: string
  account_kura_id?: string
  account_name?: string
  hub_code?: string | null
  hub_id: string | null
  channel: string
  amount_kobo: number
  vat_kobo: number
  receipt_code: string
  status: string
  purpose: string
  created_at: string
}

export type PageNumberPaginated<T> = {
  count: number
  page_size: number
  current_page: number
  total_pages: number
  next: string | null
  previous: string | null
  results: T[]
}

export type CursorPaginated<T> = {
  results: T[]
  next: string | null
  previous: string | null
}

/** Presentation standing derived from Finance wallet (not Accounts CRM). */
export type WalletStanding = 'FUNDED' | 'NEEDS_FUNDING' | 'NO_WALLET' | 'PENDING_VA'

export function walletStandingFromDetail(
  wallet: WalletDetailApi | null | undefined,
): WalletStanding {
  if (!wallet) return 'NO_WALLET'
  const va = wallet.virtual_account
  if (!va || va.status !== 'ACTIVE' || !va.nuban) return 'PENDING_VA'
  if (wallet.available_kobo > 0) return 'FUNDED'
  return 'NEEDS_FUNDING'
}

export const WALLET_STANDING_LABEL: Record<string, string> = {
  FUNDED: 'Funded',
  NEEDS_FUNDING: 'Needs funding',
  NO_WALLET: 'No wallet',
  PENDING_VA: 'Pending NUBAN',
}

export function walletStandingLabel(code: string): string {
  return WALLET_STANDING_LABEL[code] ?? code
}

export function walletStandingTone(code: string) {
  if (code === 'FUNDED') return 'success' as const
  if (code === 'NEEDS_FUNDING' || code === 'PENDING_VA') return 'warning' as const
  if (code === 'NO_WALLET') return 'neutral' as const
  return 'neutral' as const
}
