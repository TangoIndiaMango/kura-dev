import { useFetchData, usePostData } from '@shared/hooks/api'
import {
  ADMIN_LIST_PAGE_SIZE,
  cursorFromLink,
} from '@shared/utils/cursor-pagination'
import { useCapabilities } from '../../auth/useCapabilities'
import { CREDIT_ENDPOINTS } from '../constants'
import { mapCreditScore } from '../creditScoreMap'
import type {
  ApplicationDecisionPayload,
  CreditApplicationApi,
  CreditScoreApi,
  CursorPaginated,
  LoanApi,
  OverrideScorePayload,
} from '../types'

export function useCreditScores(
  params?: {
    account?: string
    cursor?: string
    page_size?: number
  },
  options?: { enabled?: boolean; threshold?: number },
) {
  const { can } = useCapabilities()
  const enabled = options?.enabled !== false && can('credit:approve')
  const query = useFetchData<CursorPaginated<CreditScoreApi>>(
    CREDIT_ENDPOINTS.scores,
    {
      page_size: params?.page_size ?? ADMIN_LIST_PAGE_SIZE,
      ...(params?.account ? { account: params.account } : {}),
      ...(params?.cursor ? { cursor: params.cursor } : {}),
    },
    { enabled, keepPreviousData: true, staleTime: 30_000 },
  )
  const threshold = options?.threshold ?? 60
  const scores = (query.data?.results ?? []).map((r) =>
    mapCreditScore(r, threshold),
  )
  return {
    ...query,
    scores,
    nextCursor: cursorFromLink(query.data?.next),
    previousCursor: cursorFromLink(query.data?.previous),
  }
}

export function useAccountCreditScore(
  accountId: string | null | undefined,
  options?: { enabled?: boolean; threshold?: number },
) {
  const id = accountId ?? ''
  const query = useCreditScores(
    { account: id || undefined, page_size: 5 },
    {
      enabled: Boolean(id) && options?.enabled !== false,
      threshold: options?.threshold,
    },
  )
  return {
    ...query,
    score: query.scores[0] ?? null,
    raw: query.data?.results?.[0] ?? null,
  }
}

export function useCreditApplications(
  params?: { cursor?: string; page_size?: number },
  options?: { enabled?: boolean },
) {
  const { can } = useCapabilities()
  const enabled = options?.enabled !== false && can('credit:approve')
  const query = useFetchData<CursorPaginated<CreditApplicationApi>>(
    CREDIT_ENDPOINTS.applications,
    {
      page_size: params?.page_size ?? ADMIN_LIST_PAGE_SIZE,
      ...(params?.cursor ? { cursor: params.cursor } : {}),
    },
    { enabled, keepPreviousData: true, staleTime: 30_000 },
  )
  return {
    ...query,
    applications: query.data?.results ?? [],
    nextCursor: cursorFromLink(query.data?.next),
    previousCursor: cursorFromLink(query.data?.previous),
  }
}

export function useCreditLoans(
  params?: { cursor?: string; page_size?: number; account?: string },
  options?: { enabled?: boolean },
) {
  const { can } = useCapabilities()
  const enabled = options?.enabled !== false && can('credit:approve')
  const query = useFetchData<CursorPaginated<LoanApi>>(
    CREDIT_ENDPOINTS.loans,
    {
      page_size: params?.page_size ?? ADMIN_LIST_PAGE_SIZE,
      ...(params?.account ? { account: params.account } : {}),
      ...(params?.cursor ? { cursor: params.cursor } : {}),
    },
    { enabled, keepPreviousData: true, staleTime: 30_000 },
  )
  return {
    ...query,
    loans: query.data?.results ?? [],
    nextCursor: cursorFromLink(query.data?.next),
    previousCursor: cursorFromLink(query.data?.previous),
  }
}

export function useOverrideCreditScore() {
  return usePostData<OverrideScorePayload, CreditScoreApi>(
    (vars) => CREDIT_ENDPOINTS.scoreOverride(vars.account_id),
    [CREDIT_ENDPOINTS.scores],
    {
      silentError: true,
      body: (vars) => ({
        score: vars.score,
        recommended_limit_kobo: vars.recommended_limit_kobo,
        reason: vars.reason,
      }),
    },
  )
}

export function useApproveCreditApplication() {
  return usePostData<ApplicationDecisionPayload, CreditApplicationApi>(
    (vars) => CREDIT_ENDPOINTS.applicationApprove(vars.id),
    [CREDIT_ENDPOINTS.applications, CREDIT_ENDPOINTS.loans],
    {
      silentError: true,
      body: (vars) => ({ reason: vars.reason ?? '' }),
    },
  )
}

export function useDeclineCreditApplication() {
  return usePostData<ApplicationDecisionPayload, CreditApplicationApi>(
    (vars) => CREDIT_ENDPOINTS.applicationDecline(vars.id),
    [CREDIT_ENDPOINTS.applications],
    {
      silentError: true,
      body: (vars) => ({ reason: vars.reason ?? '' }),
    },
  )
}

export { CREDIT_ENDPOINTS }
