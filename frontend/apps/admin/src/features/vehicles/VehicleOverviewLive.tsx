import { Link } from 'react-router-dom'
import { Code, Text } from '@mantine/core'
import type { VehicleDetailApi } from './types'
import { vehicleStatusLabel } from './types'

export function VehicleOverview({
  vehicle,
  qrPreview,
}: {
  vehicle: VehicleDetailApi
  qrPreview?: string | null
}) {
  return (
    <div className="flex flex-col gap-4">
      {vehicle.status === 'SUSPENDED' || vehicle.status === 'RETIRED' ? (
        <div className="rounded-[12px] border border-[#C47D0E]/30 bg-[var(--ta)] px-3.5 py-3 text-[#C47D0E]">
          <p className="text-[13.5px] font-bold">
            {vehicleStatusLabel(vehicle.status)}
          </p>
          <p className="mt-1 text-[12.5px] opacity-90">
            {vehicle.status === 'RETIRED'
              ? 'Out of rotation — cannot start new swaps.'
              : 'Suspended vehicles cannot start new swaps until reinstated.'}
          </p>
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <Text size="sm" c="dimmed">
          Make / model
        </Text>
        <Text size="sm">
          {vehicle.make} {vehicle.model_name}
        </Text>
        <Text size="sm" c="dimmed">
          Owner
        </Text>
        <Text size="sm">
          <Link
            to={`/operators/${vehicle.account_id}`}
            className="font-semibold text-[var(--pr)] hover:underline"
          >
            {vehicle.owner_name || vehicle.owner_kura_id || vehicle.account_id}
          </Link>
        </Text>
        <Text size="sm" c="dimmed">
          Mounted pack
        </Text>
        <Text size="sm">
          {vehicle.current_battery_id ? (
            <Link
              to={`/batteries/${vehicle.current_battery_id}`}
              className="font-semibold text-[var(--pr)] hover:underline"
            >
              {vehicle.current_battery_serial || 'Open pack'}
              {vehicle.current_battery_charge != null
                ? ` · ${vehicle.current_battery_charge}%`
                : ''}
            </Link>
          ) : (
            'None'
          )}
        </Text>
        <Text size="sm" c="dimmed">
          Hardware ID
        </Text>
        <Text size="sm">{vehicle.hardware_id || '—'}</Text>
        <Text size="sm" c="dimmed">
          VIN
        </Text>
        <Text size="sm">{vehicle.vin || '—'}</Text>
        <Text size="sm" c="dimmed">
          Updated
        </Text>
        <Text size="sm">
          {vehicle.updated_at
            ? new Date(vehicle.updated_at).toLocaleString()
            : '—'}
        </Text>
      </div>
      {qrPreview ? (
        <div>
          <Text size="sm" fw={600} mb={6}>
            Latest hull QR token
          </Text>
          <Code block className="break-all">
            {qrPreview}
          </Code>
        </div>
      ) : null}
    </div>
  )
}
