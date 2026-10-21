/** Live shifts + cash deposits for Payments cash recon tab. */
import { useFetchData, usePostData } from '@shared/hooks/api'
import { ADMIN_LIST_PAGE_SIZE } from '@shared/utils/cursor-pagination'
import { shiftCashPhase } from '../cashReconHelpers'

export const OPS_ENDPOINTS = {
  shifts: '/operations/shifts/',
  shift: (id: string) => `/operations/shifts/${id}/`,
  shiftClose: (id: string) => `/operations/shifts/${id}/close/`,
  shiftLodge: (id: string) => `/operations/shifts/${id}/lodge/`,
  shiftOpen: '/operations/shifts/open/',
  cashDeposits: '/operations/cash-deposits/',
  commandCentre: '/operations/command-centre/',
  activity: '/operations/activity/',
} as const

export type ShiftRow = {
  id: string
  agent_id: string
  agent_name: string
  hub_id: string
  hub_code: string
  hub_name: string
  opened_at: string
  closed_at?: string | null
  opening_cash_kobo: number
  closing_cash_kobo?: number | null
  expected_cash_kobo?: number | null
  variance_kobo?: number | null
  lodge_ref?: string
  lodged_amount_kobo?: number | null
  lodged_at?: string | null
  status: 'OPEN' | 'CLOSED' | string
  deposit_ids?: string[]
}

type Page<T> = { results: T[]; count?: number }

export function useShifts(params?: {
  status?: string
  page?: number
  page_size?: number
  enabled?: boolean
  hub?: string
  agent?: string
  start_date?: string
  end_date?: string
}) {
  return useFetchData<Page<ShiftRow>>(
    OPS_ENDPOINTS.shifts,
    {
      page: params?.page ?? 1,
      page_size: params?.page_size ?? ADMIN_LIST_PAGE_SIZE,
      ...(params?.status ? { status: params.status } : {}),
      ...(params?.hub ? { hub: params.hub } : {}),
      ...(params?.agent ? { agent: params.agent } : {}),
      ...(params?.start_date ? { start_date: params.start_date } : {}),
      ...(params?.end_date ? { end_date: params.end_date } : {}),
    },
    {
      enabled: params?.enabled !== false,
      keepPreviousData: true,
      staleTime: 30_000,
    },
  )
}

export function useShift(id: string | undefined) {
  return useFetchData<ShiftRow>(
    id ? OPS_ENDPOINTS.shift(id) : OPS_ENDPOINTS.shifts,
    undefined,
    { enabled: Boolean(id) },
  )
}

export function useCloseShift(id: string) {
  return usePostData<{ closing_cash_kobo: number }, ShiftRow>(
    OPS_ENDPOINTS.shiftClose(id),
    [OPS_ENDPOINTS.shifts, OPS_ENDPOINTS.shift(id)],
    { silentError: true },
  )
}

export function useLodgeShift(id: string) {
  return usePostData<
    { lodge_ref: string; amount_kobo?: number },
    ShiftRow
  >(OPS_ENDPOINTS.shiftLodge(id), [OPS_ENDPOINTS.shifts, OPS_ENDPOINTS.shift(id)], {
    silentError: true,
  })
}

export function useOpenShift() {
  return usePostData<
    { hub_id: string; opening_cash_kobo?: number },
    ShiftRow
  >(OPS_ENDPOINTS.shiftOpen, [OPS_ENDPOINTS.shifts], { silentError: true })
}

export type CashDepositCreate = {
  account_id: string
  hub_id: string
  amount_kobo: number
  purpose?: 'SWAP' | 'FUND'
  idempotency_key?: string
  psp_agent_ref?: string
  shift_id?: string
}

export function useRecordCashDeposit() {
  return usePostData<CashDepositCreate, CashDepositRow>(
    OPS_ENDPOINTS.cashDeposits,
    [OPS_ENDPOINTS.cashDeposits, OPS_ENDPOINTS.shifts],
    { silentError: true },
  )
}

export type CashDepositRow = {
  id: string
  receipt_code: string
  amount_kobo: number
  status: string
  hub_code: string
  account_kura_id?: string | null
  shift_id: string
  created_at: string
}

export function useCashDeposits(params?: {
  shift?: string
  enabled?: boolean
}) {
  return useFetchData<{ results: CashDepositRow[] }>(
    OPS_ENDPOINTS.cashDeposits,
    {
      ...(params?.shift ? { shift: params.shift } : {}),
    },
    { enabled: params?.enabled !== false, staleTime: 30_000 },
  )
}

export function mapShiftToCashRow(s: ShiftRow) {
  const collectedKobo =
    s.expected_cash_kobo != null
      ? s.expected_cash_kobo - s.opening_cash_kobo
      : null
  const variance = s.variance_kobo ?? 0
  const status = shiftCashPhase(s)
  const takeCount = s.deposit_ids?.length ?? 0
  return {
    id: s.id,
    hub: s.hub_code,
    agent: s.agent_name,
    openedAt: s.opened_at,
    closedAt: s.closed_at ?? null,
    openingNaira: s.opening_cash_kobo / 100,
    collectedNaira: collectedKobo != null ? collectedKobo / 100 : null,
    depositedNaira: (s.lodged_amount_kobo ?? s.closing_cash_kobo ?? 0) / 100,
    varianceNaira: s.variance_kobo != null ? variance / 100 : null,
    takeCount,
    lodged: Boolean(s.lodged_at),
    asOf: s.closed_at || s.opened_at,
    status,
  }
}
