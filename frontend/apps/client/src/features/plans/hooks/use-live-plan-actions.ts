import { useState } from 'react'
import { useVerifyPinMutation } from '@lib/api/auth-mutations'
import type { PlanCatalogItem, PlanChangeKind } from '../planCatalog'
import type { PlanConfirmPayload } from '../components/PlanChangeConfirmSheet'
import {
  useCancelSubscription,
  usePurchaseSubscription,
  useRenewSubscription,
  useSetAutoRenew,
  useSwitchPreview,
  useSwitchSubscription,
  type SubscriptionApi,
  type SwitchPreviewApi,
} from './use-operator-plans'
import { newIdempotencyKey } from './plan-live-map'
import { coverShortfall, type CoverOutcome } from '../../payments/cover-shortfall'

const SHORTFALL_COPY: Record<Exclude<CoverOutcome, 'covered'>, string> = {
  cancelled: 'Payment cancelled — your plan was not changed.',
  failed: 'Payment failed — you were not charged. Try again.',
  pending: 'Payment received — still confirming with Paystack. Try again in a minute.',
}

function apiErrorMessage(err: unknown): string {
  const ax = err as {
    response?: { data?: { error?: { message?: string }; detail?: string } }
    message?: string
  }
  return (
    ax?.response?.data?.error?.message ||
    ax?.response?.data?.detail ||
    ax?.message ||
    'Something went wrong. Try again.'
  )
}

export function useLivePlanActions(input: {
  live: boolean
  vehicleId: string | null
  vehicleName: string
  liveSub: SubscriptionApi | null
  catalog: PlanCatalogItem[]
  onSuccess: (kind: PlanChangeKind) => void
}) {
  const purchaseMut = usePurchaseSubscription()
  const renewMut = useRenewSubscription()
  const switchMut = useSwitchSubscription()
  const switchPreviewMut = useSwitchPreview()
  const cancelMut = useCancelSubscription()
  const autoRenewMut = useSetAutoRenew()
  const verifyPin = useVerifyPinMutation()

  const [pending, setPending] = useState<{
    optionId: string
    kind: PlanChangeKind
  } | null>(null)
  const [preview, setPreview] = useState<SwitchPreviewApi | null>(null)
  const [sheetError, setSheetError] = useState<string | null>(null)
  const [paying, setPaying] = useState(false)

  const busy =
    paying ||
    purchaseMut.isPending ||
    renewMut.isPending ||
    switchMut.isPending ||
    cancelMut.isPending ||
    verifyPin.isPending ||
    switchPreviewMut.isPending

  const target = pending
    ? (input.catalog.find((p) => p.id === pending.optionId) ?? null)
    : null

  const clearSheet = () => {
    if (busy) return
    setPending(null)
    setPreview(null)
    setSheetError(null)
  }

  const openPending = async (optionId: string, kind: PlanChangeKind) => {
    setSheetError(null)
    setPreview(null)
    setPending({ optionId, kind })
    if (
      !input.live ||
      !input.liveSub ||
      kind === 'subscribe' ||
      kind === 'renew' ||
      kind === 'current'
    ) {
      return
    }
    const opt = input.catalog.find((p) => p.id === optionId)
    if (!opt?.apiPlanId || optionId === 'pps') return
    try {
      const immediate =
        kind === 'upgrade' ? true : kind === 'downgrade' ? false : null
      const data = await switchPreviewMut.mutateAsync({
        id: input.liveSub.id,
        plan: opt.apiPlanId,
        immediate,
      })
      setPreview(data)
    } catch (err) {
      setSheetError(apiErrorMessage(err))
    }
  }

  const applyLive = async (payload: PlanConfirmPayload) => {
    if (!input.vehicleId || !pending || !target) return
    setSheetError(null)
    try {
      let pinGrant = ''
      const needsPin =
        Boolean(preview?.pin_required) ||
        pending.kind === 'subscribe' ||
        pending.kind === 'renew' ||
        (pending.kind === 'upgrade' && (preview?.due_kobo ?? 1) > 0)

      // PIN first (a wrong PIN fails before anyone pays), then Paystack covers
      // whatever the balance is short, then the plan change is charged.
      if (needsPin && target.id !== 'pps') {
        const grant = await verifyPin.mutateAsync({ pin: payload.pin })
        pinGrant = grant.pin_grant
      }
      const dueKobo = Math.round(payload.dueNaira * 100)
      if (target.id !== 'pps' && pending.kind !== 'downgrade' && dueKobo > 0) {
        const pinAt = Date.now()
        setPaying(true)
        const outcome = await coverShortfall(dueKobo).finally(() => setPaying(false))
        if (outcome !== 'covered') {
          setSheetError(SHORTFALL_COPY[outcome])
          return
        }
        if (pinGrant && Date.now() - pinAt > 90_000) {
          pinGrant = (await verifyPin.mutateAsync({ pin: payload.pin })).pin_grant // grants last 2 min
        }
      }

      if (target.id === 'pps') {
        if (input.liveSub) {
          await cancelMut.mutateAsync({
            id: input.liveSub.id,
            reason: 'switch_to_pps',
          })
        }
      } else if (pending.kind === 'renew' && input.liveSub) {
        await renewMut.mutateAsync({
          id: input.liveSub.id,
          pin_grant: pinGrant,
          discount_code: payload.discount?.code ?? '',
          idempotency_key: newIdempotencyKey('renew'),
        })
      } else if (pending.kind === 'subscribe' || !input.liveSub) {
        if (!target.apiPlanId) throw new Error('Plan not available online yet.')
        await purchaseMut.mutateAsync({
          vehicle: input.vehicleId,
          plan: target.apiPlanId,
          pin_grant: pinGrant,
          discount_code: payload.discount?.code ?? '',
          idempotency_key: newIdempotencyKey('buy'),
          auto_renew: true,
        })
      } else {
        if (!target.apiPlanId) throw new Error('Plan not available online yet.')
        await switchMut.mutateAsync({
          id: input.liveSub.id,
          plan: target.apiPlanId,
          immediate:
            pending.kind === 'upgrade'
              ? true
              : pending.kind === 'downgrade'
                ? false
                : null,
          pin_grant: pinGrant,
          discount_code: payload.discount?.code ?? '',
          idempotency_key: newIdempotencyKey('switch'),
        })
      }

      input.onSuccess(pending.kind)
      setPending(null)
      setPreview(null)
    } catch (err) {
      setSheetError(apiErrorMessage(err))
    }
  }

  const onConfirm = (payload: PlanConfirmPayload) => {
    if (!input.live) {
      setSheetError('Sign in required')
      return
    }
    applyLive(payload)
  }

  const toggleAutoRenew = () => {
    if (input.live && input.liveSub) {
      autoRenewMut.mutate({
        id: input.liveSub.id,
        auto_renew: !input.liveSub.auto_renew,
      })
    }
  }

  return {
    pending,
    target,
    preview,
    sheetError,
    busy,
    openPending,
    clearSheet,
    onConfirm,
    toggleAutoRenew,
    autoRenewPending: autoRenewMut.isPending,
  }
}
