import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Skeleton, Switch } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import {
  AdminConfirmModal,
  AdminDetailPage,
  KuraIllustrationModal,
  type AdminDetailAction,
} from '@shared/components'
import { formatNaira } from '@shared/utils/currency'
import { apiErrorMessage } from '@lib/api/auth'
import {
  useActivatePriceMatrix,
  usePriceMatrix,
  useRejectPriceMatrix,
  useSchedulePriceMatrix,
} from './hooks/use-pricing'
import { matrixApiToRecord } from './matrixLiveMap'

function statusTone(status: string) {
  if (status === 'ACTIVE' || status === 'APPROVED') return 'success' as const
  if (status === 'REJECTED') return 'danger' as const
  return 'warning' as const
}

/** Price matrix detail — activate / schedule / reject dual-control verbs. */
export function PricingDetailPanel() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { matrix, isPending, isError } = usePriceMatrix(id)
  const activate = useActivatePriceMatrix(id ?? '')
  const schedule = useSchedulePriceMatrix(id ?? '')
  const reject = useRejectPriceMatrix(id ?? '')
  const [confirmActivate, setConfirmActivate] = useState(false)
  const [confirmSchedule, setConfirmSchedule] = useState(false)
  const [confirmReject, setConfirmReject] = useState(false)
  const [sendNotice, setSendNotice] = useState(true)
  const [okTitle, setOkTitle] = useState<string | null>(null)

  const price = useMemo(
    () => (matrix ? matrixApiToRecord(matrix) : null),
    [matrix],
  )

  if (isPending) {
    return (
      <div className="flex flex-col gap-3 p-6">
        <Skeleton height={40} width={240} />
        <Skeleton height={200} />
      </div>
    )
  }

  if (isError || !price || !matrix) {
    return (
      <AdminDetailPage
        backLabel="Back to pricing"
        onBack={() => navigate('/pricing')}
        title="Tariff not found"
        summaryRows={[{ label: 'ID', value: id ?? '—' }]}
      />
    )
  }

  const actions: AdminDetailAction[] = [
    {
      id: 'propose',
      label: 'Propose change',
      onClick: () => navigate(`/pricing/${price.id}/edit`),
    },
  ]
  if (matrix.status === 'PENDING') {
    actions.push(
      { id: 'schedule', label: 'Schedule', onClick: () => setConfirmSchedule(true) },
      { id: 'activate', label: 'Activate now', onClick: () => setConfirmActivate(true) },
      { id: 'reject', label: 'Reject', onClick: () => setConfirmReject(true) },
    )
  }
  if (matrix.status === 'SCHEDULED') {
    actions.push(
      { id: 'activate', label: 'Activate now', onClick: () => setConfirmActivate(true) },
      { id: 'reject', label: 'Reject', onClick: () => setConfirmReject(true) },
    )
  }

  return (
    <>
      <AdminDetailPage
        backLabel="Back to pricing"
        onBack={() => navigate('/pricing')}
        title={price.vehicleType}
        subtitle={`${price.effectiveDate} · ${price.status}`}
        statusLabel={price.status}
        statusTone={statusTone(price.status)}
        actions={actions}
        summaryRows={[
          { label: 'Daily', value: formatNaira(price.daily) },
          { label: 'Weekly', value: formatNaira(price.weekly) },
          { label: 'Monthly', value: formatNaira(price.monthly) },
          { label: 'Pay-per-swap', value: formatNaira(price.payPerSwap) },
          { label: 'Effective', value: price.effectiveDate },
          { label: 'Vehicle type', value: matrix.vehicle_type },
        ]}
      />

      <AdminConfirmModal
        opened={confirmActivate}
        onClose={() => setConfirmActivate(false)}
        title="Activate now?"
        body="Publishes this matrix for the vehicle type and syncs catalogue plan prices. Creator cannot self-approve."
        confirmLabel="Activate"
        confirmTone="primary"
        illustrationId="confirm-action"
        loading={activate.isPending}
        onConfirm={async () => {
          try {
            await activate.mutateAsync({})
            setConfirmActivate(false)
            setOkTitle('Tariff activated')
          } catch (err) {
            notifications.show({
              color: 'red',
              message: apiErrorMessage(err, 'Activation failed'),
            })
          }
        }}
      />

      <KuraIllustrationModal
        opened={confirmSchedule}
        onClose={() => setConfirmSchedule(false)}
        layout="side"
        illustrationId="confirm-action"
        title="Schedule tariff?"
        description={`Locks this proposal as SCHEDULED from ${price.effectiveDate}. Optionally send a customer notice to operators with this vehicle type.`}
        closeOnClickOutside={!schedule.isPending}
        primaryAction={{
          label: sendNotice ? 'Schedule & notify' : 'Schedule',
          loading: schedule.isPending,
          onClick: async () => {
            try {
              await schedule.mutateAsync({ send_customer_notice: sendNotice })
              setConfirmSchedule(false)
              setOkTitle(
                sendNotice
                  ? 'Tariff scheduled — customer notice queued'
                  : 'Tariff scheduled',
              )
            } catch (err) {
              notifications.show({
                color: 'red',
                message: apiErrorMessage(err, 'Schedule failed'),
              })
            }
          },
        }}
        secondaryAction={{
          label: 'Cancel',
          onClick: () => setConfirmSchedule(false),
          disabled: schedule.isPending,
        }}
      >
        <Switch
          checked={sendNotice}
          onChange={(e) => setSendNotice(e.currentTarget.checked)}
          label="Send customer notice"
          description="Email, SMS, and in-app notice of the effective date (utility-style tariff notice)"
        />
      </KuraIllustrationModal>

      <AdminConfirmModal
        opened={confirmReject}
        onClose={() => setConfirmReject(false)}
        title="Reject proposal?"
        body="Internally rejects this proposed tariff. It will not go live."
        confirmLabel="Reject"
        confirmTone="danger"
        reasonRequired
        reasonLabel="Reason"
        reasonPlaceholder="e.g. Rates conflict with partner agreement"
        loading={reject.isPending}
        onConfirm={async (reason) => {
          try {
            await reject.mutateAsync({ reason })
            setConfirmReject(false)
            setOkTitle('Tariff proposal rejected')
          } catch (err) {
            notifications.show({
              color: 'red',
              message: apiErrorMessage(err, 'Reject failed'),
            })
          }
        }}
      />

      <KuraIllustrationModal
        opened={Boolean(okTitle)}
        onClose={() => {
          setOkTitle(null)
          navigate('/pricing')
        }}
        illustrationId="offer-published"
        title={okTitle ?? ''}
        description={`${price.vehicleType} · ${price.effectiveDate}`}
        primaryAction={{
          label: 'Done',
          onClick: () => {
            setOkTitle(null)
            navigate('/pricing')
          },
        }}
      />
    </>
  )
}
