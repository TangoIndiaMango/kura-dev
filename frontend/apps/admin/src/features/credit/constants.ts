export const CREDIT_ENDPOINTS = {
  scores: '/credit/scores/',
  scoreOverride: (accountId: string) => `/credit/scores/${accountId}/override/`,
  applications: '/credit/applications/',
  applicationApprove: (id: string) => `/credit/applications/${id}/approve/`,
  applicationDecline: (id: string) => `/credit/applications/${id}/decline/`,
  loans: '/credit/loans/',
  loan: (id: string) => `/credit/loans/${id}/`,
} as const
