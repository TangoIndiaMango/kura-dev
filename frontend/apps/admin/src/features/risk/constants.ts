export const RISK_ENDPOINTS = {
  events: '/risk/events/',
  event: (id: string) => `/risk/events/${id}/`,
  review: (id: string) => `/risk/events/${id}/review/`,
  stats: '/risk/events/stats/',
  export: '/risk/events/export/',
  rules: '/risk/rules/',
} as const

export const riskQueryKeys = {
  all: ['risk'] as const,
  events: () => [...riskQueryKeys.all, 'events'] as const,
  eventsByAccount: (accountId: string) =>
    [...riskQueryKeys.events(), 'account', accountId] as const,
  event: (id: string) => [...riskQueryKeys.all, 'event', id] as const,
  stats: () => [...riskQueryKeys.all, 'stats'] as const,
}
