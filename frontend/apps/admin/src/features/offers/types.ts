export type PageNumberPaginated<T> = {
  count: number
  page_size: number
  current_page: number
  total_pages: number
  next: string | null
  previous: string | null
  results: T[]
}

export type OfferType = 'CREDIT' | 'INSURANCE' | 'FINANCING'
export type OfferStatus = 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'ENDED'

export type OfferListApi = {
  id: string
  name: string
  offer_type: OfferType | string
  summary: string
  status: OfferStatus | string
  created_at: string
}

export type OfferDetailApi = OfferListApi & {
  terms: Record<string, unknown>
  segment_criteria: Record<string, unknown>
  updated_at: string
}

export type OfferWritePayload = {
  name: string
  offer_type: OfferType
  summary?: string
  terms?: Record<string, unknown>
  segment_criteria?: Record<string, unknown>
  status?: OfferStatus
}

export type OfferPatchPayload = {
  name?: string
  summary?: string
  terms?: Record<string, unknown>
  segment_criteria?: Record<string, unknown>
  status?: OfferStatus
}

export type OfferAssignPayload = {
  account_ids: string[]
  channel?: 'APP' | 'USSD'
}
