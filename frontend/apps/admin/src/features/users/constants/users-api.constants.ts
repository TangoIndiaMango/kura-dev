export const USERS_ENDPOINTS = {
  list: '/users/',
  stats: '/users/stats/',
  export: '/users/export/',
  detail: (id: string) => `/users/${id}/`,
  deactivate: (id: string) => `/users/${id}/deactivate/`,
  activate: (id: string) => `/users/${id}/activate/`,
  resendInvite: (id: string) => `/users/${id}/resend-invite/`,
} as const

export const ROLES_ENDPOINTS = {
  list: '/roles/',
  stats: '/roles/stats/',
  export: '/roles/export/',
  detail: (id: string) => `/roles/${id}/`,
  activate: (id: string) => `/roles/${id}/activate/`,
  deactivate: (id: string) => `/roles/${id}/deactivate/`,
  permissions: '/permissions/',
} as const

export const USERS_QUERY_KEY = 'users'
export const ROLES_QUERY_KEY = 'roles'
