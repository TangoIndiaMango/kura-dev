import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { notifications } from '@mantine/notifications'
import {
  AdminConfirmModal,
  AdminDetailPage,
  type AdminDetailAction,
} from '@shared/components'
import { apiErrorMessage } from '@lib/api/auth'
import { useUrlTab } from '@shared/hooks/useUrlTab'
import { useCapabilities } from '../auth/useCapabilities'
import {
  useRetireVehicle,
  useRotateVehicleQr,
  useSetVehicleStatus,
  useVehicle,
  useVehicleReservations,
  useVehicleSwaps,
} from './hooks/use-vehicles'
import { vehicleStatusLabel } from './types'
import { VehicleOverview } from './VehicleOverviewLive'
import {
  VehicleHoldsTable,
  VehicleSwapsTable,
} from './VehicleRelatedTables'
import { VehicleVcuPanel } from './VehicleVcuPanel'

const DETAIL_TABS = ['swaps', 'holds', 'vcu'] as const

export function VehiclesDetailPanel({ id }: { id: string }) {
  const navigate = useNavigate()
  const { can } = useCapabilities()
  const [tab] = useUrlTab('swaps', { valid: DETAIL_TABS })
  const { vehicle, isPending, isError, refetch } = useVehicle(id)
  const { swaps, isPending: swapsPending } = useVehicleSwaps(id, {
    enabled: tab === 'swaps',
  })
  const { reservations, isPending: holdsPending } = useVehicleReservations(id, {
    enabled: tab === 'holds',
  })
  const vcuActive = tab === 'vcu'
  const setStatus = useSetVehicleStatus(id)
  const rotateQr = useRotateVehicleQr(id)
  const retireVehicle = useRetireVehicle(id)
  const [pendingStatus, setPendingStatus] = useState<
    'ACTIVE' | 'SUSPENDED' | null
  >(null)
  const [retireOpen, setRetireOpen] = useState(false)
  const [qrPreview, setQrPreview] = useState<string | null>(null)

  if (isPending) {
    return (
      <AdminDetailPage
        backLabel="Back to vehicles"
        onBack={() => navigate('/vehicles')}
        title="Loading…"
        summaryRows={[]}
      />
    )
  }

  if (isError || !vehicle) {
    return (
      <AdminDetailPage
        backLabel="Back to vehicles"
        onBack={() => navigate('/vehicles')}
        title="Vehicle not found"
        summaryRows={[{ label: 'ID', value: id }]}
      />
    )
  }

  const statusTone =
    vehicle.status === 'ACTIVE'
      ? 'success'
      : vehicle.status === 'SUSPENDED' || vehicle.status === 'PENDING'
        ? 'warning'
        : 'danger'

  const actions: AdminDetailAction[] = []
  if (can('vehicles:manage') && vehicle.status !== 'RETIRED') {
    actions.push({
      id: 'edit',
      label: 'Edit',
      onClick: () => navigate(`/vehicles/${vehicle.id}/edit`),
    })
    actions.push({
      id: 'suspend',
      label: vehicle.status === 'SUSPENDED' ? 'Reinstate' : 'Suspend',
      onClick: () =>
        setPendingStatus(
          vehicle.status === 'SUSPENDED' ? 'ACTIVE' : 'SUSPENDED',
        ),
    })
    actions.push({
      id: 'retire',
      label: 'Retire',
      tone: 'danger',
      onClick: () => setRetireOpen(true),
    })
  }
  if (can('swaps:override') && vehicle.status !== 'RETIRED') {
    actions.push({
      id: 'rotate-qr',
      label: 'Rotate hull QR',
      onClick: async () => {
        try {
          const res = await rotateQr.mutateAsync({})
          setQrPreview(res.qr)
          notifications.show({ color: 'teal', message: 'Hull QR rotated.' })
        } catch (err) {
          notifications.show({
            color: 'red',
            message: apiErrorMessage(err, 'QR rotate failed'),
          })
        }
      },
    })
  }

  return (
    <>
      <AdminDetailPage
        backLabel="Back to vehicles"
        onBack={() => navigate('/vehicles')}
        breadcrumbs={[
          { label: 'Vehicles', to: '/vehicles' },
          { label: vehicle.registration_plate },
        ]}
        title={vehicle.registration_plate}
        subtitle={`${vehicle.make} ${vehicle.model_name}`}
        statusLabel={vehicleStatusLabel(vehicle.status)}
        statusTone={statusTone}
        actions={actions}
        layout="timeline"
        summaryRows={[
          { label: 'Owner', value: vehicle.owner_name || vehicle.owner_kura_id },
          { label: 'Type', value: vehicle.vehicle_type },
          {
            label: 'Join path',
            value:
              vehicle.acquisition_path === 'ENGINE_SWAP'
                ? 'Engine surrender'
                : 'EV first',
          },
          {
            label: 'Battery type',
            value: vehicle.battery_type_name || '—',
          },
          {
            label: 'Mounted pack',
            value: vehicle.current_battery_serial || 'None',
          },
          {
            label: 'Stored petrol',
            value: vehicle.petrol_engine_id ? 'In custody' : '—',
          },
        ]}
        entityKpis={[
          {
            title: 'Pack charge',
            value:
              vehicle.current_battery_charge != null
                ? `${vehicle.current_battery_charge}%`
                : '—',
            tone:
              vehicle.current_battery_charge != null &&
              vehicle.current_battery_charge < 30
                ? 'danger'
                : 'success',
          },
          {
            title: 'Status',
            value: vehicleStatusLabel(vehicle.status),
            sub: vehicle.vehicle_type,
          },
        ]}
        tabs={[
          {
            id: 'swaps',
            label: 'Swaps',
            content: (
              <VehicleSwapsTable swaps={swaps} isPending={swapsPending} />
            ),
          },
          {
            id: 'holds',
            label: 'Holds',
            content: (
              <VehicleHoldsTable
                reservations={reservations}
                isPending={holdsPending}
              />
            ),
          },
          {
            id: 'vcu',
            label: 'VCU / IoT',
            content: vcuActive ? (
              <VehicleVcuPanel
                vehicleId={id}
                canCommand={can('vehicles:manage')}
                canRotateIot={can('telemetry:ingest')}
              />
            ) : null,
          },
        ]}
      >
        <VehicleOverview
          vehicle={vehicle}
          qrPreview={qrPreview}
          canAssign={can('vehicles:manage')}
          onAssigned={() => {
            refetch()
          }}
        />
      </AdminDetailPage>

      <AdminConfirmModal
        opened={Boolean(pendingStatus)}
        onClose={() => setPendingStatus(null)}
        title={
          pendingStatus === 'SUSPENDED' ? 'Suspend vehicle?' : 'Reinstate vehicle?'
        }
        body={
          pendingStatus === 'SUSPENDED'
            ? 'Suspended vehicles cannot start new swaps.'
            : 'Restores the vehicle to ACTIVE for bay sessions.'
        }
        confirmLabel={pendingStatus === 'SUSPENDED' ? 'Suspend' : 'Reinstate'}
        loading={setStatus.isPending}
        onConfirm={async () => {
          if (!pendingStatus) return
          try {
            await setStatus.mutateAsync({ status: pendingStatus })
            setPendingStatus(null)
            await refetch()
            notifications.show({ color: 'teal', message: 'Status updated.' })
          } catch (err) {
            notifications.show({
              color: 'red',
              message: apiErrorMessage(err, 'Status update failed'),
            })
          }
        }}
      />

      <AdminConfirmModal
        opened={retireOpen}
        onClose={() => setRetireOpen(false)}
        title="Retire this vehicle?"
        body="Removes the vehicle from active fleet. Reason is kept on the audit trail."
        confirmTone="danger"
        confirmLabel="Retire"
        reasonRequired
        reasonLabel="Reason"
        illustrationId="confirm-delete"
        loading={retireVehicle.isPending}
        onConfirm={async (reason) => {
          try {
            await retireVehicle.mutateAsync({
              ...(reason ? { note: reason } : {}),
            })
            setRetireOpen(false)
            await refetch()
            notifications.show({ color: 'teal', message: 'Vehicle retired.' })
          } catch (err) {
            notifications.show({
              color: 'red',
              message: apiErrorMessage(err, 'Retire failed'),
            })
          }
        }}
      />
    </>
  )
}
