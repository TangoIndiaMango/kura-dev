export const ALERTS_ENDPOINTS = {
  list: '/operations/alerts/',
  alert: (id: string) => `/operations/alerts/${id}/`,
  stats: '/operations/alerts/stats/',
  export: '/operations/alerts/export/',
  ack: (id: string) => `/operations/alerts/${id}/ack/`,
  resolve: (id: string) => `/operations/alerts/${id}/resolve/`,
  escalate: (id: string) => `/operations/alerts/${id}/escalate/`,
} as const
