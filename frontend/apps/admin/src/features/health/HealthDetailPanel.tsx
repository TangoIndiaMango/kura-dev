import { useNavigate, useParams } from 'react-router-dom'
import { Skeleton } from '@mantine/core'
import {
  AdminConfirmModal,
  AdminDetailPage,
  type AdminDetailAction,
} from '@shared/components'
import { notifications } from '@mantine/notifications'
import { apiErrorMessage } from '@lib/api/auth'
import {
  BatteryCellTelemetryPanel,
  useBattery,
  useFaultBattery,
  batteryStatusLabel,
} from '@features/batteries'
import { useState } from 'react'

export function HealthDetailPanel() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { battery, isPending, isError, refetch } = useBattery(id)
  const fault = useFaultBattery(id ?? '')
  const [flagOpen, setFlagOpen] = useState(false)

  if (isPending) {
    return (
      <div className="p-6">
        <Skeleton height={280} radius="md" />
      </div>
    )
  }

  if (isError || !battery) {
    return (
      <AdminDetailPage
        backLabel="Back to health"
        onBack={() => navigate('/health')}
        title="Pack not found"
        summaryRows={[{ label: 'ID', value: id ?? '—' }]}
      />
    )
  }

  const actions: AdminDetailAction[] = [
    {
      id: 'open',
      label: 'Open battery',
      onClick: () => navigate(`/batteries/${battery.id}`),
    },
    ...(battery.status !== 'FAULTED' && battery.status !== 'RETIRED'
      ? [
          {
            id: 'flag',
            label: 'Flag fault',
            tone: 'danger' as const,
            onClick: () => setFlagOpen(true),
          },
        ]
      : []),
  ]

  return (
    <>
      <AdminDetailPage
        backLabel="Back to health"
        onBack={() => navigate('/health')}
        breadcrumbs={[
          { label: 'Health', to: '/health' },
          { label: battery.serial },
        ]}
        title={battery.serial}
        subtitle={`${battery.battery_type_name} · ${battery.hub_code ?? battery.hub_name ?? '—'}`}
        statusLabel={batteryStatusLabel(battery.status)}
        actions={actions}
        entityKpis={[
          {
            title: 'State of health',
            value: `${battery.health_pct}%`,
            tone: battery.health_pct < 60 ? 'danger' : 'success',
          },
          { title: 'Cycles', value: battery.cycle_count },
          {
            title: 'Charge',
            value: `${battery.charge_pct}%`,
          },
        ]}
        summaryRows={[
          { label: 'Model', value: battery.battery_type_name },
          {
            label: 'Hub',
            value: battery.hub_code ?? battery.hub_name ?? '—',
          },
          { label: 'Custodian', value: battery.custodian_type },
        ]}
        tabs={[
          {
            id: 'overview',
            label: 'Overview',
            content: <BatteryCellTelemetryPanel battery={battery} />,
          },
        ]}
      />

      <AdminConfirmModal
        opened={flagOpen}
        onClose={() => setFlagOpen(false)}
        title="Flag health issue?"
        body="Marks the pack FAULTED for workshop inspection."
        confirmTone="danger"
        confirmLabel="Flag fault"
        reasonRequired
        loading={fault.isPending}
        onConfirm={async (reason) => {
          try {
            await fault.mutateAsync({ note: reason ?? '' })
            setFlagOpen(false)
            await refetch()
            notifications.show({ color: 'teal', message: 'Pack flagged.' })
          } catch (err) {
            notifications.show({
              color: 'red',
              message: apiErrorMessage(err, 'Flag failed'),
            })
          }
        }}
      />
    </>
  )
}
