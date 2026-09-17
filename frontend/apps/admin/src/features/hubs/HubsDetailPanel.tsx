import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Skeleton } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import {
  AdminConfirmModal,
  AdminDetailPage,
  KuraIllustrationModal,
  type AdminDetailAction,
} from '@shared/components'
import { apiErrorMessage } from '@lib/api/auth'
import { useCapabilities } from '../auth/useCapabilities'
import { buildBayBoardCardsFromSlots } from './hubBayBoardModel'
import {
  agentsForHub,
  HUB_ACTION_META,
  stationExtrasForDetail,
  type HubAction,
} from './hubDetailHelpers'
import { HubBayStatusGrid } from './HubBayStatusGrid'
import { HubStationOverview, HubStatusBanner } from './HubStationOverview'
import { HubCashLiveTable, HubHoldsLiveTable, HubSwapsLiveTable } from './HubDetailLiveTables'
import {
  HubAgentsLiveTable,
  HubAlertsLiveTable,
} from './HubDetailOpsLive'
import { useHub, useHubSlots, useSetHubStatus } from './hooks/use-hubs'
import { useUrlTab } from '@shared/hooks/useUrlTab'
import { HubEnergyThroughputCockpit } from './components/HubEnergyThroughputCockpit'

export function HubsDetailPanel({ id }: { id: string }) {
  const navigate = useNavigate()
  const { can } = useCapabilities()
  const [tab] = useUrlTab('bays', {
    valid: ['bays', 'agents', 'swaps', 'holds', 'cash', 'alerts'],
  })
  const [pending, setPending] = useState<HubAction | null>(null)
  const [success, setSuccess] = useState<HubAction | null>(null)

  const { hub, isPending, isError } = useHub(id)
  const { slots, isPending: slotsPending } = useHubSlots(id, {
    enabled: Boolean(hub),
  })
  const setStatus = useSetHubStatus(id)

  const boardCards = useMemo(
    () => buildBayBoardCardsFromSlots(slots),
    [slots],
  )
  const extras = useMemo(() => (hub ? stationExtrasForDetail(hub) : null), [hub])
  const hubAgents = useMemo(
    () => (hub ? agentsForHub(hub.name, 'Amina Bello') : []),
    [hub?.name],
  )

  if (isPending) {
    return (
      <AdminDetailPage
        onBack={() => navigate('/hubs')}
        backLabel="Back to hubs"
        title="Loading hub…"
        summaryRows={[{ label: 'Requested ID', value: id }]}
      >
        <Skeleton height={220} radius="md" />
      </AdminDetailPage>
    )
  }

  if (isError || !hub) {
    return (
      <AdminDetailPage
        onBack={() => navigate('/hubs')}
        backLabel="Back to hubs"
        title="Hub not found"
        summaryRows={[{ label: 'Requested ID', value: id }]}
      />
    )
  }

  const statusTone =
    hub.status === 'ONLINE'
      ? 'success'
      : hub.status === 'MAINTENANCE'
        ? 'warning'
        : 'danger'
  const meta = pending
    ? HUB_ACTION_META[pending]
    : success
      ? HUB_ACTION_META[success]
      : null
  const canManage = can('hubs:manage')
  const lastSync = hub.updated_at
    ? new Date(hub.updated_at).toLocaleString()
    : '—'

  const actions: AdminDetailAction[] = [
    ...(canManage
      ? [
          {
            id: 'edit',
            label: 'Edit',
            onClick: () => navigate(`/hubs/${hub.id}/edit`),
          },
        ]
      : []),
    {
      id: 'swap-fallback',
      label: 'Hub swap',
      onClick: () => navigate(`/hubs/${hub.id}/swap`),
    },
    ...(canManage
      ? [
          {
            id: 'maintenance',
            label: 'Set Maintenance',
            disabled: hub.status === 'MAINTENANCE',
            onClick: () => setPending('maintenance'),
          },
          {
            id: 'activate',
            label: 'Set Online',
            disabled: hub.status === 'ONLINE',
            onClick: () => setPending('activate'),
          },
          {
            id: 'deactivate',
            label: 'Deactivate',
            tone: 'danger' as const,
            disabled: hub.status === 'OFFLINE',
            onClick: () => setPending('deactivate'),
          },
        ]
      : []),
  ]

  return (
    <>
      <AdminDetailPage
        onBack={() => navigate('/hubs')}
        backLabel="Back to hubs"
        breadcrumbs={[{ label: 'Hubs', to: '/hubs' }, { label: hub.code }]}
        title={hub.name}
        subtitle={hub.address}
        statusLabel={hub.status}
        statusTone={statusTone}
        actions={actions}
        layout="timeline"
        heroSlot={<HubStatusBanner status={hub.status} lastSync={lastSync} />}
        entityKpis={[
          {
            title: 'Ready / slots',
            value: `${hub.ready_count}/${hub.slot_count}`,
            tone: hub.ready_count === 0 ? 'danger' : 'success',
            sub: 'Live bay capacity',
          },
          {
            title: 'Charging',
            value: hub.charging_count,
            sub: `${hub.empty_count} empty · ${hub.fault_count} fault`,
          },
          {
            title: 'Solar capacity',
            value: `${Number(hub.solar_capacity_kw).toFixed(1)} kW`,
            sub: 'Station rated capacity',
          },
          {
            title: 'Coordinates',
            value: `${hub.lat.toFixed(4)}, ${hub.lng.toFixed(4)}`,
            sub: 'Map pin',
          },
        ]}
        tabs={[
          {
            id: 'bays',
            label: 'Bays',
            count: hub.slot_count,
            content: slotsPending || !extras ? (
              <Skeleton height={280} radius="md" />
            ) : (
              <div className="flex flex-col gap-6">
                <HubEnergyThroughputCockpit hub={hub} slots={slots} extras={extras} />
                <HubBayStatusGrid
                  hubId={hub.id}
                  boardCards={boardCards}
                  slots={hub.slot_count}
                  subtitle="Live slot states"
                />
              </div>
            ),
          },
          {
            id: 'agents',
            label: 'Hub Operators',
            content: (
              <HubAgentsLiveTable hubId={hub.id} enabled={tab === 'agents'} />
            ),
          },
          {
            id: 'swaps',
            label: 'Swaps',
            content: (
              <HubSwapsLiveTable hubId={hub.id} enabled={tab === 'swaps'} />
            ),
          },
          {
            id: 'holds',
            label: 'Holds',
            content: <HubHoldsLiveTable hubId={hub.id} />,
          },
          {
            id: 'cash',
            label: 'Cash',
            content: <HubCashLiveTable hubId={hub.id} />,
          },
          {
            id: 'alerts',
            label: 'Alerts',
            content: (
              <HubAlertsLiveTable hubId={hub.id} enabled={tab === 'alerts'} />
            ),
          },
        ]}
      >
        {extras ? (
          <HubStationOverview
            stationId={hub.code}
            name={hub.name}
            address={hub.address}
            lastSync={lastSync}
            extras={extras}
            agents={hubAgents}
            leadPhone={hubAgents[0]?.phone || '+234 802 334 9912'}
          />
        ) : null}
      </AdminDetailPage>

      {pending && meta ? (
        <AdminConfirmModal
          opened
          onClose={() => setPending(null)}
          title={meta.confirmTitle}
          body={meta.confirmBody}
          confirmTone={meta.confirmTone}
          confirmLabel={pending === 'deactivate' ? 'Deactivate' : pending === 'activate' ? 'Set online' : 'Confirm'}
          reasonRequired={pending === 'deactivate'}
          illustrationId={pending === 'deactivate' ? 'confirm-delete' : 'confirm-action'}
          loading={setStatus.isPending}
          onConfirm={async (reason) => {
            const action = pending
            try {
              await setStatus.mutateAsync({
                status: meta.nextStatus,
                ...(reason ? { note: reason } : {}),
              })
              setPending(null)
              setSuccess(action)
            } catch (err) {
              notifications.show({
                color: 'red',
                message: apiErrorMessage(err, 'Could not update hub status'),
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
          description={meta.successBody(hub.name)}
          primaryAction={{
            label: 'Done',
            onClick: () => setSuccess(null),
          }}
        />
      ) : null}
    </>
  )
}
