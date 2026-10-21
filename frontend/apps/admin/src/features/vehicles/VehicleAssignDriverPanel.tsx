import { useState } from 'react'
import { Button, Select, Text } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { apiErrorMessage } from '@lib/api/auth'
import { useFetchData } from '@shared/hooks/api'
import { LoadingState } from '@shared/components'
import { useAssignVehicleDriver } from './hooks/use-vehicles'
import type { VehicleDetailApi } from './types'

type DriverOption = {
  id: string
  first_name?: string
  last_name?: string
  phone?: string | null
}

type DriversPage = { results: DriverOption[] }

type AssignmentRow = {
  id: string
  driver_name: string
  driver_phone?: string | null
  starts_at: string
  ends_at?: string | null
  note?: string
}

function driverLabel(d: DriverOption): string {
  const name = `${d.first_name ?? ''} ${d.last_name ?? ''}`.trim()
  return name ? `${name} · ${d.phone ?? d.id.slice(0, 8)}` : (d.phone ?? d.id)
}

function formatWhen(iso: string): string {
  return new Date(iso).toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function VehicleAssignDriverPanel({
  vehicle,
  onDone,
}: {
  vehicle: VehicleDetailApi
  onDone: () => void
}) {
  const [driverId, setDriverId] = useState<string | null>(
    vehicle.assigned_driver_id ?? null,
  )
  const driversQuery = useFetchData<DriversPage>(
    '/drivers/',
    { account: vehicle.account_id, page_size: 100 },
    { enabled: Boolean(vehicle.account_id), staleTime: 30_000 },
  )
  const historyQuery = useFetchData<AssignmentRow[]>(
    `/mobility/vehicles/${vehicle.id}/assignments/`,
    undefined,
    { enabled: Boolean(vehicle.id), staleTime: 15_000 },
  )
  const assign = useAssignVehicleDriver(vehicle.id)
  const options = (driversQuery.data?.results ?? []).map((d) => ({
    value: d.id,
    label: driverLabel(d),
  }))
  const history = historyQuery.data ?? []

  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-[12px] border border-[var(--bd)] bg-[var(--in)] p-3.5">
        <Text size="sm" fw={600} className="text-[var(--tx)]">
          Assigned driver
        </Text>
        <Text size="xs" c="dimmed" mt={4}>
          Optional. Empty means any driver on this account may book this vehicle.
        </Text>
        <Select
          mt="sm"
          searchable
          clearable
          placeholder="Any account driver"
          data={options}
          value={driverId}
          onChange={setDriverId}
          disabled={assign.isPending}
        />
        <div className="mt-3 flex gap-2">
          <Button
            size="xs"
            loading={assign.isPending}
            onClick={() => {
              assign.mutate(
                { driver_id: driverId },
                {
                  onSuccess: () => {
                    notifications.show({
                      color: 'teal',
                      message: driverId
                        ? 'Driver assigned'
                        : 'Assignment cleared',
                    })
                    historyQuery.refetch()
                    onDone()
                  },
                  onError: (err) => {
                    notifications.show({
                      color: 'red',
                      message: apiErrorMessage(
                        err,
                        'Could not update assignment',
                      ),
                    })
                  },
                },
              )
            }}
          >
            Save
          </Button>
        </div>
      </div>

      <div className="rounded-[12px] border border-[var(--bd)] bg-[var(--in)] p-3.5">
        <Text size="sm" fw={600} className="text-[var(--tx)]">
          Assignment history
        </Text>
        {historyQuery.isPending ? (
          <LoadingState variant="inline" cols={3} rows={3} />
        ) : history.length === 0 ? (
          <Text size="xs" c="dimmed" mt="sm">
            No prior assignments.
          </Text>
        ) : (
          <ul className="mt-2 space-y-2">
            {history.slice(0, 8).map((row) => (
              <li
                key={row.id}
                className="border-b border-[var(--bd)] pb-2 text-[12px] last:border-0"
              >
                <span className="font-semibold text-[var(--tx)]">
                  {row.driver_name}
                </span>
                {row.driver_phone ? (
                  <span className="ml-1 text-[var(--mu)]">{row.driver_phone}</span>
                ) : null}
                <div className="text-[var(--mu)]">
                  {formatWhen(row.starts_at)}
                  {row.ends_at ? ` → ${formatWhen(row.ends_at)}` : ' · current'}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
