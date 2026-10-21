import { useState } from 'react'
import { Button, Select, TextInput } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import {
  DynamicTableSection,
  LoadingState,
  TableStatusBadge,
  type TableHeader,
} from '@shared/components'
import { apiErrorMessage } from '@lib/api/auth'
import {
  useEnqueueVehicleCommand,
  useRotateVehicleIotKey,
  useVehicleCommands,
  type VehicleCommandRow,
} from './hooks/use-vehicles'

const KIND_OPTIONS = [
  { value: 'ENABLE_DRIVING', label: 'Enable driving' },
  { value: 'DISABLE_DRIVING', label: 'Immobilize / disable' },
  { value: 'REQUEST_STATE', label: 'Request state' },
  { value: 'UNLOCK_BATTERY', label: 'Unlock battery' },
  { value: 'DRAW_ATTENTION', label: 'Locate (horn/lights)' },
]

const HEADERS: TableHeader[] = [
  { key: 'when', label: 'QUEUED' },
  { key: 'kind', label: 'COMMAND' },
  { key: 'note', label: 'NOTE' },
  { key: 'status', label: 'STATUS' },
]

function statusTone(status: string) {
  if (status === 'ACKED') return 'success' as const
  if (status === 'FAILED' || status === 'CANCELLED') return 'danger' as const
  if (status === 'SENT') return 'warning' as const
  return 'default' as const
}

function formatWhen(iso: string) {
  try {
    return new Date(iso).toLocaleString()
  } catch {
    return iso
  }
}

export function VehicleVcuPanel({
  vehicleId,
  canCommand,
  canRotateIot,
}: {
  vehicleId: string
  canCommand: boolean
  canRotateIot: boolean
}) {
  const { commands, isPending, refetch } = useVehicleCommands(vehicleId)
  const enqueue = useEnqueueVehicleCommand(vehicleId)
  const rotate = useRotateVehicleIotKey(vehicleId)
  const [kind, setKind] = useState('REQUEST_STATE')
  const [note, setNote] = useState('')
  const [iotKey, setIotKey] = useState<string | null>(null)

  if (isPending) return <LoadingState variant="inline" cols={4} rows={5} />

  return (
    <div className="flex flex-col gap-4">
      {canCommand ? (
        <div className="flex flex-col gap-2 rounded-[12px] border border-[var(--bd)] bg-[var(--sf)] p-3 sm:flex-row sm:items-end">
          <Select
            className="flex-1"
            label="Soft VCU command"
            data={KIND_OPTIONS}
            value={kind}
            onChange={(v) => v && setKind(v)}
          />
          <TextInput
            className="flex-1"
            label="Note"
            value={note}
            onChange={(e) => setNote(e.currentTarget.value)}
            placeholder="Optional"
          />
          <Button
            className="bg-[var(--pr)]"
            loading={enqueue.isPending}
            onClick={async () => {
              try {
                await enqueue.mutateAsync({
                  kind,
                  ...(note.trim() ? { note: note.trim() } : {}),
                })
                setNote('')
                await refetch()
                notifications.show({ color: 'teal', message: 'Command queued' })
              } catch (err) {
                notifications.show({
                  color: 'red',
                  message: apiErrorMessage(err, 'Queue failed'),
                })
              }
            }}
          >
            Queue
          </Button>
        </div>
      ) : null}

      {canRotateIot ? (
        <div className="flex flex-col gap-2 rounded-[12px] border border-[var(--bd)] bg-[var(--in)] p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-[12px] text-[var(--mu)]">
              Rotate telemetry API key — plaintext shown once.
            </p>
            <Button
              variant="default"
              loading={rotate.isPending}
              onClick={async () => {
                try {
                  const res = await rotate.mutateAsync({})
                  setIotKey(res.api_key)
                  notifications.show({ color: 'teal', message: 'IoT key rotated' })
                } catch (err) {
                  notifications.show({
                    color: 'red',
                    message: apiErrorMessage(err, 'Rotate failed'),
                  })
                }
              }}
            >
              Rotate IoT key
            </Button>
          </div>
          {iotKey ? (
            <code className="break-all rounded-lg bg-[var(--sf)] px-2 py-1.5 font-mono text-[11px] text-[var(--tx)]">
              {iotKey}
            </code>
          ) : null}
        </div>
      ) : null}

      <DynamicTableSection<VehicleCommandRow>
        variant="embedded"
        headers={HEADERS}
        data={commands}
        getRowKey={(row) => row.id}
        showRowAction={false}
        toolbar={{ title: 'Command queue', showFilter: false }}
        renderItems={(row) => [
          <span key="when" className="text-xs text-[var(--mu)]">
            {formatWhen(row.created_at)}
          </span>,
          <span key="kind" className="text-xs font-bold text-[var(--tx)]">
            {row.kind}
          </span>,
          <span key="note" className="max-w-[200px] truncate text-xs text-[var(--mu)]">
            {row.note || row.error || '—'}
          </span>,
          <TableStatusBadge
            key="st"
            label={row.status}
            tone={statusTone(row.status)}
          />,
        ]}
      />
    </div>
  )
}
