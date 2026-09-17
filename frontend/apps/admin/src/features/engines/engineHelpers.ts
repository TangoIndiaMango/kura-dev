import type {
  EngineSafetyChecks,
  EngineStatus,
  RetrofitStatus,
  SafetyCheckId,
} from './types'

export const SAFETY_CHECK_IDS: SafetyCheckId[] = [
  'hull',
  'mount',
  'throttle',
  'kill',
  'cable',
  'float',
]

export function emptySafetyChecks(): EngineSafetyChecks {
  return {
    hull: false,
    mount: false,
    throttle: false,
    kill: false,
    cable: false,
    float: false,
  }
}

export function mergeSafetyChecks(
  partial?: Partial<EngineSafetyChecks> | null,
): EngineSafetyChecks {
  return { ...emptySafetyChecks(), ...(partial ?? {}) }
}

export function allSafetyPassed(checks: EngineSafetyChecks): boolean {
  return SAFETY_CHECK_IDS.every((k) => Boolean(checks[k]))
}

export function engineStatusLabel(status: EngineStatus | string): string {
  return status.replace(/_/g, ' ')
}

export function engineStatusTone(
  status: EngineStatus | string,
): 'success' | 'warning' | 'danger' | 'neutral' | 'info' {
  if (status === 'STORED') return 'success'
  if (status === 'RELEASE_REQUESTED') return 'warning'
  if (status === 'DISPOSED') return 'danger'
  if (status === 'RELEASED') return 'neutral'
  return 'info'
}

export function retrofitProgramLabel(
  retrofitStatus: RetrofitStatus | null | undefined,
): string {
  if (!retrofitStatus) return 'Stored engine'
  if (retrofitStatus === 'ACTIVATED') return 'E-Boarder'
  if (retrofitStatus === 'FAILED') return 'Retrofit (failed)'
  return 'Retrofit'
}

/** Single-column stage for the unified engines list (job + custody). */
export function retrofitStageLabel(args: {
  kind: 'job' | 'engine'
  engineStatus?: EngineStatus | string | null
  retrofitStatus?: RetrofitStatus | null
}): string {
  if (args.kind === 'job') return 'Awaiting intake'
  const st = args.engineStatus
  if (st === 'RELEASE_REQUESTED') return 'Release requested'
  if (st === 'RELEASED') return 'Released'
  if (st === 'DISPOSED') return 'Disposed'
  const rs = args.retrofitStatus
  if (!rs) return 'Stored'
  if (rs === 'INTAKE') return 'Needs install'
  if (rs === 'INSTALLED') return 'Needs checklist'
  if (rs === 'CHECKED') return 'Ready to activate'
  if (rs === 'ACTIVATED') return 'Activated'
  if (rs === 'FAILED') return 'Failed'
  return String(rs)
}

export function retrofitStageTone(
  label: string,
): 'success' | 'warning' | 'danger' | 'neutral' | 'info' {
  if (label === 'Activated' || label === 'Stored') return 'success'
  if (
    label === 'Awaiting intake' ||
    label === 'Needs install' ||
    label === 'Needs checklist' ||
    label === 'Ready to activate' ||
    label === 'Release requested'
  ) {
    return 'warning'
  }
  if (label === 'Failed' || label === 'Disposed') return 'danger'
  return 'neutral'
}

export function formatEngineSince(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export function petrolLabel(make: string, model: string, hp: string): string {
  return [make, model || (hp ? `${hp}HP` : '')].filter(Boolean).join(' ').trim()
}

export function daysInCustody(iso: string | null | undefined): number {
  if (!iso) return 0
  const parsed = Date.parse(iso)
  if (Number.isNaN(parsed)) return 0
  return Math.max(0, Math.round((Date.now() - parsed) / 86_400_000))
}
