import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Skeleton, Text } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import {
  AdminDetailPage,
  type AdminDetailAction,
} from '@shared/components'
import { apiErrorMessage } from '@lib/api/auth'
import { useCapabilities } from '../auth/useCapabilities'
import { SwapDetailConfirmModals } from './SwapDetailConfirmModals'
import { SwapReservationDetail } from './SwapReservationDetail'
import { SwapDetailRefs } from './SwapDetailRefs'
import { swapStatusTone } from './swapDetailHelpers'
import {
  useAbortSwap,
  useReservation,
  useReverseSwap,
  useSwap,
} from './hooks/use-swaps'
import { formatSwapWhen, swapAmountLabel, swapShortCode, swapUiLabel } from './types'

const OPEN_STATUSES = new Set(['STARTED', 'RETURN_RECORDED', 'ISSUED'])

export function SwapsDetailPanel({ id }: { id: string }) {
  const navigate = useNavigate()
  const { can } = useCapabilities()
  const { swap, isPending, isError, refetch } = useSwap(id)
  const showReservationFallback = Boolean(isError || (!isPending && !swap))
  const {
    reservation,
    isPending: rsvPending,
    refetch: refetchRsv,
  } = useReservation(id, { enabled: showReservationFallback })
  const reverseSwap = useReverseSwap(id)
  const abortSwap = useAbortSwap(id)
  const [confirmKind, setConfirmKind] = useState<'reverse' | 'abort' | null>(
    null,
  )
  const [doneKind, setDoneKind] = useState<'reverse' | 'abort' | null>(null)

  if (isPending) {
    return (
      <div className="p-6">
        <Skeleton height={320} radius="md" />
      </div>
    )
  }

  if (!swap && showReservationFallback) {
    if (rsvPending) {
      return (
        <div className="p-6">
          <Skeleton height={320} radius="md" />
        </div>
      )
    }
    if (reservation) {
      return (
        <SwapReservationDetail
          reservation={reservation}
          onBack={() => navigate('/swaps')}
          onUpdated={() => {
            refetchRsv()
          }}
        />
      )
    }
  }

  if (isError || !swap) {
    return (
      <AdminDetailPage
        backLabel="Back to swaps"
        onBack={() => navigate('/swaps')}
        title="Record not found"
        summaryRows={[{ label: 'ID', value: id }]}
      />
    )
  }

  const code = swapShortCode(swap.id)
  const canReverse = swap.status === 'COMPLETED' && can('swaps:reverse')
  const canAbort =
    OPEN_STATUSES.has(String(swap.status).toUpperCase()) &&
    can('swaps:complete')

  const actions: AdminDetailAction[] = []
  if (canAbort) {
    actions.push({
      id: 'abort',
      label: 'Abort session',
      tone: 'danger',
      onClick: () => setConfirmKind('abort'),
    })
  }
  if (canReverse) {
    actions.push({
      id: 'reverse',
      label: 'Reverse swap',
      tone: 'danger',
      onClick: () => setConfirmKind('reverse'),
    })
  }
  if (swap.hub) {
    actions.push({
      id: 'hub',
      label: 'Open hub',
      onClick: () => navigate(`/hubs/${swap.hub}`),
    })
  }
  if (swap.vehicle) {
    actions.push({
      id: 'vehicle',
      label: 'Open vehicle',
      onClick: () => navigate(`/vehicles/${swap.vehicle}`),
    })
  }

  const confirmPending =
    confirmKind === 'abort' ? abortSwap.isPending : reverseSwap.isPending

  return (
    <>
      <AdminDetailPage
        backLabel="Back to swaps"
        onBack={() => navigate('/swaps')}
        breadcrumbs={[{ label: 'Swaps', to: '/swaps' }, { label: code }]}
        title={code}
        subtitle={formatSwapWhen(swap.created_at)}
        statusLabel={swapUiLabel(swap)}
        statusTone={swapStatusTone(swap.ui_status || swap.status)}
        actions={actions}
        summaryTitle="Session details"
        summaryRows={[
          { label: 'Operator phone', value: swap.driver_phone || '—' },
          {
            label: 'Hub',
            value: swap.hub_name || swap.hub_code || swap.hub,
          },
          { label: 'Vehicle', value: swap.vehicle_plate || swap.vehicle },
          {
            label: 'Battery in',
            value: swap.returned_serial
              ? `${swap.returned_serial} · ${swap.returned_charge_pct}%`
              : '—',
          },
          {
            label: 'Battery out',
            value: swap.issued_serial
              ? `${swap.issued_serial} · ${swap.issued_charge_pct}%`
              : '—',
          },
          { label: 'Payment mode', value: swap.payment_mode || '—' },
          {
            label: 'Amount',
            value:
              swap.payment_mode === 'PLAN'
                ? 'Plan covered'
                : swapAmountLabel(swap),
          },
          {
            label: 'Hold',
            value: swap.reservation_status
              ? `${swap.reservation_status}${
                  swap.reservation_expires_at
                    ? ` · ${formatSwapWhen(swap.reservation_expires_at)}`
                    : ''
                }`
              : '—',
          },
          { label: 'Started', value: formatSwapWhen(swap.started_at) },
          { label: 'Completed', value: formatSwapWhen(swap.completed_at) },
          ...(swap.reservation
            ? [
                {
                  label: 'Reservation',
                  value: (
                    <button
                      type="button"
                      className="font-semibold text-[var(--pr)] hover:underline"
                      onClick={() => navigate(`/swaps/${swap.reservation}`)}
                    >
                      {swapShortCode(swap.reservation)}
                    </button>
                  ),
                },
              ]
            : []),
        ]}
      >
        {swap.mismatch_flag ||
        swap.status === 'FAILED' ||
        swap.status === 'REVERSED' ? (
          <div
            className={`rounded-[12px] border px-3.5 py-3 ${
              swap.status === 'FAILED'
                ? 'border-[var(--er)]/30 bg-[#FEF3F2] text-[#B42318]'
                : 'border-[#C47D0E]/30 bg-[var(--ta)] text-[#C47D0E]'
            }`}
          >
            <Text fw={700} size="sm">
              {swap.status === 'FAILED'
                ? 'Session failed'
                : swap.status === 'REVERSED'
                  ? 'Session reversed'
                  : 'Identity / pack mismatch'}
            </Text>
            <p className="mt-1 text-[12.5px] opacity-90">
              {swap.mismatch_reason ||
                (swap.status === 'REVERSED'
                  ? 'Inventory and settlement were rolled back.'
                  : 'Review audit and related cases.')}
            </p>
          </div>
        ) : null}

        <SwapDetailRefs
          swapId={swap.id}
          accountId={swap.account}
          paymentId={swap.payment_id ?? swap.payment}
          clientEventId={swap.client_event_id || null}
          overrideId={swap.override_id || null}
        />
      </AdminDetailPage>

      <SwapDetailConfirmModals
        code={code}
        confirmKind={confirmKind}
        doneKind={doneKind}
        loading={confirmPending}
        onCloseConfirm={() => setConfirmKind(null)}
        onCloseDone={() => setDoneKind(null)}
        onConfirm={async (reason) => {
          const kind = confirmKind
          if (!kind) return
          try {
            if (kind === 'abort') {
              await abortSwap.mutateAsync({ reason: reason ?? '' })
            } else {
              await reverseSwap.mutateAsync({ reason: reason ?? '' })
            }
            setConfirmKind(null)
            setDoneKind(kind)
            await refetch()
          } catch (err) {
            notifications.show({
              color: 'red',
              message: apiErrorMessage(
                err,
                kind === 'abort' ? 'Abort failed' : 'Reverse failed',
              ),
            })
          }
        }}
      />
    </>
  )
}
