import { useEffect, useState } from 'react'
import { Button, Select, Text, useMantineColorScheme } from '@mantine/core'
import { useDebouncedValue } from '@mantine/hooks'
import { notifications } from '@mantine/notifications'
import { apiErrorMessage } from '@lib/api/auth'
import { IllustratedFormModal, LoadingState } from '@shared/components'
import { useFetchData } from '@shared/hooks/api'
import { illustrationSrc } from '@shared/illustrations/catalog'
import { useCooperatives } from '../operators/hooks/use-cooperatives'
import { VEHICLES_ENDPOINTS } from './constants'
import {
  useAssignVehicleDriver,
  useSetVehicleCooperative,
} from './hooks/use-vehicles'
import type { VehicleDetailApi } from './types'

type DriverOption = {
  id: string
  first_name?: string
  last_name?: string
  phone?: string | null
}

type AssignmentRow = {
  id: string
  driver_name: string
  driver_phone?: string | null
  starts_at: string
  ends_at?: string | null
}

function driverLabel(d: DriverOption): string {
  const name = `${d.first_name ?? ''} ${d.last_name ?? ''}`.trim()
  return name ? `${name} · ${d.phone ?? d.id.slice(0, 8)}` : (d.phone ?? d.id)
}

function useIllustration(id: Parameters<typeof illustrationSrc>[0]) {
  const { colorScheme } = useMantineColorScheme()
  return illustrationSrc(id, colorScheme === 'dark' ? 'dark' : 'light')
}

type ModalProps = {
  vehicle: VehicleDetailApi
  opened: boolean
  onClose: () => void
  onDone: () => void
}

/** Take Action → Assign driver: search the account's drivers on the server. */
export function VehicleAssignDriverModal({
  vehicle,
  opened,
  onClose,
  onDone,
}: ModalProps) {
  const illustration = useIllustration('assigned-agent')
  const [driverId, setDriverId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [debounced] = useDebouncedValue(search, 300)
  useEffect(() => {
    if (opened) setDriverId(vehicle.assigned_driver_id ?? null)
  }, [opened, vehicle.assigned_driver_id])

  const drivers = useFetchData<{ results: DriverOption[] }>(
    '/drivers/',
    {
      account: vehicle.account_id,
      page_size: 25,
      ...(debounced.trim() ? { search: debounced.trim() } : {}),
    },
    { enabled: opened, keepPreviousData: true, staleTime: 30_000 },
  )
  const options = (drivers.data?.results ?? []).map((d) => ({
    value: d.id,
    label: driverLabel(d),
  }))
  // Keep the current driver selectable even when the search hides them.
  if (
    vehicle.assigned_driver_id &&
    !options.some((o) => o.value === vehicle.assigned_driver_id)
  ) {
    options.unshift({
      value: vehicle.assigned_driver_id,
      label: vehicle.assigned_driver_name ?? 'Current driver',
    })
  }
  const assign = useAssignVehicleDriver(vehicle.id)

  return (
    <IllustratedFormModal
      opened={opened}
      onClose={onClose}
      illustration={illustration}
      title="Assign driver"
      description="Pick who rides this vehicle. Leave it empty so any driver on the account can book it."
    >
      <Select
        w="100%"
        label="Driver"
        placeholder="Search by name or phone"
        searchable
        clearable
        data={options}
        value={driverId}
        onChange={setDriverId}
        searchValue={search}
        onSearchChange={setSearch}
        filter={({ options: all }) => all}
        nothingFoundMessage={drivers.isFetching ? 'Searching…' : 'No drivers on this account'}
        disabled={assign.isPending}
      />
      <Button
        color="brand"
        loading={assign.isPending}
        disabled={driverId === (vehicle.assigned_driver_id ?? null)}
        onClick={async () => {
          try {
            await assign.mutateAsync({ driver_id: driverId })
            notifications.show({
              color: 'teal',
              message: driverId ? 'Driver assigned.' : 'Assignment cleared.',
            })
            onClose()
            onDone()
          } catch (err) {
            notifications.show({
              color: 'red',
              message: apiErrorMessage(err, 'Could not update assignment'),
            })
          }
        }}
      >
        {driverId || !vehicle.assigned_driver_id ? 'Assign driver' : 'Clear assignment'}
      </Button>
    </IllustratedFormModal>
  )
}

/** Take Action → Set chairman: which chairman's group owns this vehicle. */
export function VehicleChairmanModal({
  vehicle,
  opened,
  onClose,
  onDone,
}: ModalProps) {
  const illustration = useIllustration('record-saved')
  const [coopId, setCoopId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [debounced] = useDebouncedValue(search, 300)
  useEffect(() => {
    if (opened) setCoopId(vehicle.cooperative_id ?? null)
  }, [opened, vehicle.cooperative_id])

  const coops = useCooperatives({ enabled: opened, search: debounced.trim() })
  const options = [...coops.options]
  if (vehicle.cooperative_id && !options.some((o) => o.value === vehicle.cooperative_id)) {
    options.unshift({
      value: vehicle.cooperative_id,
      label: vehicle.cooperative_name ?? 'Current chairman',
    })
  }
  const save = useSetVehicleCooperative(vehicle.id)

  return (
    <IllustratedFormModal
      opened={opened}
      onClose={onClose}
      illustration={illustration}
      title="Set chairman"
      description="The chairman's group that owns this vehicle. Reports count its swaps and money under them from now on."
    >
      <Select
        w="100%"
        label="Chairman group"
        placeholder="Search groups"
        searchable
        clearable
        data={options}
        value={coopId}
        onChange={setCoopId}
        searchValue={search}
        onSearchChange={setSearch}
        filter={({ options: all }) => all}
        nothingFoundMessage={coops.isFetching ? 'Searching…' : 'No groups found'}
        disabled={save.isPending}
      />
      <Button
        color="brand"
        loading={save.isPending}
        disabled={coopId === (vehicle.cooperative_id ?? null)}
        onClick={async () => {
          try {
            await save.mutateAsync({ cooperative_id: coopId })
            notifications.show({
              color: 'teal',
              message: coopId ? 'Chairman set.' : 'Chairman removed.',
            })
            onClose()
            onDone()
          } catch (err) {
            notifications.show({
              color: 'red',
              message: apiErrorMessage(err, 'Could not set chairman'),
            })
          }
        }}
      >
        {coopId || !vehicle.cooperative_id ? 'Save chairman' : 'Remove chairman'}
      </Button>
    </IllustratedFormModal>
  )
}

/** Read-only list of who has ridden this vehicle. */
export function VehicleAssignmentHistory({ vehicleId }: { vehicleId: string }) {
  const history = useFetchData<AssignmentRow[]>(
    VEHICLES_ENDPOINTS.assignments(vehicleId),
    undefined,
    { staleTime: 15_000 },
  )
  const rows = history.data ?? []
  const when = (iso: string) =>
    new Date(iso).toLocaleString('en-GB', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    })
  return (
    <div className="rounded-[12px] border border-[var(--bd)] bg-[var(--in)] p-3.5">
      <Text size="sm" fw={600} className="text-[var(--tx)]">
        Assignment history
      </Text>
      {history.isPending ? (
        <LoadingState variant="inline" cols={3} rows={3} />
      ) : rows.length === 0 ? (
        <Text size="xs" c="dimmed" mt="sm">
          No assignments yet.
        </Text>
      ) : (
        <ul className="mt-2 space-y-2">
          {rows.slice(0, 8).map((row) => (
            <li
              key={row.id}
              className="border-b border-[var(--bd)] pb-2 text-[12px] last:border-0"
            >
              <span className="font-semibold text-[var(--tx)]">{row.driver_name}</span>
              {row.driver_phone ? (
                <span className="ml-1 text-[var(--mu)]">{row.driver_phone}</span>
              ) : null}
              <div className="text-[var(--mu)]">
                {when(row.starts_at)}
                {row.ends_at ? ` → ${when(row.ends_at)}` : ' · current'}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
