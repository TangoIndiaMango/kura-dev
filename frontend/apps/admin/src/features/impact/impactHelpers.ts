import { formatNaira } from '@shared/utils/currency'
import type { ImpactStoryStatus } from './types'

export function impactStoryTone(status: ImpactStoryStatus | string) {
  if (status === 'PUBLISHED') return 'success' as const
  if (status === 'DRAFT') return 'warning' as const
  return 'neutral' as const
}

export function formatCo2Tons(co2Kg: string | number): string {
  const kg = typeof co2Kg === 'string' ? Number(co2Kg) : co2Kg
  if (!Number.isFinite(kg)) return '—'
  const tons = kg / 1000
  if (tons >= 10) return `${tons.toFixed(0)} t`
  return `${tons.toFixed(1)} t`
}

export function formatImpactFuel(kobo: number): string {
  return formatNaira(kobo, { fromKobo: true })
}

export function formatPublishedAt(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}
