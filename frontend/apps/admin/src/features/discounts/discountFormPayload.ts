import type {
  DiscountAudience,
  DiscountValueType,
  DiscountWritePayload,
} from './types'
import { formatChannels } from './constants'

export function localTodayYmd(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function toDateInput(iso: string | null | undefined) {
  if (!iso) return ''
  try {
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return ''
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
  } catch {
    return ''
  }
}

export function fromDateInput(value: string): string | null {
  if (!value.trim()) return null
  const d = new Date(`${value.trim()}T00:00:00`)
  if (Number.isNaN(d.getTime())) return null
  return d.toISOString()
}

type BuildArgs = {
  isEdit: boolean
  name: string
  code: string
  valueType: DiscountValueType
  percent: number | string
  amountNaira: number | string
  periods: string[]
  allPlans: boolean
  planOptions: string[]
  audience: DiscountAudience
  segmentId: string | null
  fleetMin: number | string
  channels: string[]
  summary: string
  starts: string
  ends: string
}

export function buildDiscountWritePayload(
  args: BuildArgs,
): { ok: true; payload: DiscountWritePayload } | { ok: false; message: string } {
  const trimmedName = args.name.trim()
  const trimmedCode = args.code.trim().toUpperCase()
  if (!trimmedName || !trimmedCode) {
    return { ok: false, message: 'Name and code are required.' }
  }
  if (!args.periods.length) {
    return { ok: false, message: 'Select at least one period.' }
  }
  let value = 0
  if (args.valueType === 'PERCENT') {
    value = Math.floor(Number(args.percent))
    if (!Number.isFinite(value) || value < 1 || value > 100) {
      return { ok: false, message: 'Percentage must be 1–100.' }
    }
  } else {
    const naira = Number(args.amountNaira)
    if (!Number.isFinite(naira) || naira <= 0) {
      return { ok: false, message: 'Enter a valid amount.' }
    }
    value = Math.round(naira * 100)
  }
  if (args.audience === 'SEGMENT' && !args.segmentId) {
    return { ok: false, message: 'Pick a segment.' }
  }
  if (!args.channels.length) {
    return { ok: false, message: 'Select at least one channel.' }
  }

  const today = localTodayYmd()
  if (args.starts && args.starts < today) {
    return { ok: false, message: 'Start date cannot be before today.' }
  }
  if (args.ends && args.ends < today) {
    return { ok: false, message: 'End date cannot be before today.' }
  }
  if (args.starts && args.ends && args.ends < args.starts) {
    return { ok: false, message: 'End date must be on or after the start date.' }
  }

  return {
    ok: true,
    payload: {
      name: trimmedName,
      code: trimmedCode,
      value_type: args.valueType,
      value,
      status: args.isEdit ? undefined : 'DRAFT',
      applies_to_all_plans: args.allPlans,
      plan_option_ids: args.allPlans ? [] : args.planOptions,
      periods: args.periods,
      audience: args.audience,
      fleet_min_vehicles:
        args.audience === 'FLEET'
          ? Math.max(2, Math.floor(Number(args.fleetMin) || 2))
          : null,
      segment_id: args.audience === 'SEGMENT' ? args.segmentId || '' : '',
      channels: formatChannels(args.channels),
      summary: args.summary.trim(),
      starts_at: fromDateInput(args.starts),
      ends_at: fromDateInput(args.ends),
    },
  }
}

