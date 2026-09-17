import { useFetchData, usePostData } from '@shared/hooks/api'
import { WALLET_API } from './use-operator-wallet'

export const CREDIT_API = {
  eligibility: '/credit/eligibility/',
  applications: '/credit/applications/',
  loans: '/credit/loans/',
  loan: (id: string) => `/credit/loans/${id}/`,
  repay: (id: string) => `/credit/loans/${id}/repay/`,
} as const

export const creditQueryKeys = {
  all: ['credit'] as const,
  eligibility: () => [...creditQueryKeys.all, 'eligibility'] as const,
  loans: () => [...creditQueryKeys.all, 'loans'] as const,
  loan: (id: string) => [...creditQueryKeys.loans(), id] as const,
}

export type CreditProgressApi = {
  active_days: number
  active_days_required: number
  on_time_pct: number
  on_time_required_pct: number
  trusted_device_days: number
  trusted_device_required_days: number
  this_browser_days?: number | null
  swaps_per_week?: number
  factors?: Record<string, number>
  device_trust_note?: string
}

export type CreditEligibilityApi = {
  eligible: boolean
  score: number
  threshold: number
  recommended_limit_kobo: number
  kyc_verified: boolean
  loan_active: boolean
  risk_status: string
  progress: CreditProgressApi
  blockers: string[]
  credit_line_status: string | null
  credit_enabled: boolean
  offers_enabled: boolean
}

export type LoanScheduleItemApi = {
  due_on: string
  amount_kobo: number
  status: string
}

export type LoanApi = {
  id: string
  status: string
  principal_kobo: number
  interest_kobo: number
  total_due_kobo: number
  repaid_kobo: number
  remaining_due_kobo: number
  daily_installment_kobo: number
  swap_credit_remaining_kobo: number
  starts_at: string
  due_at: string
  grace_until: string | null
  application_id: string
  account_id: string
  schedule?: LoanScheduleItemApi[]
}

type CursorPage<T> = { results: T[]; next: string | null; previous: string | null }

const ACTIVE_LOAN = new Set(['ACTIVE', 'GRACE', 'RESTRICTED'])

export function newCreditIdempotencyKey(prefix: string): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `${prefix}-${crypto.randomUUID()}`
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

export function loanDaysLeft(dueAt: string): number {
  const ms = new Date(dueAt).getTime() - Date.now()
  if (!Number.isFinite(ms)) return 0
  return Math.max(0, Math.ceil(ms / 86_400_000))
}

export function pickActiveLoan(loans: LoanApi[]): LoanApi | null {
  return loans.find((l) => ACTIVE_LOAN.has(l.status)) ?? null
}

const invalidateCredit = [
  CREDIT_API.eligibility,
  CREDIT_API.loans,
  CREDIT_API.applications,
  WALLET_API.mine,
]

export function useCreditEligibility(options?: { enabled?: boolean }) {
  const query = useFetchData<CreditEligibilityApi>(
    CREDIT_API.eligibility,
    undefined,
    {
      enabled: options?.enabled !== false,
      staleTime: 30_000,
      refetchOnWindowFocus: true,
    },
  )
  return {
    ...query,
    eligibility: query.data ?? null,
    creditEnabled: Boolean(query.data?.credit_enabled),
  }
}

export function useOperatorLoans(options?: {
  enabled?: boolean
  page_size?: number
}) {
  const query = useFetchData<CursorPage<LoanApi>>(
    CREDIT_API.loans,
    { page_size: options?.page_size ?? 20 },
    {
      enabled: options?.enabled !== false,
      staleTime: 30_000,
      keepPreviousData: true,
      refetchOnWindowFocus: true,
    },
  )
  const loans = query.data?.results ?? []
  return {
    ...query,
    loans,
    activeLoan: pickActiveLoan(loans),
  }
}

export function useOperatorLoan(
  id: string | null | undefined,
  options?: { enabled?: boolean },
) {
  const query = useFetchData<LoanApi>(
    id ? CREDIT_API.loan(id) : CREDIT_API.loans,
    undefined,
    {
      enabled: Boolean(id) && options?.enabled !== false,
      staleTime: 30_000,
    },
  )
  return { ...query, loan: query.data ?? null }
}

export function useApplyCredit() {
  return usePostData<
    {
      amount_kobo: number
      tenor_days: number
      idempotency_key: string
      pin_grant: string
    },
    {
      id: string
      status: string
      loan_id: string | null
      swap_credit_remaining_kobo?: number
    }
  >(CREDIT_API.applications, invalidateCredit, { silentError: true })
}

export function useRepayLoan() {
  return usePostData<
    {
      id: string
      amount_kobo: number
      idempotency_key: string
      pin_grant: string
    },
    LoanApi
  >((v) => CREDIT_API.repay(v.id), invalidateCredit, {
    silentError: true,
    body: (v) => ({
      amount_kobo: v.amount_kobo,
      idempotency_key: v.idempotency_key,
      pin_grant: v.pin_grant,
    }),
  })
}
