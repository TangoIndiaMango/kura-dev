import { useEffect, useMemo, useState } from 'react'
import { Alert, Button, Group, Select, Skeleton, Text, TextInput, useMantineColorScheme } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { IllustratedFormModal } from '@shared/components'
import { illustrationSrc } from '@shared/illustrations/catalog'
import { apiErrorMessage } from '@lib/api/auth'
import { useHubSlots } from '../hooks/use-hubs'
import { READY_CHARGE_PCT, usePacksWaitingAtHub, useReceiveBattery } from '../hooks/use-bay-charging'
import { ChargeInput } from './ChargeInput'
import { LOCATION_LABEL } from './bayFormat'

const FIRST_FREE = 'first'

/**
 * Put packs that arrived at a hub (new, transferred in, back from the
 * workshop) into bays. Stays open after each one so a delivery of several
 * packs can be received in a row.
 */
export function BayReceiveModal({
  opened,
  onClose,
  hubId,
  presetBay,
  presetBatteryId,
}: {
  opened: boolean
  onClose: () => void
  hubId: string
  /** Opened from an empty bay: put the pack there. */
  presetBay?: number | null
  /** Opened from a pack's page: receive that pack. */
  presetBatteryId?: string | null
}) {
  const { colorScheme } = useMantineColorScheme()
  const theme = colorScheme === 'dark' ? 'dark' : 'light'
  const { waiting, isPending } = usePacksWaitingAtHub(hubId, opened)
  const { slots, isPending: slotsPending } = useHubSlots(hubId, { enabled: opened })
  const receive = useReceiveBattery(hubId, presetBatteryId)
  const [packId, setPackId] = useState<string | null>(null)
  const [bay, setBay] = useState<string>(FIRST_FREE)
  const [pct, setPct] = useState<number | null>(null)
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<string[]>([])

  useEffect(() => {
    if (!opened) return
    setPackId(presetBatteryId ?? null)
    setBay(presetBay ? String(presetBay) : FIRST_FREE)
    setPct(null)
    setNote('')
    setError(null)
    setDone([])
  }, [opened, presetBatteryId, presetBay])

  const emptyBays = useMemo(() => slots.filter((s) => !s.battery_id).map((s) => s.slot_no), [slots])
  const packOptions = waiting.map((b) => ({
    value: b.id,
    label: `${b.serial} · ${b.battery_type_name} · ${b.charge_pct}% · ${LOCATION_LABEL[b.custodian_type] ?? b.custodian_type}`,
  }))
  const bayOptions = [
    { value: FIRST_FREE, label: emptyBays.length ? `First free bay (bay ${emptyBays[0]})` : 'No free bay' },
    ...emptyBays.map((n) => ({ value: String(n), label: `Bay ${n}` })),
  ]
  const pack = waiting.find((b) => b.id === packId) ?? null
  const loading = isPending || slotsPending
  const noBay = !loading && emptyBays.length === 0
  const canSave = Boolean(packId) && pct != null && !noBay && !receive.isPending

  const submit = async () => {
    if (!packId || pct == null) return
    setError(null)
    try {
      const res = await receive.mutateAsync({
        batteryId: packId,
        charge_pct: pct,
        ...(bay !== FIRST_FREE ? { slot_no: Number(bay) } : {}),
        ...(note.trim() ? { note: note.trim() } : {}),
      })
      const where = bay !== FIRST_FREE ? `bay ${bay}` : emptyBays[0] ? `bay ${emptyBays[0]}` : 'a free bay'
      const label = res.status === 'AVAILABLE' ? 'ready for swaps' : 'charging'
      notifications.show({ color: 'teal', title: res.serial, message: `In ${where} · ${label}` })
      setDone((d) => [...d, `${res.serial} → ${where}, ${label}`])
      setPackId(null)
      setBay(FIRST_FREE)
      setPct(null)
      setNote('')
      if (presetBatteryId || presetBay || waiting.length <= 1) onClose()
    } catch (err) {
      setError(apiErrorMessage(err, 'The pack was not received. Try again.'))
    }
  }

  return (
    <IllustratedFormModal
      opened={opened}
      onClose={receive.isPending ? () => undefined : onClose}
      illustration={illustrationSrc('battery-transferred', theme)}
      title="Receive into bay"
      description="Packs that arrived at this hub go into a bay. Enter the charge you see; a pack that's ready goes straight back on sale."
    >
      {loading ? (
        <div className="flex w-full flex-col gap-3">
          <Skeleton height={36} radius="md" />
          <Skeleton height={36} radius="md" />
          <Skeleton height={80} radius="md" />
        </div>
      ) : waiting.length === 0 && done.length === 0 ? (
        <Alert color="gray" variant="light" w="100%">
          No packs are waiting at this hub. New packs and packs transferred here show up in this list.
        </Alert>
      ) : (
        <>
          {done.length ? (
            <Alert color="teal" variant="light" w="100%" title={`${done.length} received`}>
              {done.map((d) => (
                <Text key={d} fz="xs">
                  {d}
                </Text>
              ))}
            </Alert>
          ) : null}
          <Select
            w="100%"
            label="Pack"
            placeholder={waiting.length ? 'Pick the pack in your hand' : 'All packs received'}
            data={packOptions}
            value={packId}
            onChange={setPackId}
            searchable
            disabled={Boolean(presetBatteryId) || receive.isPending || !waiting.length}
            nothingFoundMessage="No pack with that serial"
          />
          <Select
            w="100%"
            mt="sm"
            label="Bay"
            data={bayOptions}
            value={bay}
            onChange={(v) => setBay(v ?? FIRST_FREE)}
            disabled={noBay || receive.isPending}
            allowDeselect={false}
          />
          {noBay ? (
            <Alert mt="sm" color="yellow" variant="light" w="100%">
              Every bay has a pack. Issue or move one out before receiving more.
            </Alert>
          ) : null}
          <div className="mt-4 w-full">
            <ChargeInput value={pct} onChange={setPct} disabled={!pack || receive.isPending} />
          </div>
          <TextInput
            w="100%"
            mt="md"
            label="Note (optional)"
            placeholder="e.g. delivered from Yaba"
            maxLength={300}
            value={note}
            disabled={receive.isPending}
            onChange={(e) => setNote(e.currentTarget.value)}
          />
          {pct != null && pack ? (
            <Text mt="sm" fz="sm" c={pct >= READY_CHARGE_PCT ? 'teal.7' : 'gray.7'}>
              {pct >= READY_CHARGE_PCT
                ? 'Goes into the bay ready for swaps.'
                : `Goes into the bay charging; it's released at ${READY_CHARGE_PCT}%.`}
            </Text>
          ) : null}
          {error ? (
            <Alert mt="md" color="red" variant="light" w="100%">
              {error}
            </Alert>
          ) : null}
          <Group mt="md" w="100%" grow>
            {done.length ? (
              <Button variant="default" onClick={onClose} disabled={receive.isPending}>
                Done
              </Button>
            ) : null}
            <Button color="brand" disabled={!canSave} loading={receive.isPending} onClick={submit}>
              Put in bay
            </Button>
          </Group>
        </>
      )}
    </IllustratedFormModal>
  )
}
