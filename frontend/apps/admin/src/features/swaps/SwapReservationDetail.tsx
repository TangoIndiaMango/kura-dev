import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { notifications } from '@mantine/notifications'
import {
  AdminConfirmModal,
  AdminDetailPage,
  DetailsDrawer,
  KuraIllustrationModal,
  type AdminDetailAction,
} from '@shared/components'
import { apiErrorMessage } from '@lib/api/auth'
import { formatNaira } from '@shared/utils/currency'
import { useCapabilities } from '../auth/useCapabilities'
import {
  useCancelReservation,
  useExtendReservation,
} from './hooks/use-swaps'
import { readHoldPolicy } from './holdPolicy'
import {
  SWAP_ACTION_META,
  reservationStatusTone,
  reservationStepsFor,
  type SwapActionKind,
  type SwapStep,
} from './swapDetailHelpers'
import { SwapSessionSteps } from './SwapSessionSteps'
import {
  expiresInLabel,
  formatSwapWhen,
  reservationUiStatus,
  type ReservationListApi,
} from './types'

interface Props {
  reservation: ReservationListApi
  onBack: () => void
  onUpdated?: () => void
}

export function SwapReservationDetail({
  reservation,
  onBack,
  onUpdated,
}: Props) {
  const navigate = useNavigate()
  const { can } = useCapabilities()
  const cancelMutation = useCancelReservation(reservation.id)
  const extendMutation = useExtendReservation(reservation.id)
  const [pending, setPending] = useState<SwapActionKind | null>(null)
  const [success, setSuccess] = useState<SwapActionKind | null>(null)
  const [lastExtendMins, setLastExtendMins] = useState(0)
  const [stepPeek, setStepPeek] = useState<SwapStep | null>(null)

  const policy = readHoldPolicy()
  const ui = reservationUiStatus(reservation.status, reservation.expires_at)
  const active = ui === 'ACTIVE'
  const expires = expiresInLabel(reservation.expires_at)
  const maxExtend = policy.maxExtendMinutes
  const meta = pending
    ? SWAP_ACTION_META[pending]
    : success
      ? SWAP_ACTION_META[success]
      : null
  const mutating = cancelMutation.isPending || extendMutation.isPending

  const steps = useMemo(
    () =>
      reservationStepsFor(reservation, {
        defaultHoldMinutes: policy.defaultHoldMinutes,
        maxExtendMinutes: maxExtend,
      }),
    [reservation, policy.defaultHoldMinutes, maxExtend],
  )

  const actions: AdminDetailAction[] = [
    ...(active
      ? [
          {
            id: 'attend',
            label: 'Attend at hub',
            onClick: () =>
              navigate(
                `/hubs/${reservation.hub}/swap?code=${encodeURIComponent(reservation.code)}`,
              ),
          } satisfies AdminDetailAction,
        ]
      : []),
    {
      id: 'extend',
      label: 'Extend Hold',
      disabled: !active || !can('swaps:override'),
      onClick: () => setPending('extend_rsv'),
    },
    {
      id: 'hub',
      label: 'Open hub',
      onClick: () => navigate(`/hubs/${reservation.hub}`),
    },
    {
      id: 'vehicle',
      label: 'Open vehicle',
      onClick: () => navigate(`/vehicles/${reservation.vehicle}`),
    },
    {
      id: 'cancel',
      label: 'Cancel reservation',
      tone: 'danger',
      disabled: !active,
      onClick: () => setPending('cancel_rsv'),
    },
  ]

  return (
    <>
      <AdminDetailPage
        backLabel="Back to swaps"
        onBack={onBack}
        breadcrumbs={[
          { label: 'Swaps', to: '/swaps' },
          { label: reservation.code },
        ]}
        title={reservation.code}
        subtitle={formatSwapWhen(reservation.created_at)}
        statusLabel={ui}
        statusTone={reservationStatusTone(reservation.status)}
        layout="timeline"
        actions={actions}
        summaryTitle="Hold details"
        summaryRows={[
          { label: 'Driver', value: reservation.driver_name || '—' },
          { label: 'Hub', value: reservation.hub_name || reservation.hub_code },
          { label: 'Vehicle', value: reservation.vehicle_plate || '—' },
          { label: 'Payment', value: reservation.payment_mode },
          {
            label: 'Hold amount',
            value:
              reservation.hold_amount_kobo > 0
                ? formatNaira(reservation.hold_amount_kobo, { fromKobo: true })
                : '—',
          },
          { label: 'Created', value: formatSwapWhen(reservation.created_at) },
          { label: 'Expires', value: expires },
        ]}
      >
        <SwapSessionSteps
          title="Hold steps"
          meta={active ? `Expires in ${expires}` : ui}
          steps={steps}
          activeStepId="hold"
          onStepClick={(step) => setStepPeek(step)}
        />
      </AdminDetailPage>

      <DetailsDrawer
        opened={Boolean(stepPeek)}
        onClose={() => setStepPeek(null)}
        title={stepPeek?.drawerTitle ?? 'Step'}
        rows={stepPeek?.rows ?? []}
        viewMore={
          stepPeek?.id === 'created' || (stepPeek?.id === 'hold' && active)
            ? {
                to: `/hubs/${reservation.hub}/swap?code=${encodeURIComponent(reservation.code)}`,
                label: active ? 'Attend at hub' : 'Open hub bay',
              }
            : { to: `/hubs/${reservation.hub}`, label: 'Open hub' }
        }
      />

      {pending && meta ? (
        <AdminConfirmModal
          opened
          onClose={() => setPending(null)}
          title={meta.confirmTitle}
          body={
            pending === 'extend_rsv'
              ? `Add time to this hold. Max +${maxExtend} min.`
              : meta.confirmBody
          }
          confirmLabel={meta.confirmLabel ?? 'Confirm'}
          confirmTone={meta.confirmTone}
          reasonRequired={
            pending === 'extend_rsv' ? true : meta.reasonRequired
          }
          reasonLabel={meta.reasonLabel}
          reasonPlaceholder={
            pending === 'extend_rsv' ? `1-${maxExtend}` : meta.reasonPlaceholder
          }
          reasonNumber={
            pending === 'extend_rsv'
              ? { min: 1, max: maxExtend, suffix: 'min' }
              : undefined
          }
          illustrationId="confirm-action"
          loading={mutating}
          onConfirm={async (reason) => {
            const kind = pending
            if (!kind) return
            try {
              if (kind === 'cancel_rsv') {
                await cancelMutation.mutateAsync({ reason: reason ?? '' })
                setPending(null)
                setSuccess(kind)
                onUpdated?.()
                return
              }
              const add = Number.parseInt(reason ?? '', 10)
              if (!Number.isFinite(add) || add < 1 || add > maxExtend) return
              await extendMutation.mutateAsync({
                minutes: add,
                reason: `Extended by ${add} min`,
              })
              setLastExtendMins(add)
              setPending(null)
              setSuccess(kind)
              onUpdated?.()
            } catch (err) {
              notifications.show({
                color: 'red',
                message: apiErrorMessage(err, 'Action failed'),
              })
            }
          }}
        />
      ) : null}

      {success && meta ? (
        <KuraIllustrationModal
          opened
          onClose={() => setSuccess(null)}
          layout="side"
          illustrationId={meta.successId}
          title={meta.successTitle}
          description={
            success === 'extend_rsv' && lastExtendMins > 0
              ? `${reservation.code} extended by ${lastExtendMins} min.`
              : meta.successBody(reservation.code)
          }
          primaryAction={{
            label: 'Done',
            onClick: () => {
              setSuccess(null)
              if (success === 'cancel_rsv') navigate('/swaps')
            },
          }}
        />
      ) : null}
    </>
  )
}
