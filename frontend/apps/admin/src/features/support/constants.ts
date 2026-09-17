export const SUPPORT_ENDPOINTS = {
  cases: '/support/cases/',
  stats: '/support/cases/stats/',
  export: '/support/cases/export/',
  case: (id: string) => `/support/cases/${id}/`,
  notes: (id: string) => `/support/cases/${id}/notes/`,
  status: (id: string) => `/support/cases/${id}/status/`,
  assign: (id: string) => `/support/cases/${id}/assign/`,
} as const

export const supportQueryKeys = {
  all: ['support'] as const,
  cases: () => [...supportQueryKeys.all, 'cases'] as const,
  stats: () => [...supportQueryKeys.all, 'stats'] as const,
  casesByAccount: (accountId: string) =>
    [...supportQueryKeys.cases(), 'account', accountId] as const,
  case: (id: string) => [...supportQueryKeys.all, 'case', id] as const,
}
