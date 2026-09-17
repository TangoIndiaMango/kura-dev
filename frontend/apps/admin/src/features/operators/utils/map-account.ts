import {
  accountStatusLabel,
  kycStatusLabel,
  type OperatorRecord,
} from '../types'

export type AccountCrmList = {
  id: string
  kura_id: string
  kind: string
  display_name: string
  status: string
  kyc_status: string
  psp?: string
  registration_channel?: string
  phone?: string | null
  email?: string | null
  photo_url?: string | null
  id_type?: string | null
  id_last4?: string | null
  kyc_document_status?: string | null
  verified_via?: 'PSP' | 'PROVIDER' | 'MANUAL' | null
  cooperative_id?: string | null
  cooperative_name?: string | null
  primary_vehicle_reg?: string | null
  vehicle_count?: number
  active_plan_name?: string | null
  wallet_available_kobo?: number | null
  created_at?: string
}

export type AccountCrmDetail = AccountCrmList & {
  owner_user_id: string
  driver_ids: string[]
  wallet_id?: string | null
  vehicle_ids?: string[]
}

export type PageNumberPaginated<T> = {
  count: number
  page_size: number
  current_page: number
  total_pages: number
  next: string | null
  previous: string | null
  results: T[]
}

export type CursorPaginated<T> = {
  results: T[]
  next: string | null
  previous: string | null
}

export type KycPayload = {
  status: string
  account_status?: string
  id_type?: string | null
  id_last4?: string | null
  document_status?: string | null
  verified_via?: string | null
  reject_reason?: string | null
  request_note?: string | null
  photos_requested?: boolean
  photo_url?: string | null
  id_front_url?: string | null
  id_back_url?: string | null
  virtual_account_status?: string | null
  virtual_account_nuban?: string | null
  next_action?: string
}

/** Map CRM account JSON → OperatorRecord (Accounts-owned scalars + related IDs). */
export function mapAccountToOperatorRecord(
  row: AccountCrmList | AccountCrmDetail,
): OperatorRecord {
  const detail = row as AccountCrmDetail
  return {
    id: row.id,
    kuraId: row.kura_id,
    name: row.display_name || 'Operator',
    phone: row.phone || '—',
    email: row.email || '',
    kind: row.kind || '—',
    status: row.status,
    kycStatus: row.kyc_status,
    registrationChannel: row.registration_channel || '—',
    photoUrl: row.photo_url || undefined,
    idType: row.id_type ?? null,
    idLast4: row.id_last4 ?? null,
    kycDocumentStatus: row.kyc_document_status ?? null,
    verifiedVia: row.verified_via ?? null,
    registeredDate: row.created_at
      ? new Date(row.created_at).toLocaleDateString('en-GB', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        })
      : '—',
    createdAt: row.created_at,
    vehicleReg: row.primary_vehicle_reg ?? null,
    vehicleCount:
      typeof row.vehicle_count === 'number'
        ? row.vehicle_count
        : row.primary_vehicle_reg
          ? 1
          : 0,
    planName: row.active_plan_name || '—',
    walletAvailableKobo:
      typeof row.wallet_available_kobo === 'number'
        ? row.wallet_available_kobo
        : null,
    ownerUserId: detail.owner_user_id,
    driverIds: detail.driver_ids,
    walletId: detail.wallet_id,
    vehicleIds: detail.vehicle_ids,
    cooperativeId: row.cooperative_id ?? null,
    cooperativeName: row.cooperative_name ?? null,
  }
}

export { accountStatusLabel, kycStatusLabel }
