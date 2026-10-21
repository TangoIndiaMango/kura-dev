import { useMemo, useState } from 'react'
import { Button, NumberInput } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { axiosInstance } from '@lib/api/client'
import { apiErrorMessage } from '@lib/api/auth'
import { useFetchData } from '@shared/hooks/api'
import {
  DynamicTableSection,
  LoadingState,
  TableStatusBadge,
  type TableHeader,
} from '@shared/components'
import { formatNaira } from '@shared/utils/currency'
import { useCapabilities } from '../auth/useCapabilities'
import { OperatorDriverAttachForm } from './OperatorDriverAttachForm'
import type { OperatorRecord } from './types'

type DriverRow = {
  id: string
  phone?: string | null
  first_name?: string
  last_name?: string
  status: string
  daily_swap_limit?: number | null
  daily_spend_kobo_limit?: number | null
}

type DriversPage = { results: DriverRow[] }

const HEADERS: TableHeader[] = [
  { key: 'name', label: 'DRIVER' },
  { key: 'phone', label: 'PHONE' },
  { key: 'swaps', label: 'DAILY SWAPS' },
  { key: 'spend', label: 'DAILY SPEND' },
  { key: 'status', label: 'STATUS' },
]

function driverName(d: DriverRow): string {
  const n = `${d.first_name ?? ''} ${d.last_name ?? ''}`.trim()
  return n || d.phone || d.id.slice(0, 8)
}

export function OperatorDriversTab({ operator }: { operator: OperatorRecord }) {
  const { can } = useCapabilities()
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editSwaps, setEditSwaps] = useState<number | string>('')
  const [editSpend, setEditSpend] = useState<number | string>('')

  const driversKey = ['/drivers/', { account: operator.id, page_size: 50 }] as const
  const query = useFetchData<DriversPage>(
    '/drivers/',
    { account: operator.id, page_size: 50 },
    { enabled: Boolean(operator.id), staleTime: 30_000 },
  )
  const drivers = query.data?.results ?? []
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return drivers
    return drivers.filter((d) => {
      const hay = `${d.first_name ?? ''} ${d.last_name ?? ''} ${d.phone ?? ''}`.toLowerCase()
      return hay.includes(q)
    })
  }, [drivers, search])

  const refresh = () => qc.invalidateQueries({ queryKey: driversKey })

  const updateLimits = useMutation({
    mutationFn: async (driverId: string) => {
      const { data } = await axiosInstance.patch(`/drivers/${driverId}/`, {
        daily_swap_limit:
          editSwaps === '' || editSwaps == null ? null : Number(editSwaps),
        daily_spend_kobo_limit:
          editSpend === '' || editSpend == null
            ? null
            : Math.round(Number(editSpend) * 100),
      })
      return data
    },
    onSuccess: () => {
      notifications.show({ color: 'teal', message: 'Limits updated' })
      setEditingId(null)
      refresh()
    },
    onError: (err) => {
      notifications.show({
        color: 'red',
        message: apiErrorMessage(err, 'Could not update limits'),
      })
    },
  })

  if (query.isPending) return <LoadingState variant="inline" cols={5} rows={5} />
  if (query.isError) {
    return (
      <p className="text-[13px] text-[var(--mu)]">
        Could not load drivers (need accounts:read).
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {can('accounts:manage') ? (
        <OperatorDriverAttachForm
          accountId={operator.id}
          onAttached={refresh}
        />
      ) : null}

      <DynamicTableSection<DriverRow>
        variant="embedded"
        headers={HEADERS}
        data={filtered}
        getRowKey={(row) => row.id}
        toolbar={{
          title: 'Drivers',
          showFilter: false,
          searchQuery: search,
          onSearchChange: setSearch,
          searchPlaceholder: 'Search name or phone…',
        }}
        emptyTitle="No drivers"
        emptyMessage="Attach drivers to set soft daily limits and vehicle assignments."
        renderItems={(row) => {
          const editing = editingId === row.id
          return [
            <span key="n" className="text-xs font-semibold text-[var(--tx)]">
              {driverName(row)}
            </span>,
            <span key="p" className="font-mono text-xs text-[var(--mu)]">
              {row.phone || '—'}
            </span>,
            editing ? (
              <NumberInput
                key="sw"
                size="xs"
                min={1}
                placeholder="∞"
                value={editSwaps}
                onChange={setEditSwaps}
              />
            ) : (
              <span key="sw" className="text-xs tabular-nums text-[var(--tx)]">
                {row.daily_swap_limit ?? '∞'}
              </span>
            ),
            editing ? (
              <NumberInput
                key="sp"
                size="xs"
                min={0}
                placeholder="∞"
                decimalScale={0}
                value={editSpend}
                onChange={setEditSpend}
              />
            ) : (
              <span key="sp" className="text-xs tabular-nums text-[var(--tx)]">
                {row.daily_spend_kobo_limit == null
                  ? '∞'
                  : formatNaira(row.daily_spend_kobo_limit, {
                      fromKobo: true,
                      showDecimals: false,
                    })}
              </span>
            ),
            editing ? (
              <div key="st" className="flex gap-1">
                <Button
                  size="compact-xs"
                  loading={updateLimits.isPending}
                  onClick={() => updateLimits.mutate(row.id)}
                >
                  Save
                </Button>
                <Button
                  size="compact-xs"
                  variant="subtle"
                  onClick={() => setEditingId(null)}
                >
                  Cancel
                </Button>
              </div>
            ) : (
              <button
                key="st"
                type="button"
                className="text-left"
                onClick={() => {
                  if (!can('accounts:manage')) return
                  setEditingId(row.id)
                  setEditSwaps(row.daily_swap_limit ?? '')
                  setEditSpend(
                    row.daily_spend_kobo_limit == null
                      ? ''
                      : Math.round(row.daily_spend_kobo_limit / 100),
                  )
                }}
              >
                <TableStatusBadge
                  label={row.status}
                  tone={row.status === 'ACTIVE' ? 'success' : 'neutral'}
                />
              </button>
            ),
          ]
        }}
      />
    </div>
  )
}
