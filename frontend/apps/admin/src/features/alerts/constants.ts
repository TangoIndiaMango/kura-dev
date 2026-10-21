export const ALERTS_ENDPOINTS = {
  list: '/operations/alerts/',
  alert: (id: string) => `/operations/alerts/${id}/`,
  stats: '/operations/alerts/stats/',
  export: '/operations/alerts/export/',
  ack: (id: string) => `/operations/alerts/${id}/ack/`,
  resolve: (id: string) => `/operations/alerts/${id}/resolve/`,
  escalate: (id: string) => `/operations/alerts/${id}/escalate/`,
  rules: '/operations/alert-rules/',
  rule: (id: string) => `/operations/alert-rules/${id}/`,
} as const

export const ALERT_RULE_KINDS = [
  { value: 'BATTERY_MISMATCH', label: 'Battery serial mismatch' },
  { value: 'LOW_INVENTORY', label: 'Low ready batteries' },
  { value: 'SOLAR_FAULT', label: 'Solar / grid power' },
  { value: 'CASH_LIMIT', label: 'Agent cash limit' },
  { value: 'HUB_OFFLINE', label: 'Hub offline' },
  { value: 'PAYMENT_FAILURE', label: 'Payment failure' },
  { value: 'SHIFT_CASH_VARIANCE', label: 'Shift cash variance' },
  { value: 'SETTLEMENT_MISMATCH', label: 'Settlement mismatch' },
  { value: 'AGENT_OVERRIDE_LIMIT', label: 'Override daily limit' },
  { value: 'OTHER', label: 'Other' },
] as const

export const ALERT_RULE_CHANNELS = [
  { value: 'IN_APP', label: 'In-app' },
  { value: 'SMS', label: 'SMS' },
  { value: 'WHATSAPP', label: 'WhatsApp' },
] as const
