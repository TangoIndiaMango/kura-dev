export const OFFERS_ENDPOINTS = {
  list: '/offers/',
  offer: (id: string) => `/offers/${id}/`,
  assign: (id: string) => `/offers/${id}/assign/`,
} as const
