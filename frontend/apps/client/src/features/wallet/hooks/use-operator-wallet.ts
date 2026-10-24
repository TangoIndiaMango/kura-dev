import { useFetchData } from '@shared/hooks/api'

export const WALLET_API = {
  mine: '/finance/wallets/mine/',
  payments: '/finance/payments/',
  fund: '/finance/wallets/fund/',
  checkout: '/finance/wallets/checkout/',
  checkoutVerify: '/finance/wallets/checkout/verify/',
} as const

export type VirtualAccountApi = {
  id: string
  nuban: string | null
  bank_name: string
  account_name: string
  status: string
}

export type WalletMineApi = {
  id: string
  account_id: string
  balance_kobo: number
  hold_kobo: number
  available_kobo: number
  status: string
  virtual_account: VirtualAccountApi | null
  demo_fund_enabled?: boolean
  updated_at?: string
}

export type PaymentApi = {
  id: string
  channel: string
  amount_kobo: number
  vat_kobo: number
  receipt_code: string
  status: string
  purpose: string
  created_at: string
}

type CursorPage<T> = { results: T[]; next: string | null; previous: string | null }

function formatNuban(raw: string | null | undefined): string | null {
  const digits = (raw ?? '').replace(/\D/g, '')
  if (digits.length < 10) return null
  return `${digits.slice(0, 4)} ${digits.slice(4, 8)} ${digits.slice(8)}`
}

export function useOperatorWallet(options?: { enabled?: boolean }) {
  const query = useFetchData<WalletMineApi>(WALLET_API.mine, undefined, {
    enabled: options?.enabled !== false,
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  })
  const wallet = query.data ?? null
  const va = wallet?.virtual_account ?? null
  return {
    ...query,
    wallet,
    balanceNaira: wallet ? wallet.balance_kobo / 100 : null,
    availableNaira: wallet ? wallet.available_kobo / 100 : null,
    holdNaira: wallet ? wallet.hold_kobo / 100 : null,
    nuban: formatNuban(va?.nuban),
    bankLabel: va?.bank_name || 'Virtual account',
    accountName: va?.account_name || '',
    demoFundEnabled: Boolean(wallet?.demo_fund_enabled),
    syncedAt: wallet?.updated_at
      ? new Date(wallet.updated_at).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        })
      : '—',
  }
}

export function useOperatorPayments(options?: {
  enabled?: boolean
  page_size?: number
}) {
  const query = useFetchData<CursorPage<PaymentApi>>(
    WALLET_API.payments,
    { page_size: options?.page_size ?? 25 },
    {
      enabled: options?.enabled !== false,
      staleTime: 30_000,
      keepPreviousData: true,
      refetchOnWindowFocus: true,
    },
  )
  return { ...query, payments: query.data?.results ?? [] }
}
