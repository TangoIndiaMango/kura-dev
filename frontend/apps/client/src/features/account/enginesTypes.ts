export type EngineStatus =
  | 'STORED'
  | 'RELEASE_REQUESTED'
  | 'RELEASED'
  | 'DISPOSED'

export type EngineMediaItem = {
  id: string
  url: string | null
  label: string
}

export type EngineListApi = {
  id: string
  tag: string
  make: string
  model: string
  hp: string
  condition_grade: string
  status: EngineStatus
  account_id: string
  storage_hub_code: string | null
  storage_hub_name: string | null
  vehicle_id: string | null
  vehicle_reg: string
  retrofit_id: string | null
  retrofit_status: string | null
  eboarder_serial?: string
  released_at: string | null
  created_at: string
}

export type EngineDetailApi = EngineListApi & {
  storage_hub_id: string | null
  intake_photos: string[]
  intake_media?: EngineMediaItem[]
  intake_signature: string
  intake_signature_media?: EngineMediaItem | null
  release_photos: string[]
  release_media?: EngineMediaItem[]
  raw: Record<string, unknown>
  updated_at: string
}

export type EngineReleaseRequestPayload = {
  note?: string
}

export function engineStatusLabel(status: EngineStatus | string): string {
  if (status === 'STORED') return 'In custody'
  if (status === 'RELEASE_REQUESTED') return 'Return requested'
  if (status === 'RELEASED') return 'Released'
  if (status === 'DISPOSED') return 'Disposed'
  return status.replace(/_/g, ' ')
}

export function engineTitle(row: Pick<EngineListApi, 'make' | 'model' | 'hp'>): string {
  const hp = row.hp ? `${row.hp}HP` : ''
  return [row.make, row.model || hp].filter(Boolean).join(' ').trim() || 'Petrol engine'
}

export function formatStoredSince(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export function releaseCaseCode(raw: Record<string, unknown> | undefined): string | null {
  const code = raw?.release_case_code
  return typeof code === 'string' && code.trim() ? code : null
}

export function firstMediaUrl(
  items: EngineMediaItem[] | undefined,
  fallbackIds?: string[],
): string | null {
  const fromItems = items?.find((m) => m.url)?.url
  if (fromItems) return fromItems
  const id = fallbackIds?.[0]
  return typeof id === 'string' && id.startsWith('http') ? id : null
}
