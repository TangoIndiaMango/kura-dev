import { useState } from 'react'
import { axiosInstance } from '@lib/api/client'
import { uploadMedia } from '@lib/api/media'
import { apiErrorMessage } from '@lib/api/auth'
import { ACCOUNTS_ENDPOINTS } from '../constants/operators-api.constants'
import {
  useRegisterOperator,
  type RegisterOperatorPayload,
} from './use-operators'

export type RegistrationPhotos = {
  face: File
  front: File
  back: File
}

/** Register operator, then upload ID/face photos and submit KYC on their behalf. */
export function useOperatorRegistration() {
  const registerOperator = useRegisterOperator()
  const [submittingPhotos, setSubmittingPhotos] = useState(false)

  async function registerWithIdentity(
    payload: RegisterOperatorPayload,
    photos: RegistrationPhotos,
    consent: { service: boolean; dataSharing: boolean },
  ): Promise<{ kuraId: string; kycSubmitted: boolean; kycError: string | null }> {
    const created = await registerOperator.mutateAsync(payload)
    let kycSubmitted = false
    let kycError: string | null = null
    setSubmittingPhotos(true)
    try {
      const [face, front, back] = await Promise.all([
        uploadMedia(photos.face, 'face'),
        uploadMedia(photos.front, 'identity'),
        uploadMedia(photos.back, 'identity'),
      ])
      await axiosInstance.post(ACCOUNTS_ENDPOINTS.submitKyc(created.id), {
        display_name: payload.full_name,
        id_type: payload.id_type || 'NIN',
        id_number: payload.id_number || '',
        face_asset_id: face.id,
        id_front_asset_id: front.id,
        id_back_asset_id: back.id,
        consent_service: consent.service,
        consent_data_sharing: consent.dataSharing,
        channel: 'HUB',
      })
      kycSubmitted = true
    } catch (err) {
      kycSubmitted = false
      kycError = apiErrorMessage(err, 'ID submission failed')
    } finally {
      setSubmittingPhotos(false)
    }
    return { kuraId: created.kura_id || '', kycSubmitted, kycError }
  }

  return {
    registerWithIdentity,
    busy: registerOperator.isPending || submittingPhotos,
    submittingPhotos,
  }
}
