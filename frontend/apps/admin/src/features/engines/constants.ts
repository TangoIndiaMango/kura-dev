export const ENGINES_ENDPOINTS = {
  list: '/mobility/engines/',
  engine: (id: string) => `/mobility/engines/${id}/`,
  releaseRequest: (id: string) => `/mobility/engines/${id}/release-request/`,
  release: (id: string) => `/mobility/engines/${id}/release/`,
} as const

export const EBOARDERS_ENDPOINTS = {
  list: '/mobility/eboarders/',
  stats: '/mobility/eboarders/stats/',
  eboarder: (id: string) => `/mobility/eboarders/${id}/`,
} as const

export const RETROFITS_ENDPOINTS = {
  list: '/mobility/retrofits/',
  retrofit: (id: string) => `/mobility/retrofits/${id}/`,
  engineIntake: (id: string) => `/mobility/retrofits/${id}/engine-intake/`,
  install: (id: string) => `/mobility/retrofits/${id}/install/`,
  checklist: (id: string) => `/mobility/retrofits/${id}/checklist/`,
  activate: (id: string) => `/mobility/retrofits/${id}/activate/`,
} as const
