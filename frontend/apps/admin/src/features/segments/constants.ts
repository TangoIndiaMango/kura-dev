export const SEGMENTS_ENDPOINTS = {
  list: '/segments/',
  segment: (id: string) => `/segments/${id}/`,
  preview: '/segments/preview/',
  refresh: (id: string) => `/segments/${id}/refresh/`,
  members: (id: string) => `/segments/${id}/members/`,
} as const
