export interface RiskRuleMeta {
  code: string
  name: string
  domain: string
  description: string
  subject: string
  defaultAction: 'FLAG' | 'BLOCK' | 'SUSPEND' | 'RESTRICT' | 'FREEZE' | 'STEP_UP'
}

export const RISK_RULES_CATALOG: Record<string, RiskRuleMeta> = {
  BATTERY_MISMATCH: {
    code: 'BATTERY_MISMATCH',
    name: 'Returned battery mismatch',
    domain: 'Swaps & Assets',
    subject: 'Driver / Vehicle',
    description:
      'Fires when an operator returns a battery pack serial that does not match the pack mounted to their vehicle.',
    defaultAction: 'FLAG',
  },
  SWAP_VELOCITY: {
    code: 'SWAP_VELOCITY',
    name: 'Swap velocity exceeded',
    domain: 'Mobility Swaps',
    subject: 'Vehicle / Driver',
    description:
      'Enforces daily swap quotas and minimum wait intervals between swaps to prevent unmetered pack hoarding.',
    defaultAction: 'BLOCK',
  },
  GEO_IMPOSSIBLE: {
    code: 'GEO_IMPOSSIBLE',
    name: 'Geo-impossible travel',
    domain: 'GPS & Telemetry',
    subject: 'Vehicle',
    description:
      'Flags impossible travel speed between consecutive swap hubs or GPS pings.',
    defaultAction: 'FLAG',
  },
  OVERRIDE_CASH_CORR: {
    code: 'OVERRIDE_CASH_CORR',
    name: 'Override vs cash variance',
    domain: 'Hub Operations',
    subject: 'Hub Agent / Shift',
    description:
      'Audits shifts where high manual override volume correlates with cash drawer shortage upon shift closure.',
    defaultAction: 'FLAG',
  },
  NEW_DEVICE: {
    code: 'NEW_DEVICE',
    name: 'New trusted device',
    domain: 'Auth & Identity',
    subject: 'User Account',
    description:
      'Requires step-up authentication when an account logs in from an unrecognized device signature.',
    defaultAction: 'STEP_UP',
  },
  PHONE_CHANGE: {
    code: 'PHONE_CHANGE',
    name: 'Phone change',
    domain: 'Profile & Security',
    subject: 'User Account',
    description:
      'Freezes wallet withdrawals and outward transfers temporarily after a primary phone number update.',
    defaultAction: 'FREEZE',
  },
  PIN_BRUTE: {
    code: 'PIN_BRUTE',
    name: 'PIN brute force',
    domain: 'Wallet Security',
    subject: 'User Account',
    description:
      'Enforces cooldown lockout and step-up verification upon repeated incorrect wallet PIN entries.',
    defaultAction: 'STEP_UP',
  },
  AGENT_REG_VELOCITY: {
    code: 'AGENT_REG_VELOCITY',
    name: 'Agent registration velocity',
    domain: 'Field Onboarding',
    subject: 'Hub Agent',
    description:
      'Flags abnormal high-velocity bursts of driver registrations submitted by a single field agent.',
    defaultAction: 'FLAG',
  },
  NOSHOW_RATE: {
    code: 'NOSHOW_RATE',
    name: 'No-show rate',
    domain: 'Reservations',
    subject: 'Driver Account',
    description:
      'Monitors frequent battery reservations that expire without collection, preventing station slot hogging.',
    defaultAction: 'FLAG',
  },
  FUNDING_ANOMALY: {
    code: 'FUNDING_ANOMALY',
    name: 'Funding anomaly',
    domain: 'Payments & Wallet',
    subject: 'Wallet Account',
    description:
      'Flags irregular wallet deposit velocity, structured top-ups, or unverified payment sources.',
    defaultAction: 'FLAG',
  },
  CHARGEBACK: {
    code: 'CHARGEBACK',
    name: 'Chargeback after spend',
    domain: 'PSP Payments',
    subject: 'Driver Account',
    description:
      'Immediately restricts an account upon payment dispute or chargeback filed after energy was dispensed.',
    defaultAction: 'RESTRICT',
  },
  CREDIT_BUSTOUT: {
    code: 'CREDIT_BUSTOUT',
    name: 'Credit bust-out pattern',
    domain: 'Financing & Loans',
    subject: 'Credit Account',
    description:
      'Flags rapid, aggressive drawdown of vehicle or battery financing credit limits with zero repayment history.',
    defaultAction: 'RESTRICT',
  },
  DUPLICATE_IDENTITY: {
    code: 'DUPLICATE_IDENTITY',
    name: 'Duplicate identity',
    domain: 'KYC & Compliance',
    subject: 'Driver Profile',
    description:
      'Blocks account registration when identity documents, BVN, or phone number collide with an existing driver.',
    defaultAction: 'BLOCK',
  },
  UNRETURNED_48H: {
    code: 'UNRETURNED_48H',
    name: 'Battery unreturned 48h',
    domain: 'Asset Protection',
    subject: 'Battery & Driver',
    description:
      'Suspends driver account when a checked-out battery pack has not returned to any hub within 48 hours.',
    defaultAction: 'SUSPEND',
  },
  MANUAL_FLAG: {
    code: 'MANUAL_FLAG',
    name: 'Manual ops flag',
    domain: 'Operations & Audit',
    subject: 'Any Account',
    description:
      'Ad-hoc case opened directly by station supervisor or risk analyst from the CRM dashboard.',
    defaultAction: 'FLAG',
  },
}

export function getRiskRuleMeta(code: string): RiskRuleMeta {
  return (
    RISK_RULES_CATALOG[code] ?? {
      code,
      name: code.replace(/_/g, ' '),
      domain: 'General Compliance',
      subject: 'Account / System',
      description: 'System-evaluated fraud and compliance risk rule.',
      defaultAction: 'FLAG',
    }
  )
}

export function riskActionLabel(action: string): string {
  switch (action) {
    case 'BLOCK':
      return 'Block action'
    case 'FLAG':
      return 'Flag for review'
    case 'SUSPEND':
      return 'Suspend account'
    case 'RESTRICT':
      return 'Restrict account'
    case 'FREEZE':
      return 'Freeze wallet'
    case 'STEP_UP':
      return 'Step-up auth'
    default:
      return action
  }
}

export function riskActionTone(
  action: string,
): 'danger' | 'warning' | 'info' | 'success' | 'default' {
  switch (action) {
    case 'BLOCK':
    case 'SUSPEND':
    case 'RESTRICT':
      return 'danger'
    case 'FREEZE':
    case 'STEP_UP':
      return 'warning'
    case 'FLAG':
      return 'info'
    default:
      return 'default'
  }
}

export function formatRuleParams(params?: Record<string, unknown>): string {
  if (!params || Object.keys(params).length === 0) return 'None'
  return Object.entries(params)
    .map(([k, v]) => `${k.replace(/_/g, ' ')}: ${v}`)
    .join(' · ')
}
