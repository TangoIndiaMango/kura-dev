import { axiosInstance } from './client'

export type IdentitySubmitPayload = {
  display_name: string
  id_type: 'NIN' | 'BVN' | 'VOTER' | 'DRIVERS_LICENCE' | 'PASSPORT'
  /** Empty string keeps the number already on file for this ID type. */
  id_number: string
  face_asset_id: string
  id_front_asset_id: string
  id_back_asset_id: string
  /** Required unless SERVICE consent is already on file (me.consent). */
  consent_service?: boolean
  consent_data_sharing?: boolean
  channel?: 'WEB' | 'APP'
}

export type KycPayload = {
  status: string
  account_status: string
  id_type?: string | null
  id_last4?: string | null
  document_status?: string | null
  reject_reason?: string | null
  request_note?: string | null
  photos_requested?: boolean
  face_asset_id?: string | null
  photo_url?: string | null
  id_front_asset_id?: string | null
  id_back_asset_id?: string | null
  id_front_url?: string | null
  id_back_url?: string | null
  next_action?: string
}

export async function submitIdentity(payload: IdentitySubmitPayload) {
  const { data } = await axiosInstance.post<KycPayload>(
    '/accounts/identity/',
    payload,
    { silentError: true },
  )
  return data
}

export async function withdrawIdentity() {
  const { data } = await axiosInstance.post<KycPayload>(
    '/accounts/identity/withdraw/',
    {},
    { silentError: true },
  )
  return data
}
