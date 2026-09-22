import { useFetchData } from '@shared/hooks/api'
import { FINANCE_ENDPOINTS, financeQueryKeys } from '../constants'
import type {
  CursorPaginated,
  PageNumberPaginated,
  PaymentApi,
  WalletDetailApi,
  WalletListApi,
} from '../types'

export function useWallet(
  walletId: string | null | undefined,
  options?: { enabled?: boolean },
) {
  const id = walletId ?? ''
  const enabled = Boolean(id) && options?.enabled !== false
  const query = useFetchData<WalletDetailApi>(
    FINANCE_ENDPOINTS.wallet(id),
    undefined,
    { enabled, staleTime: 30_000 },
  )
  return {
    ...query,
    wallet: query.data ?? null,
    queryKey: financeQueryKeys.wallet(id),
  }
}

export function useWalletByAccount(
  accountId: string | null | undefined,
  options?: { enabled?: boolean },
) {
  const id = accountId ?? ''
  const enabled = Boolean(id) && options?.enabled !== false
  const query = useFetchData<PageNumberPaginated<WalletListApi>>(
    FINANCE_ENDPOINTS.wallets,
    { account: id, page_size: 1 },
    { enabled, staleTime: 30_000 },
  )
  const row = query.data?.results?.[0] ?? null
  return {
    ...query,
    walletListRow: row,
    walletId: row?.id ?? null,
  }
}

export function useAccountPayments(
  accountId: string | null | undefined,
  options?: { enabled?: boolean; page_size?: number },
) {
  const id = accountId ?? ''
  const enabled = Boolean(id) && options?.enabled !== false
  const query = useFetchData<CursorPaginated<PaymentApi>>(
    FINANCE_ENDPOINTS.payments,
    { account: id, page_size: options?.page_size ?? 25 },
    { enabled, keepPreviousData: true, staleTime: 30_000 },
  )
  return {
    ...query,
    payments: query.data?.results ?? [],
    queryKey: financeQueryKeys.paymentsByAccount(id),
  }
}

function cursorFromLink(link: string | null | undefined): string | undefined {
  if (!link) return undefined
  try {
    return new URL(link).searchParams.get('cursor') ?? undefined
  } catch {
    return undefined
  }
}

export function usePayments(
  params?: {
    status?: string
    channel?: string
    purpose?: string
    hub?: string
    search?: string
    start_date?: string
    end_date?: string
    cursor?: string
    page_size?: number
  },
  options?: { enabled?: boolean },
) {
  const enabled = options?.enabled !== false
  const query = useFetchData<CursorPaginated<PaymentApi>>(
    FINANCE_ENDPOINTS.payments,
    {
      page_size: params?.page_size ?? 25,
      ...(params?.status && params.status !== 'all'
        ? { status: params.status }
        : {}),
      ...(params?.channel && params.channel !== 'all'
        ? { channel: params.channel }
        : {}),
      ...(params?.purpose ? { purpose: params.purpose } : {}),
      ...(params?.hub ? { hub: params.hub } : {}),
      ...(params?.search ? { search: params.search } : {}),
      ...(params?.start_date ? { start_date: params.start_date } : {}),
      ...(params?.end_date ? { end_date: params.end_date } : {}),
      ...(params?.cursor ? { cursor: params.cursor } : {}),
    },
    { enabled, keepPreviousData: true, staleTime: 30_000 },
  )
  return {
    ...query,
    payments: query.data?.results ?? [],
    nextCursor: cursorFromLink(query.data?.next),
    previousCursor: cursorFromLink(query.data?.previous),
  }
}

export function usePayment(
  id: string | null | undefined,
  options?: { enabled?: boolean },
) {
  const paymentId = id ?? ''
  const enabled = Boolean(paymentId) && options?.enabled !== false
  const query = useFetchData<PaymentApi>(
    paymentId
      ? FINANCE_ENDPOINTS.payment(paymentId)
      : FINANCE_ENDPOINTS.payments,
    undefined,
    { enabled, staleTime: 15_000 },
  )
  return { ...query, payment: query.data ?? null }
}
