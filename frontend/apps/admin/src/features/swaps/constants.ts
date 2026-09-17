export const SWAPS_ENDPOINTS = {
  list: '/mobility/swaps/',
  swap: (id: string) => `/mobility/swaps/${id}/`,
  reverse: (id: string) => `/mobility/swaps/${id}/reverse/`,
  abort: (id: string) => `/mobility/swaps/${id}/abort/`,
  identityMismatch: '/mobility/swaps/identity-mismatch/',
  reservations: '/mobility/reservations/',
  reservation: (id: string) => `/mobility/reservations/${id}/`,
  reservationCancel: (id: string) => `/mobility/reservations/${id}/cancel/`,
  reservationExtend: (id: string) => `/mobility/reservations/${id}/extend/`,
} as const
