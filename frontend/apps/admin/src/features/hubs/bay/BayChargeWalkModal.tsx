import { useEffect, useMemo, useState } from 'react'
import { Alert, Badge, Button, Group, Modal, NumberInput, ScrollArea, Text } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { apiErrorMessage } from '@lib/api/auth'
import type { HubSlotApi } from '../types'
import { READY_CHARGE_PCT, useChargeReadings } from '../hooks/use-bay-charging'
import { isStale, readingAge } from './bayFormat'

type RowState = { value: number | null; error?: string; saved?: string }

/**
 * The walk along the bays: type the charge shown on each pack and save them
 * together. Only rows you fill in are sent; one bad row never loses the rest.
 * Releasing a pack early stays a one-pack action (it needs a reason).
 */
export function BayChargeWalkModal({
  opened,
  onClose,
  hubId,
  hubName,
  slots,
}: {
  opened: boolean
  onClose: () => void
  hubId: string
  hubName: string
  slots: HubSlotApi[]
}) {
  const save = useChargeReadings(hubId)
  const packs = useMemo(
    () =>
      slots
        .filter((s) => s.battery_id && ['CHARGING', 'AVAILABLE', 'RESERVED'].includes(s.battery_status ?? ''))
        // charging first, stalest reading first: what needs looking at
        .sort((a, b) => {
          const ca = a.battery_status === 'CHARGING' ? 0 : 1
          const cb = b.battery_status === 'CHARGING' ? 0 : 1
          if (ca !== cb) return ca - cb
          return (a.charge_observed_at ?? '').localeCompare(b.charge_observed_at ?? '')
        }),
    [slots],
  )
  const [rows, setRows] = useState<Record<string, RowState>>({})
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (opened) {
      setRows({})
      setError(null)
    }
  }, [opened])

  const set = (id: string, value: number | null) =>
    setRows((r) => ({ ...r, [id]: { value, error: undefined, saved: undefined } }))
  const filled = packs.filter((p) => rows[p.battery_id!]?.value != null && !rows[p.battery_id!]?.saved)
  const charging = packs.filter((p) => p.battery_status === 'CHARGING').length

  const submit = async () => {
    setError(null)
    try {
      const res = await save.mutateAsync({
        readings: filled.map((p) => ({ battery_id: p.battery_id!, charge_pct: rows[p.battery_id!]!.value! })),
      })
      setRows((r) => {
        const next = { ...r }
        for (const it of res.results) {
          const cur = next[it.battery_id] ?? { value: null }
          next[it.battery_id] = it.ok
            ? { ...cur, saved: it.status === 'AVAILABLE' ? 'Ready for swaps' : 'Saved' }
            : { ...cur, error: it.error ?? 'Did not save' }
        }
        return next
      })
      notifications.show({
        color: res.failed ? 'yellow' : 'teal',
        title: hubName,
        message: res.failed
          ? `${res.saved} saved · ${res.failed} didn't save, see the rows marked red`
          : `${res.saved} reading${res.saved === 1 ? '' : 's'} saved`,
      })
      if (!res.failed) onClose()
    } catch (err) {
      setError(apiErrorMessage(err, 'Nothing was saved. Check your connection and try again.'))
    }
  }

  return (
    <Modal
      opened={opened}
      onClose={save.isPending ? () => undefined : onClose}
      title={<Text fw={700}>Update charging · {hubName}</Text>}
      size="lg"
      centered
      scrollAreaComponent={ScrollArea.Autosize}
    >
      <Text fz="sm" c="dimmed" mb="md">
        Type the charge shown on each pack. Packs at {READY_CHARGE_PCT}% or more go back on sale. Leave a row
        empty to skip it. {charging} charging now.
      </Text>

      {packs.length === 0 ? (
        <Alert color="gray" variant="light">
          No packs in bays at this hub yet. Receive packs into bays first.
        </Alert>
      ) : (
        <div className="flex flex-col divide-y divide-[var(--bd)] rounded-[10px] border border-[var(--bd)]">
          {packs.map((p) => {
            const id = p.battery_id!
            const row = rows[id]
            const stale = p.battery_status === 'CHARGING' && isStale(p.charge_observed_at)
            return (
              <div key={id} className="flex flex-wrap items-center gap-3 px-3 py-2.5">
                <div className="w-12 text-[12px] font-bold text-[var(--mu)]">Bay {p.slot_no}</div>
                <div className="min-w-[150px] flex-1">
                  <Text fz="sm" fw={600}>
                    {p.battery_serial}
                  </Text>
                  <Text fz="xs" c={stale ? 'orange.7' : 'dimmed'}>
                    {p.battery_charge_pct ?? '—'}% · {readingAge(p.charge_observed_at)}
                    {stale ? ' · check it' : ''}
                  </Text>
                </div>
                <Badge
                  variant="light"
                  color={p.battery_status === 'CHARGING' ? 'yellow' : p.battery_status === 'RESERVED' ? 'grape' : 'teal'}
                >
                  {p.battery_status === 'AVAILABLE' ? 'Ready' : p.battery_status?.toLowerCase()}
                </Badge>
                <NumberInput
                  w={92}
                  size="xs"
                  placeholder="%"
                  suffix="%"
                  min={0}
                  max={100}
                  clampBehavior="strict"
                  allowDecimal={false}
                  value={row?.value ?? ''}
                  disabled={save.isPending || Boolean(row?.saved)}
                  error={row?.error ? true : undefined}
                  onChange={(v) => set(id, v === '' ? null : Number(v))}
                />
                <Button
                  size="compact-xs"
                  radius="xl"
                  variant="default"
                  disabled={save.isPending || Boolean(row?.saved)}
                  onClick={() => set(id, 100)}
                >
                  Full
                </Button>
                {row?.saved ? <Text fz="xs" c="teal.7" w="100%">✓ {row.saved}</Text> : null}
                {row?.error ? <Text fz="xs" c="red.7" w="100%">{row.error}</Text> : null}
              </div>
            )
          })}
        </div>
      )}

      <Text fz="xs" c="dimmed" mt="sm">
        Your name is saved with every reading. Readings that climb faster than a pack can charge are flagged for
        review.
      </Text>
      {error ? (
        <Alert mt="md" color="red" variant="light">
          {error}
        </Alert>
      ) : null}
      <Group justify="flex-end" mt="md">
        <Button variant="default" onClick={onClose} disabled={save.isPending}>
          Close
        </Button>
        <Button color="brand" disabled={!filled.length} loading={save.isPending} onClick={submit}>
          Save {filled.length || ''} reading{filled.length === 1 ? '' : 's'}
        </Button>
      </Group>
    </Modal>
  )
}
