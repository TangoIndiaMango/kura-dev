const LABELS: Record<string, string> = {
  status: 'Account status',
  kyc_status: 'KYC',
  kind: 'Account kind',
  cooperative_id: 'Cooperative',
  min_active_days: 'Min tenure',
  max_active_days: 'Max tenure',
  min_score: 'Min credit score',
  segment_id: 'Linked segment',
}

const VALUES: Record<string, Record<string, string>> = {
  status: {
    ACTIVE: 'Active',
    SUSPENDED: 'Suspended',
    PENDING: 'Pending',
    DEREGISTERED: 'Deregistered',
  },
  kyc_status: {
    VERIFIED: 'Verified',
    PENDING: 'Pending',
    PROVISIONAL: 'Provisional',
    NONE: 'None',
    REJECTED: 'Rejected',
  },
  kind: {
    INDIVIDUAL: 'Individual',
    FLEET: 'Fleet',
  },
}

export function formatCriterionLabel(key: string) {
  return LABELS[key] ?? key.replace(/_/g, ' ')
}

export function formatCriterionValue(key: string, value: unknown) {
  if (key === 'min_active_days' || key === 'max_active_days') {
    return `${value} days`
  }
  if (key === 'min_score') {
    return String(value)
  }
  const mapped = VALUES[key]?.[String(value)]
  return mapped ?? String(value)
}
