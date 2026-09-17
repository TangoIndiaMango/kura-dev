import type { OperatorSession } from '../../../shared/session/operatorTypes'
import type { MePayload } from '../../../lib/api/auth'
import type { KycPayload } from '../../../lib/api/accounts'

export type LiveKyc = MePayload['kyc'] | KycPayload | null | undefined

export const ID_OPTIONS = [
  { value: 'NIN', label: 'NIN' },
  { value: 'BVN', label: 'BVN' },
  { value: 'VOTER', label: 'Voter ID' },
  { value: 'DRIVERS_LICENCE', label: "Driver's licence" },
]

export const ID_DIGIT_LEN: Record<string, number> = {
  NIN: 11,
  BVN: 11,
  VOTER: 10,
  DRIVERS_LICENCE: 10,
}

export function mergeKycIntoSession(
  base: OperatorSession,
  kyc: LiveKyc,
): OperatorSession {
  if (!kyc) return base
  const status = (kyc.status || base.kycStatus) as OperatorSession['kycStatus']
  const next = kyc.next_action
  const mapped: OperatorSession['kycStatus'] =
    next === 'wait_for_review'
      ? 'PENDING'
      : next === 'upload_photos'
        ? status === 'VERIFIED'
          ? 'VERIFIED'
          : 'PENDING'
        : next === 'resubmit' || status === 'REJECTED'
          ? 'REJECTED'
          : status === 'VERIFIED'
            ? 'VERIFIED'
            : status === 'PROVISIONAL'
              ? 'PROVISIONAL'
              : status === 'PENDING'
                ? 'PENDING'
                : base.kycStatus

  const frontUrl =
    'id_front_url' in kyc ? (kyc.id_front_url ?? null) : base.idFrontUrl
  const backUrl =
    'id_back_url' in kyc ? (kyc.id_back_url ?? null) : base.idBackUrl

  return {
    ...base,
    kycStatus: mapped,
    idType: (kyc.id_type as OperatorSession['idType']) ?? base.idType,
    idLast4: kyc.id_last4 ?? base.idLast4,
    idFrontAttached: Boolean(
      kyc.id_front_asset_id || frontUrl || base.idFrontAttached,
    ),
    idBackAttached: Boolean(
      kyc.id_back_asset_id || backUrl || base.idBackAttached,
    ),
    idFrontUrl: frontUrl ?? base.idFrontUrl,
    idBackUrl: backUrl ?? base.idBackUrl,
    profilePhotoUrl: kyc.photo_url ?? base.profilePhotoUrl,
    kycPhotosRequested:
      next === 'upload_photos' || Boolean(kyc.photos_requested),
    kycRequestNote: kyc.request_note ?? base.kycRequestNote,
    verifiedLabel:
      mapped === 'PENDING'
        ? 'ID pending review'
        : mapped === 'VERIFIED' && kyc.id_type && kyc.id_last4
          ? `${kyc.id_type} verified`
          : base.verifiedLabel,
  }
}

/** One Identity editor for first submit, reject, ops photo fix, and manual edit. */
export function identityRoute(view: OperatorSession, next?: string | null) {
  const photosRequested = next === 'upload_photos' || view.kycPhotosRequested
  const hasSubmission = Boolean(
    view.idType ||
      view.idLast4 ||
      view.idFrontAttached ||
      next === 'wait_for_review',
  )
  const waitingQuiet =
    (next === 'wait_for_review' || view.kycStatus === 'PENDING') &&
    !photosRequested &&
    hasSubmission
  const needsForm =
    view.kycStatus === 'NONE' ||
    view.kycStatus === 'REJECTED' ||
    photosRequested ||
    (view.kycStatus === 'PENDING' &&
      !hasSubmission &&
      next !== 'wait_for_review')
  return { photosRequested, hasSubmission, waitingQuiet, needsForm }
}
