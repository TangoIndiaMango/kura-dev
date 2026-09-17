import { useEffect, useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useMediaUploadMutation } from '../../../shared/hooks/useMediaUploadMutation'
import type { OperatorSession } from '../../../shared/session/operatorTypes'
import {
  apiErrorMessage,
  AUTH_ME_QUERY_KEY,
  type MePayload,
} from '../../../lib/api/auth'
import {
  submitIdentity as submitIdentityApi,
  withdrawIdentity as withdrawIdentityApi,
} from '../../../lib/api/accounts'
import { useAuth } from '../../auth/AuthProvider'
import {
  buildIdentityUploadSlots,
  patchMeKyc,
  resolveIdentityAssetIds,
} from './verifyIdentitySubmit'
import {
  ID_DIGIT_LEN,
  identityRoute,
  mergeKycIntoSession,
  type LiveKyc,
} from './verifyIdentityLive'

export function useVerifyIdentityController(current: OperatorSession) {
  const queryClient = useQueryClient()
  const { isAuthenticated, me, refreshProfile } = useAuth()
  const mediaUpload = useMediaUploadMutation()
  const [fullName, setFullName] = useState(current.name || '')
  const [idType, setIdType] = useState<string>(current.idType ?? 'NIN')
  const [idNumber, setIdNumber] = useState('')
  const [face, setFace] = useState<File | null>(null)
  const [front, setFront] = useState<File | null>(null)
  const [back, setBack] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [withdrawing, setWithdrawing] = useState(false)
  const [forceEdit, setForceEdit] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [doneOpen, setDoneOpen] = useState(false)
  const [syncing, setSyncing] = useState(true)
  const [liveKyc, setLiveKyc] = useState<LiveKyc>(me?.kyc ?? null)

  useEffect(() => {
    setLiveKyc(me?.kyc ?? null)
  }, [me])

  useEffect(() => {
    if (current.name) setFullName(current.name)
  }, [current.name])

  useEffect(() => {
    let alive = true
    setSyncing(true)
    refreshProfile()
      .then((fresh) => {
        if (alive && fresh?.kyc) setLiveKyc(fresh.kyc)
      })
      .catch(() => undefined)
      .finally(() => {
        if (alive) setSyncing(false)
      })
    return () => {
      alive = false
    }
  }, [refreshProfile])

  const view = useMemo(
    () => mergeKycIntoSession(current, liveKyc ?? me?.kyc),
    [current, liveKyc, me?.kyc],
  )
  const next = liveKyc?.next_action ?? me?.kyc?.next_action
  const route = identityRoute(view, next)
  const kyc = liveKyc ?? me?.kyc
  const keepFaceId = kyc?.face_asset_id ?? null
  const keepFrontId = kyc?.id_front_asset_id ?? null
  const keepBackId = kyc?.id_back_asset_id ?? null
  const keepLast4 =
    view.idType === idType ? (view.idLast4 ?? kyc?.id_last4 ?? null) : null
  const busy =
    mediaUpload.isPending || submitting || mediaUpload.step === 'submitting'
  const idLen = ID_DIGIT_LEN[idType] ?? 10
  const numberOk =
    idNumber.length >= idLen || (Boolean(keepLast4) && idNumber.length === 0)
  const formReady =
    fullName.trim().length >= 2 &&
    numberOk &&
    Boolean(face || keepFaceId) &&
    Boolean(front || keepFrontId) &&
    Boolean(back || keepBackId)
  const editingPack =
    forceEdit ||
    view.kycStatus === 'REJECTED' ||
    route.photosRequested

  useEffect(() => {
    if (!route.photosRequested && view.kycStatus !== 'REJECTED') return
    if (view.idType) setIdType(view.idType)
    if (view.name) setFullName(view.name)
  }, [route.photosRequested, view.kycStatus, view.idType, view.name])

  const applyKyc = async (kycNext: NonNullable<LiveKyc>) => {
    setLiveKyc(kycNext)
    queryClient.setQueryData<MePayload>(AUTH_ME_QUERY_KEY, (old) =>
      patchMeKyc(old, kycNext) as MePayload | undefined,
    )
    const fresh = await refreshProfile()
    if (fresh?.kyc) setLiveKyc(fresh.kyc)
  }

  const beginEdit = () => {
    if (view.idType) setIdType(view.idType)
    setIdNumber('')
    setFace(null)
    setFront(null)
    setBack(null)
    if (view.name) setFullName(view.name)
    setForceEdit(true)
    setError(null)
  }

  const withdraw = () => {
    if (!isAuthenticated || withdrawing) return
    setError(null)
    setWithdrawing(true)
    withdrawIdentityApi()
      .then(async (kycNext) => {
        await applyKyc(kycNext)
        setForceEdit(true)
        setIdNumber('')
        setFace(null)
        setFront(null)
        setBack(null)
      })
      .catch((err) => {
        setError(apiErrorMessage(err, 'Could not delete submission'))
      })
      .finally(() => setWithdrawing(false))
  }

  const submit = async (onSubmit: () => void | Promise<void>) => {
    setError(null)
    try {
      if (isAuthenticated) {
        const slots = buildIdentityUploadSlots({ face, front, back })
        const uploaded = slots.length > 0 ? await mediaUpload.mutateAsync(slots) : {}
        const ids = resolveIdentityAssetIds({
          face,
          front,
          back,
          uploaded,
          keepFaceId,
          keepFrontId,
          keepBackId,
        })
        if (!ids) {
          setError('Face and both ID card photos are required.')
          return
        }
        mediaUpload.setStep('submitting')
        setSubmitting(true)
        const kycNext = await submitIdentityApi({
          display_name: fullName.trim(),
          id_type: idType as 'NIN' | 'BVN' | 'VOTER' | 'DRIVERS_LICENCE',
          id_number: idNumber,
          face_asset_id: ids.faceId,
          id_front_asset_id: ids.frontId,
          id_back_asset_id: ids.backId,
        })
        await applyKyc(kycNext)
        setForceEdit(false)
      } else {
        setSubmitting(true)
      }
      await onSubmit()
      setDoneOpen(true)
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not submit identity'))
    } finally {
      setSubmitting(false)
      mediaUpload.resetProgress()
    }
  }

  return {
    view,
    route,
    syncing,
    forceEdit,
    editingPack,
    fullName,
    setFullName,
    idType,
    setIdType,
    idNumber,
    setIdNumber,
    idLen,
    keepLast4,
    face,
    setFace,
    front,
    setFront,
    back,
    setBack,
    error,
    formReady,
    busy,
    mediaUpload,
    submitting,
    withdrawing,
    doneOpen,
    setDoneOpen,
    isAuthenticated,
    beginEdit,
    withdraw,
    submit,
  }
}
