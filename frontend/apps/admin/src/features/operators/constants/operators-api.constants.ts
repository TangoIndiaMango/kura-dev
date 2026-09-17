export const ACCOUNTS_ENDPOINTS = {
  list: '/accounts/',
  stats: '/accounts/stats/',
  export: '/accounts/export/',
  detail: (id: string) => `/accounts/${id}/`,
  detailStats: (id: string) => `/accounts/${id}/stats/`,
  kyc: (id: string) => `/accounts/${id}/kyc/`,
  verifyKyc: (id: string) => `/accounts/${id}/kyc/verify/`,
  rejectKyc: (id: string) => `/accounts/${id}/kyc/reject/`,
  requestKycPhotos: (id: string) => `/accounts/${id}/kyc/request-photos/`,
  suspend: (id: string) => `/accounts/${id}/suspend/`,
  reinstate: (id: string) => `/accounts/${id}/reinstate/`,
  notify: (id: string) => `/accounts/${id}/notify/`,
  setCooperative: (id: string) => `/accounts/${id}/set-cooperative/`,
} as const

export const ACCOUNTS_QUERY_KEY = 'accounts'
