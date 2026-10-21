import React from 'react'
import { notifications } from '@mantine/notifications'
import { apiErrorMessage } from '../../../lib/api/auth'
import {
  useAssignVehicleDriver,
  useFleetDrivers,
  type FleetDriverRow,
} from '../hooks/use-fleet-drivers'

function driverName(d: FleetDriverRow) {
  const n = `${d.first_name ?? ''} ${d.last_name ?? ''}`.trim()
  return n || d.phone || d.id.slice(0, 8)
}

export function FleetAssignSheet({
  accountId,
  vehicleId,
  vehicleLabel,
  currentDriverId,
  onClose,
  onAssigned,
}: {
  accountId: string
  vehicleId: string
  vehicleLabel: string
  currentDriverId?: string | null
  onClose: () => void
  onAssigned: () => void
}) {
  const { drivers, isPending } = useFleetDrivers(accountId)
  const assign = useAssignVehicleDriver(vehicleId)

  const pick = async (driverId: string | null) => {
    try {
      await assign.mutateAsync(driverId)
      notifications.show({
        color: 'teal',
        message: driverId ? 'Driver assigned' : 'Assignment cleared',
      })
      onAssigned()
      onClose()
    } catch (err) {
      notifications.show({
        color: 'red',
        message: apiErrorMessage(err, 'Assign failed'),
      })
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/40 p-3 sm:items-center">
      <div className="w-full max-w-md rounded-2xl bg-[var(--kura-bg-elevated)] p-4 shadow-xl">
        <div className="mb-3 flex items-start justify-between gap-2">
          <div>
            <h3 className="text-[15px] font-bold text-[var(--kura-text)]">Assign driver</h3>
            <p className="text-[12px] text-[var(--kura-muted)]">{vehicleLabel}</p>
          </div>
          <button
            type="button"
            className="text-[12px] font-bold text-[var(--kura-muted)]"
            onClick={onClose}
          >
            Close
          </button>
        </div>

        {isPending ? (
          <div className="h-20 animate-pulse rounded-xl bg-[var(--kura-border)]/40" />
        ) : (
          <ul className="flex max-h-[50vh] flex-col gap-1.5 overflow-y-auto">
            <li>
              <button
                type="button"
                disabled={assign.isPending}
                className="w-full rounded-xl border border-[var(--kura-border)] px-3 py-2.5 text-left text-[13px] font-semibold text-[var(--kura-text)]"
                onClick={() => pick(null)}
              >
                Any driver (clear lock)
              </button>
            </li>
            {drivers.map((d) => (
              <li key={d.id}>
                <button
                  type="button"
                  disabled={assign.isPending || d.status !== 'ACTIVE'}
                  className={`w-full rounded-xl border px-3 py-2.5 text-left text-[13px] font-semibold ${
                    currentDriverId === d.id
                      ? 'border-[var(--kura-teal)] bg-[var(--kura-teal)]/10 text-[var(--kura-text)]'
                      : 'border-[var(--kura-border)] text-[var(--kura-text)]'
                  } disabled:opacity-50`}
                  onClick={() => pick(d.id)}
                >
                  {driverName(d)}
                  <span className="mt-0.5 block text-[11px] font-normal text-[var(--kura-muted)]">
                    {d.phone || d.status}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
