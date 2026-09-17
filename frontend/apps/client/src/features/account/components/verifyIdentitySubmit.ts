import type { LiveKyc } from './verifyIdentityLive'

export type IdentityUploadSlot = {
  key: 'face' | 'front' | 'back'
  file: File
  kind: 'face' | 'identity'
}

export function buildIdentityUploadSlots(opts: {
  face: File | null
  front: File | null
  back: File | null
}): IdentityUploadSlot[] {
  const slots: IdentityUploadSlot[] = []
  if (opts.face) slots.push({ key: 'face', file: opts.face, kind: 'face' })
  if (opts.front) slots.push({ key: 'front', file: opts.front, kind: 'identity' })
  if (opts.back) slots.push({ key: 'back', file: opts.back, kind: 'identity' })
  return slots
}

export function resolveIdentityAssetIds(opts: {
  face: File | null
  front: File | null
  back: File | null
  uploaded: Record<string, { id: string }>
  keepFaceId: string | null | undefined
  keepFrontId: string | null | undefined
  keepBackId: string | null | undefined
}): { faceId: string; frontId: string; backId: string } | null {
  const faceId = opts.face ? opts.uploaded.face?.id : opts.keepFaceId
  const frontId = opts.front ? opts.uploaded.front?.id : opts.keepFrontId
  const backId = opts.back ? opts.uploaded.back?.id : opts.keepBackId
  if (!faceId || !frontId || !backId) return null
  return { faceId, frontId, backId }
}

export function patchMeKyc(
  old: {
    photo_url?: string | null
    kyc?: LiveKyc
    account?: { kyc_status?: string } | null
  } | undefined,
  kyc: LiveKyc,
) {
  if (!old || !kyc) return old
  return {
    ...old,
    photo_url: kyc.photo_url ?? old.photo_url,
    kyc: { ...old.kyc, ...kyc },
    account: old.account
      ? { ...old.account, kyc_status: kyc.status }
      : old.account,
  }
}
