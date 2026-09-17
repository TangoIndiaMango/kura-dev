export const IMPACT_ENDPOINTS = {
  stats: '/analytics/impact/',
  stories: '/analytics/stories/',
  story: (id: string) => `/analytics/stories/${id}/`,
  publish: (id: string) => `/analytics/stories/${id}/publish/`,
} as const

export const REPORTS_ENDPOINTS = {
  create: '/reports/',
  report: (id: string) => `/reports/${id}/`,
  download: (id: string) => `/reports/${id}/download/`,
} as const
