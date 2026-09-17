export const MOBILITY_ENDPOINTS = {
  vehicles: '/mobility/vehicles/',
  vehicle: (id: string) => `/mobility/vehicles/${id}/`,
  subscriptions: '/mobility/subscriptions/',
  plans: '/mobility/plans/',
  plan: (id: string) => `/mobility/plans/${id}/`,
  swaps: '/mobility/swaps/',
} as const

export const mobilityQueryKeys = {
  all: ['mobility'] as const,
  vehicles: () => [...mobilityQueryKeys.all, 'vehicles'] as const,
  vehiclesByAccount: (accountId: string) =>
    [...mobilityQueryKeys.vehicles(), 'account', accountId] as const,
  subscriptions: () => [...mobilityQueryKeys.all, 'subscriptions'] as const,
  subscriptionsByAccount: (accountId: string) =>
    [...mobilityQueryKeys.subscriptions(), 'account', accountId] as const,
  subscriptionsByPlan: (planId: string) =>
    [...mobilityQueryKeys.subscriptions(), 'plan', planId] as const,
  plans: () => [...mobilityQueryKeys.all, 'plans'] as const,
  plan: (id: string) => [...mobilityQueryKeys.plans(), id] as const,
  swapsByAccount: (accountId: string) =>
    [...mobilityQueryKeys.all, 'swaps', 'account', accountId] as const,
}
