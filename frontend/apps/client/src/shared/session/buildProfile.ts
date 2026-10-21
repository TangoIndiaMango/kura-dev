import type { MePayload } from '@lib/api/auth'
import {
  DEFAULT_OPERATOR_SETTINGS,
  initialsFromName,
  type OperatorAccountSettings,
  type OperatorProfile,
} from './operatorTypes'

type PrefsSlice = {
  settings: OperatorAccountSettings
  email: string | null
  emailVerified: boolean
}

function mapKycStatus(
  me: MePayload,
): OperatorProfile['kycStatus'] {
  const next = me.kyc?.next_action
  const raw = me.kyc?.status || me.account?.kyc_status
  if (!raw) return 'NONE'

  if (next === 'wait_for_review') return 'PENDING'
  if (next === 'upload_photos') {
    return raw === 'VERIFIED' ? 'VERIFIED' : 'PENDING'
  }
  if (next === 'resubmit' || raw === 'REJECTED') return 'REJECTED'
  if (raw === 'VERIFIED') return 'VERIFIED'
  if (raw === 'PROVISIONAL') return 'PROVISIONAL'

  const hasSubmission = Boolean(me.kyc?.id_type || me.kyc?.id_last4)
  if (raw === 'PENDING' || raw === 'PENDING_PSP') {
    if (next === 'submit' || !hasSubmission) return 'NONE'
    return 'PENDING'
  }
  if (['NONE', 'PROVISIONAL', 'PENDING', 'VERIFIED', 'REJECTED'].includes(raw)) {
    return raw as OperatorProfile['kycStatus']
  }
  return 'NONE'
}

function verifiedLabel(me: MePayload, kycStatus: OperatorProfile['kycStatus']) {
  if (me.kyc?.status === 'VERIFIED') {
    return me.kyc.id_type && me.kyc.id_last4
      ? `${me.kyc.id_type} verified`
      : 'ID verified'
  }
  if (me.kyc?.status === 'REJECTED') {
    return me.kyc.reject_reason || 'ID rejected — resubmit'
  }
  if (
    (me.kyc?.status === 'PENDING' || me.account?.kyc_status === 'PENDING') &&
    (me.kyc?.id_type || me.kyc?.id_last4)
  ) {
    return 'ID pending review'
  }
  if (kycStatus === 'NONE') return 'Not verified yet'
  return 'Not verified yet'
}

/** Profile from `/auth/me/` + local prefs. No wallet/vehicles/plans. */
export function buildProfile(
  me: MePayload | null,
  prefs: PrefsSlice,
): OperatorProfile | null {
  if (!me) return null
  const displayName =
    me.account?.display_name?.trim() ||
    [me.user.first_name, me.user.last_name].filter(Boolean).join(' ').trim() ||
    'Rider'
  const phone = (me.user.phone || '').replace(/^\+?234/, '').trim()
  const kycStatus = mapKycStatus(me)
  const photo = me.photo_url || me.kyc?.photo_url || null
  const frontUrl = me.kyc?.id_front_url ?? null
  const backUrl = me.kyc?.id_back_url ?? null
  return {
    phone,
    name: displayName,
    initials: initialsFromName(displayName),
    kuraId: me.account?.kura_id || '—',
    verifiedLabel: verifiedLabel(me, kycStatus),
    kycStatus,
    accountStatus: me.account?.status ?? 'ACTIVE',
    kycVia: null,
    idType: (me.kyc?.id_type as OperatorProfile['idType']) ?? null,
    idLast4: me.kyc?.id_last4 ?? null,
    idFrontAttached: Boolean(me.kyc?.id_front_asset_id || frontUrl),
    idBackAttached: Boolean(me.kyc?.id_back_asset_id || backUrl),
    idFrontUrl: frontUrl,
    idBackUrl: backUrl,
    profilePhotoUrl: photo,
    kycPhotosRequested: me.kyc?.next_action === 'upload_photos',
    kycRequestNote: me.kyc?.request_note ?? null,
    hasPin: me.has_pin,
    email: prefs.email ?? me.user.email ?? null,
    emailVerified: prefs.emailVerified || Boolean(me.user.email),
    settings: prefs.settings ?? DEFAULT_OPERATOR_SETTINGS,
  }
}
