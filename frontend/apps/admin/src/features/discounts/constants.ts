export const DISCOUNTS_ENDPOINTS = {
  list: '/mobility/discounts/',
  discount: (id: string) => `/mobility/discounts/${id}/`,
  activate: (id: string) => `/mobility/discounts/${id}/activate/`,
  redeem: '/mobility/discounts/redeem/',
  redemptions: (id: string) => `/mobility/discounts/${id}/redemptions/`,
} as const

export const PLAN_OPTION_CHOICES = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'pps', label: 'Pay-per-swap' },
] as const

export const PERIOD_CHOICES = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'swap', label: 'Pay-per-swap' },
] as const

export const CHANNEL_CHOICES = [
  { value: 'App', label: 'App' },
  { value: 'USSD', label: 'USSD' },
  { value: 'Hub', label: 'Hub' },
] as const

const CHANNEL_SET = new Set<string>(CHANNEL_CHOICES.map((c) => c.value))

/** Parse API display string (`App · USSD · Hub`) into MultiSelect values. */
export function parseChannels(raw: string | null | undefined): string[] {
  if (!raw?.trim()) return CHANNEL_CHOICES.map((c) => c.value)
  return raw
    .split(/[·,|/]/)
    .map((p) => p.trim())
    .filter((p) => CHANNEL_SET.has(p))
}

/** Join MultiSelect values into API display string. */
export function formatChannels(selected: string[]): string {
  const ordered = CHANNEL_CHOICES.map((c) => c.value).filter((v) =>
    selected.includes(v),
  )
  return ordered.length ? ordered.join(' · ') : 'App · USSD · Hub'
}
