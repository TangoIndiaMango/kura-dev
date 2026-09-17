import { useState } from 'react'
import { notifications } from '@mantine/notifications'
import { apiErrorMessage } from '@lib/api/auth'
import type { OperatorAction } from '../operatorActionMeta'
import type { IdentityVerifyVia } from '../OperatorVerifyIdentityModal'
import {
  useNotifyOperator,
  useReinstateOperator,
  useRejectOperatorKyc,
  useRequestOperatorKycPhotos,
  useSuspendOperator,
  useVerifyOperatorKyc,
} from './use-operators'

export function useOperatorDetailActions(id: string) {
  const verifyKyc = useVerifyOperatorKyc(id)
  const rejectKyc = useRejectOperatorKyc(id)
  const requestPhotos = useRequestOperatorKycPhotos(id)
  const notifyOp = useNotifyOperator(id)
  const suspendOp = useSuspendOperator(id)
  const reinstateOp = useReinstateOperator(id)

  const [pending, setPending] = useState<Exclude<OperatorAction, 'create-swap'> | null>(
    null,
  )
  const [success, setSuccess] = useState<OperatorAction | 'assign-discount' | null>(null)

  const isPending =
    verifyKyc.isPending ||
    rejectKyc.isPending ||
    requestPhotos.isPending ||
    notifyOp.isPending ||
    suspendOp.isPending ||
    reinstateOp.isPending

  const runVerify = async (payload: { via: IdentityVerifyVia; note: string }) => {
    try {
      await verifyKyc.mutateAsync({
        via: payload.via,
        note: payload.note,
      })
      setPending(null)
      setSuccess('verify-identity')
    } catch (err) {
      notifications.show({
        color: 'red',
        message: apiErrorMessage(err, 'Action failed'),
      })
      setPending(null)
    }
  }

  const runConfirm = async (reason?: string) => {
    const action = pending
    if (!action || action === 'verify-identity') return

    try {
      if (action === 'request-id-photos') {
        await requestPhotos.mutateAsync({
          note: reason?.trim() || 'Please update clearer ID photos in Identity',
        })
      } else if (action === 'reject-identity') {
        await rejectKyc.mutateAsync({
          reason: reason?.trim() || 'Identity rejected by ops',
        })
      } else if (action === 'message') {
        await notifyOp.mutateAsync({
          message: reason?.trim() || 'Please check Identity in your Kura app.',
        })
      } else if (action === 'suspend') {
        await suspendOp.mutateAsync({
          reason: reason?.trim() || 'Suspended by ops from admin CRM',
        })
      } else if (action === 'reactivate') {
        await reinstateOp.mutateAsync({})
      } else if (action === 'resend-invite' || action === 'reset-pin') {
        setPending(null)
        setSuccess(action)
        return
      } else {
        setPending(null)
        return
      }
      setPending(null)
      setSuccess(action)
    } catch (err) {
      notifications.show({
        color: 'red',
        message: apiErrorMessage(err, 'Action failed'),
      })
      setPending(null)
    }
  }

  return {
    pending,
    setPending,
    success,
    setSuccess,
    isPending,
    runConfirm,
    runVerify,
    verifyKyc,
    rejectKyc,
    requestPhotos,
    notifyOp,
    suspendOp,
    reinstateOp,
  }
}
