export const FINANCE_ENDPOINTS = {
  wallets: '/finance/wallets/',
  wallet: (id: string) => `/finance/wallets/${id}/`,
  payments: '/finance/payments/',
  payment: (id: string) => `/finance/payments/${id}/`,
} as const

export const financeQueryKeys = {
  all: ['finance'] as const,
  wallets: () => [...financeQueryKeys.all, 'wallets'] as const,
  wallet: (id: string) => [...financeQueryKeys.wallets(), id] as const,
  walletsByAccount: (accountId: string) =>
    [...financeQueryKeys.wallets(), 'account', accountId] as const,
  payments: () => [...financeQueryKeys.all, 'payments'] as const,
  payment: (id: string) => [...financeQueryKeys.payments(), id] as const,
  paymentsByAccount: (accountId: string) =>
    [...financeQueryKeys.payments(), 'account', accountId] as const,
}
