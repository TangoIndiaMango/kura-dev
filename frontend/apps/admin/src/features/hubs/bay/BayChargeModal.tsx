import { useEffect, useState } from 'react'
import { Alert, Button, Checkbox, Text, Textarea, useMantineColorScheme } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { IllustratedFormModal } from '@shared/components'
import { illustrationSrc } from '@shared/illustrations/catalog'
import { apiErrorMessage } from '@lib/api/auth'
import { READY_CHARGE_PCT, useRecordCharge } from '../hooks/use-bay-charging'
import { ChargeInput } from './ChargeInput'
import { readingAge, sourceLabel } from './bayFormat'

/** The pack a charge reading is for. */
export type BayPack = {
  id: string
  serial: string
  hubId: string | null
  bay?: number | null
  status: string | null
  chargePct: number | null
  observedAt?: string | null
  source?: string | null
  reservationCode?: string | null
}

/** Record one charge reading; at the ready mark the pack goes back on sale. */
export function BayChargeModal({
  opened,
  onClose,
  pack,
}: {
  opened: boolean
  onClose: () => void
  pack: BayPack | null
}) {
  const { colorScheme } = useMantineColorScheme()
  const theme = colorScheme === 'dark' ? 'dark' : 'light'
  const save = useRecordCharge(pack?.hubId, pack?.id)
  const [pct, setPct] = useState<number | null>(null)
  const [release, setRelease] = useState(false)
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!opened) return
    setPct(pack?.chargePct ?? null)
    setRelease(false)
    setReason('')
    setError(null)
  }, [opened, pack?.id, pack?.chargePct])

  if (!pack) return null
  const reserved = pack.status === 'RESERVED'
  const ready = pct != null && pct >= READY_CHARGE_PCT
  const early = !ready && release && !reserved
  const canSave = pct != null && !save.isPending && (!early || reason.trim().length >= 5)

  const outcome = reserved
    ? `Reserved${pack.reservationCode ? ` for ${pack.reservationCode}` : ''}: only the reading is saved.`
    : ready
      ? 'At this charge the pack is released for swaps.'
      : early
        ? 'The pack is released for swaps below the ready charge.'
        : 'The pack stays charging until it reaches the ready charge.'

  const submit = async () => {
    if (pct == null) return
    setError(null)
    try {
      const res = await save.mutateAsync({
        batteryId: pack.id,
        charge_pct: pct,
        ...(early ? { release: true, note: reason.trim() } : {}),
      })
      notifications.show({
        color: res.status === 'AVAILABLE' ? 'teal' : 'blue',
        title: pack.serial,
        message:
          res.status === 'AVAILABLE'
            ? early ? `${pct}% · released early, reason saved` : `${pct}% · ready for swaps`
            : `${pct}% · reading saved${reserved ? '' : ', still charging'}`,
      })
      onClose()
    } catch (err) {
      setError(apiErrorMessage(err, 'The reading did not save. Try again.'))
    }
  }

  return (
    <IllustratedFormModal
      opened={opened}
      onClose={save.isPending ? () => undefined : onClose}
      illustration={illustrationSrc(ready ? 'success-check' : 'syncing', theme)}
      title={`Record charge · ${pack.serial}`}
      description={
        `${pack.bay ? `Bay ${pack.bay} · ` : ''}Last reading ${pack.chargePct ?? '—'}% ` +
        `${readingAge(pack.observedAt)}${pack.source ? ` (${sourceLabel(pack.source)})` : ''}.`
      }
    >
      <ChargeInput value={pct} onChange={setPct} disabled={save.isPending} />

      {!ready && !reserved ? (
        <Checkbox
          mt="md"
          checked={release}
          disabled={save.isPending}
          onChange={(e) => setRelease(e.currentTarget.checked)}
          label="Release for swaps now"
          description={`Below ${READY_CHARGE_PCT}%, e.g. a rider is waiting. Needs a reason.`}
        />
      ) : null}
      {early ? (
        <Textarea
          mt="sm"
          w="100%"
          label="Reason"
          placeholder="Why it's released early"
          autosize
          minRows={2}
          maxLength={300}
          value={reason}
          disabled={save.isPending}
          onChange={(e) => setReason(e.currentTarget.value)}
          error={reason.length > 0 && reason.trim().length < 5 ? 'A few more words, please.' : undefined}
        />
      ) : null}

      <Text mt="md" fz="sm" c={ready ? 'teal.7' : 'gray.7'}>
        {outcome}
      </Text>
      <Text fz="xs" c="dimmed" mt={4}>
        Your name is saved with every reading. Readings that climb faster than a pack can charge are flagged for
        review.
      </Text>

      {error ? (
        <Alert mt="md" color="red" variant="light" w="100%">
          {error}
        </Alert>
      ) : null}

      <Button mt="md" color="brand" fullWidth disabled={!canSave} loading={save.isPending} onClick={submit}>
        {early ? 'Save and release' : 'Save reading'}
      </Button>
    </IllustratedFormModal>
  )
}
