export type PageNumberPaginated<T> = {
  count: number
  page_size: number
  current_page: number
  total_pages: number
  next: string | null
  previous: string | null
  results: T[]
}

export type SegmentStatus = 'DRAFT' | 'ACTIVE'

export type SegmentCriteria = {
  status?: string
  kyc_status?: string
  kind?: string
  cooperative_id?: string
  min_active_days?: number
  max_active_days?: number
  min_score?: number
  segment_id?: string
}

export type SegmentListApi = {
  id: string
  name: string
  status: SegmentStatus | string
  criteria_summary: string
  last_count: number
  updated_at: string
  created_at: string
}

export type SegmentDetailApi = SegmentListApi & {
  criteria: SegmentCriteria
  last_evaluated_at: string | null
}

export type SegmentWritePayload = {
  name: string
  criteria: SegmentCriteria
  status?: SegmentStatus
}

export type SegmentPatchPayload = {
  name?: string
  criteria?: SegmentCriteria
  status?: SegmentStatus
}

export type SegmentPreviewApi = {
  count: number
  sample_account_ids: string[]
  sample: SegmentMemberApi[]
  summary: string
  allowed_keys: string[]
}

export type SegmentMemberApi = {
  id: string
  kura_id: string
  display_name: string
  phone: string | null
  status: string
  kyc_status: string
}
