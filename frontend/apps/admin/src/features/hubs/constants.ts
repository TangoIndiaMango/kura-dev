export const HUBS_ENDPOINTS = {
  list: '/mobility/hubs/',
  hub: (id: string) => `/mobility/hubs/${id}/`,
  slots: (id: string) => `/mobility/hubs/${id}/slots/`,
  status: (id: string) => `/mobility/hubs/${id}/status/`,
  stats: '/mobility/hubs/stats/',
  export: '/mobility/hubs/export/',
} as const
