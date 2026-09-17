import { useFetchData, usePostData } from '@shared/hooks/api'

export const SUPPORT_API = {
  cases: '/support/cases/',
  case: (id: string) => `/support/cases/${id}/`,
  notes: (id: string) => `/support/cases/${id}/notes/`,
} as const

export type SupportCaseKind =
  | 'GENERAL'
  | 'PAYMENT_DISPUTE'
  | 'IDENTITY'
  | 'ENGINE_RELEASE'
  | 'RISK_REFERRAL'
  | 'OTHER'

export type SupportCaseStatus = 'OPEN' | 'PENDING' | 'RESOLVED' | 'CLOSED'
export type SupportCasePriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT'

export type SupportCaseListApi = {
  id: string
  code: string
  subject: string
  kind: SupportCaseKind
  priority: SupportCasePriority
  status: SupportCaseStatus
  created_at: string
  sla_due_at?: string | null
  payment_id?: string | null
}

export type SupportCaseEventApi = {
  id: string
  kind: string
  body: string
  actor_id?: string | null
  actor_name?: string | null
  attachment_id?: string | null
  attachment_url?: string | null
  attachment_name?: string | null
  attachment_content_type?: string | null
  created_at: string
}

export type SupportCaseDetailApi = SupportCaseListApi & {
  events: SupportCaseEventApi[]
  account_id: string
  updated_at?: string
}

export type OpenCasePayload = {
  subject: string
  kind?: SupportCaseKind
  priority?: SupportCasePriority
  body?: string
  account_id?: string
  attachment_asset_id?: string
  payment_id?: string
}

type CursorPage<T> = { results: T[]; next: string | null; previous: string | null }

export function useOperatorCases(options?: { enabled?: boolean }) {
  const query = useFetchData<CursorPage<SupportCaseListApi>>(
    SUPPORT_API.cases,
    { page_size: 25 },
    {
      enabled: options?.enabled !== false,
      staleTime: 30_000,
      keepPreviousData: true,
    },
  )
  return { ...query, cases: query.data?.results ?? [] }
}

export function useOperatorCase(
  id: string | null | undefined,
  options?: { enabled?: boolean },
) {
  const caseId = id ?? ''
  const query = useFetchData<SupportCaseDetailApi>(
    caseId ? SUPPORT_API.case(caseId) : SUPPORT_API.cases,
    undefined,
    {
      enabled: Boolean(caseId) && options?.enabled !== false,
      staleTime: 15_000,
    },
  )
  return { ...query, supportCase: query.data ?? null }
}

export function useOpenSupportCase() {
  return usePostData<OpenCasePayload, SupportCaseDetailApi>(
    SUPPORT_API.cases,
    [SUPPORT_API.cases],
    { silentError: true },
  )
}

export function useAddCaseNote(caseId: string) {
  return usePostData<
    { body?: string; attachment_asset_id?: string },
    SupportCaseDetailApi
  >(
    SUPPORT_API.notes(caseId),
    [SUPPORT_API.cases, SUPPORT_API.case(caseId)],
    { silentError: true },
  )
}

export function kindLabel(kind: SupportCaseKind): string {
  if (kind === 'PAYMENT_DISPUTE') return 'Dispute'
  if (kind === 'IDENTITY') return 'Identity'
  if (kind === 'ENGINE_RELEASE') return 'Engine'
  if (kind === 'RISK_REFERRAL') return 'Risk'
  if (kind === 'OTHER') return 'Other'
  return 'Support'
}

export function uiKindToApi(type: string): SupportCaseKind {
  if (type === 'Dispute' || type === 'Billing') return 'PAYMENT_DISPUTE'
  if (type === 'Technical') return 'OTHER'
  return 'GENERAL'
}

export function formatCaseWhen(iso: string): string {
  try {
    return new Date(iso).toLocaleString([], {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return iso
  }
}
