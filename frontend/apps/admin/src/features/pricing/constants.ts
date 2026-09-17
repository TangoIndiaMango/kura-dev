export const PRICING_ENDPOINTS = {
  matrices: '/mobility/pricing/matrices/',
  matrix: (id: string) => `/mobility/pricing/matrices/${id}/`,
  activateMatrix: (id: string) => `/mobility/pricing/matrices/${id}/activate/`,
  scheduleMatrix: (id: string) => `/mobility/pricing/matrices/${id}/schedule/`,
  rejectMatrix: (id: string) => `/mobility/pricing/matrices/${id}/reject/`,
  holdPolicy: '/mobility/pricing/hold-policy/',
  plans: '/mobility/plans/',
  plan: (id: string) => `/mobility/plans/${id}/`,
  activatePlan: (id: string) => `/mobility/plans/${id}/activate/`,
  deactivatePlan: (id: string) => `/mobility/plans/${id}/deactivate/`,
} as const

export const pricingQueryKeys = {
  all: ['pricing'] as const,
  matrices: () => [...pricingQueryKeys.all, 'matrices'] as const,
  matrix: (id: string) => [...pricingQueryKeys.matrices(), id] as const,
  holdPolicy: () => [...pricingQueryKeys.all, 'hold-policy'] as const,
  plans: () => [...pricingQueryKeys.all, 'plans'] as const,
  plan: (id: string) => [...pricingQueryKeys.plans(), id] as const,
}
