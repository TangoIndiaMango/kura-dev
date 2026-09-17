export const BATTERIES_ENDPOINTS = {
  list: '/mobility/batteries/',
  battery: (id: string) => `/mobility/batteries/${id}/`,
  status: (id: string) => `/mobility/batteries/${id}/status/`,
  transfer: (id: string) => `/mobility/batteries/${id}/transfer/`,
  fault: (id: string) => `/mobility/batteries/${id}/fault/`,
  found: (id: string) => `/mobility/batteries/${id}/found/`,
  retire: (id: string) => `/mobility/batteries/${id}/retire/`,
  label: (id: string) => `/mobility/batteries/${id}/label/`,
  events: (id: string) => `/mobility/batteries/${id}/events/`,
  stats: '/mobility/batteries/stats/',
  /** Flat list for dropdowns. */
  types: '/mobility/batteries/types/',
  export: '/mobility/batteries/export/',
} as const

export const BATTERY_TYPES_ENDPOINTS = {
  list: '/mobility/battery-types/',
  type: (id: string) => `/mobility/battery-types/${id}/`,
  activate: (id: string) => `/mobility/battery-types/${id}/activate/`,
} as const
