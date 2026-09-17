import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Skeleton } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import {
  AdminConfirmModal,
  AdminDetailPage,
  KuraIllustrationModal,
} from '@shared/components'
import { apiErrorMessage } from '@lib/api/auth'
import { useHubs } from '@features/hubs'
import { useCapabilities } from '../auth/useCapabilities'
import { BATTERY_ACTION_META, type BatteryAction } from './batteryDetailHelpers'
import { batteryDetailActions } from './batteryDetailActions'
import {
  batteryStatusTone,
  mapCustodyRows,
} from './batteryDetailLive'
import { BatteryCustodyTable } from './BatteryCustodyTable'
import { BatteryLiveSwapsTable } from './BatteryLiveSwapsTable'
import { BatteryPackOverview } from './BatteryPackOverview'
import { BatteryCellTelemetryPanel } from './BatteryCellTelemetryPanel'
import { BatteryTransferModal } from './BatteryTransferModal'
import { BatteryLabelModal } from './BatteryLabelModal'
import {
  useBattery,
  useBatteryEvents,
  useBatteryLabel,
  useBatterySwaps,
  useFaultBattery,
  useFoundBattery,
  useRetireBattery,
  useSetBatteryStatus,
  useTransferBattery,
} from './hooks/use-batteries'
import {
  batteryLocationLabel,
  batteryStatusLabel,
} from './types'
import { useUrlTab } from '@shared/hooks/useUrlTab'

export function BatteriesDetailPanel({ id }: { id: string }) {
  const navigate = useNavigate()
  const { can } = useCapabilities()
  const [pending, setPending] = useState<Exclude<BatteryAction, 'transfer'> | null>(
    null,
  )
  const [success, setSuccess] = useState<BatteryAction | null>(null)
  const [transferOpen, setTransferOpen] = useState(false)
  const [labelOpen, setLabelOpen] = useState(false)
  const [tab] = useUrlTab('swaps', { valid: ['swaps', 'cells', 'custody'] })
  const custodyTab = tab === 'custody'
  const swapsTab = tab === 'swaps'

  const { battery, isPending, isError } = useBattery(id)
  const { events, isPending: eventsPending } = useBatteryEvents(id, {
    enabled: custodyTab,
  })
  const { swaps, isPending: swapsPending } = useBatterySwaps(id, {
    enabled: swapsTab,
  })
  const { label, isPending: labelPending, refetch: refetchLabel } = useBatteryLabel(
    id,
    { enabled: labelOpen },
  )
  const transferBattery = useTransferBattery(id)
  const faultBattery = useFaultBattery(id)
  const foundBattery = useFoundBattery(id)
  const retireBattery = useRetireBattery(id)
  const setStatus = useSetBatteryStatus(id)
  const { hubs } = useHubs({ page_size: 100 }, { enabled: transferOpen })

  const hubOptions = useMemo(
    () =>
      hubs
        .filter((h) => h.status !== 'OFFLINE' && h.status !== 'CLOSED')
        .map((h) => ({ value: h.id, label: `${h.code} · ${h.name}` })),
    [hubs],
  )

  if (isPending) {
    return (
      <AdminDetailPage
        onBack={() => navigate('/batteries')}
        backLabel="Back to batteries"
        title="Loading pack…"
        summaryRows={[{ label: 'Requested ID', value: id }]}
      >
        <Skeleton height={220} radius="md" />
      </AdminDetailPage>
    )
  }

  if (isError || !battery) {
    return (
      <AdminDetailPage
        onBack={() => navigate('/batteries')}
        backLabel="Back to batteries"
        title="Battery not found"
        summaryRows={[{ label: 'Requested ID', value: id }]}
      />
    )
  }

  const canManage = can('batteries:manage')
  const meta = pending ? BATTERY_ACTION_META[pending] : success ? BATTERY_ACTION_META[success] : null
  const location = batteryLocationLabel(battery)
  const lastSync = battery.updated_at ? new Date(battery.updated_at).toLocaleString() : '—'
  const actionPending =
    faultBattery.isPending || retireBattery.isPending || foundBattery.isPending || setStatus.isPending

  const openLabel = () => {
    setLabelOpen(true)
    refetchLabel()
  }

  const actions = batteryDetailActions({
    battery,
    canManage,
    onEdit: () => navigate(`/batteries/${battery.id}/edit`),
    onTransfer: () => setTransferOpen(true),
    onLabel: openLabel,
    onFound: () => setPending('found'),
    onFlag: () => setPending('flag'),
    onSetActive: () => setPending('activate'),
    onRetire: () => setPending('retire'),
  })

  return (
    <>
      <AdminDetailPage
        onBack={() => navigate('/batteries')}
        backLabel="Back to batteries"
        breadcrumbs={[
          { label: 'Batteries', to: '/batteries' },
          { label: battery.serial },
        ]}
        title={battery.serial}
        subtitle={`${battery.battery_type_name} · ${location}`}
        statusLabel={batteryStatusLabel(battery.status)}
        statusTone={batteryStatusTone(battery.status)}
        actions={actions}
        layout="timeline"
        entityKpis={[
          {
            title: 'Charge',
            value: `${battery.charge_pct}%`,
            tone: battery.charge_pct < 30 ? 'danger' : 'success',
          },
          {
            title: 'State of health',
            value: `${battery.health_pct}%`,
            tone: battery.health_pct < 80 ? 'warning' : 'success',
          },
          { title: 'Cycles', value: battery.cycle_count, sub: 'Lifetime count' },
          { title: 'Location', value: location, sub: lastSync },
        ]}
        tabs={[
          {
            id: 'swaps',
            label: 'Swaps',
            content: swapsPending ? (
              <Skeleton height={180} radius="md" />
            ) : (
              <BatteryLiveSwapsTable
                batteryId={battery.id}
                serial={battery.serial}
                rows={swaps}
              />
            ),
          },
          {
            id: 'cells',
            label: 'Cell telemetry',
            content: <BatteryCellTelemetryPanel battery={battery} />,
          },
          {
            id: 'custody',
            label: 'Custody',
            content: eventsPending ? (
              <Skeleton height={180} radius="md" />
            ) : (
              <BatteryCustodyTable
                batteryId={battery.id}
                serial={battery.serial}
                rows={mapCustodyRows(events)}
              />
            ),
          },
        ]}
      >
        <BatteryPackOverview
          battery={battery}
          onOpenHub={(hubId) => navigate(`/hubs/${hubId}`)}
        />
      </AdminDetailPage>

      <BatteryTransferModal
        opened={transferOpen}
        onClose={() => setTransferOpen(false)}
        currentHubId={battery.current_hub_id}
        hubOptions={hubOptions}
        transferMutation={transferBattery}
        onSuccess={() => setSuccess('transfer')}
      />

      <BatteryLabelModal
        opened={labelOpen}
        onClose={() => setLabelOpen(false)}
        loading={labelPending}
        label={label}
      />

      {pending && meta ? (
        <AdminConfirmModal
          opened
          onClose={() => setPending(null)}
          title={meta.confirmTitle}
          body={meta.confirmBody}
          confirmTone={meta.confirmTone}
          reasonRequired={meta.reasonRequired}
          confirmLabel="Confirm"
          illustrationId={
            pending === 'retire' ? 'confirm-delete' : 'confirm-action'
          }
          loading={actionPending}
          onConfirm={async (reason) => {
            try {
              if (pending === 'activate') {
                await setStatus.mutateAsync({
                  status: 'AVAILABLE',
                  ...(reason ? { note: reason } : {}),
                })
              } else if (pending === 'flag') {
                await faultBattery.mutateAsync({
                  ...(reason ? { note: reason } : {}),
                })
              } else if (pending === 'found') {
                await foundBattery.mutateAsync({
                  ...(reason ? { note: reason } : {}),
                })
              } else if (pending === 'retire') {
                await retireBattery.mutateAsync({
                  ...(reason ? { note: reason } : {}),
                })
              }
              const action = pending
              setPending(null)
              setSuccess(action)
            } catch (err) {
              notifications.show({
                color: 'red',
                message: apiErrorMessage(err, 'Could not update battery'),
              })
            }
          }}
        />
      ) : null}

      {success && meta ? (
        <KuraIllustrationModal
          opened
          onClose={() => setSuccess(null)}
          illustrationId={meta.illustrationId}
          title={meta.successTitle}
          description={meta.successBody(battery.serial)}
          primaryAction={{
            label: success === 'retire' ? 'View batteries' : 'Done',
            onClick: () => {
              setSuccess(null)
              if (success === 'retire') navigate('/batteries')
            },
          }}
        />
      ) : null}
    </>
  )
}
