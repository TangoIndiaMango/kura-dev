import { useState } from 'react'
import { Button, Select, TextInput, useMantineColorScheme } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { IllustratedFormModal } from '@shared/components'
import { illustrationSrc } from '@shared/illustrations/catalog'
import { apiErrorMessage } from '@lib/api/auth'
import type { UseMutationResult } from '@tanstack/react-query'
import type { BatteryDetailApi, BatteryTransferPayload } from './types'

type HubOption = { value: string; label: string }
type Dest = BatteryTransferPayload['destination']

const DEST_OPTIONS: Array<{ value: Dest; label: string }> = [
  { value: 'hub', label: 'Hub' },
  { value: 'workshop', label: 'Workshop' },
  { value: 'transit', label: 'Transit' },
]

export function BatteryTransferModal({
  opened,
  onClose,
  currentHubId,
  hubOptions,
  transferMutation,
  onSuccess,
}: {
  opened: boolean
  onClose: () => void
  currentHubId: string | null
  hubOptions: HubOption[]
  transferMutation: UseMutationResult<
    BatteryDetailApi,
    Error,
    BatteryTransferPayload
  >
  onSuccess: () => void
}) {
  const { colorScheme } = useMantineColorScheme()
  const themeKey = colorScheme === 'dark' ? 'dark' : 'light'
  const [destination, setDestination] = useState<Dest | null>('hub')
  const [draftHub, setDraftHub] = useState<string | null>(null)
  const [note, setNote] = useState('')

  const needsHub = destination === 'hub'
  const canSubmit =
    Boolean(destination) &&
    (!needsHub || Boolean(draftHub)) &&
    !transferMutation.isPending

  return (
    <IllustratedFormModal
      opened={opened}
      onClose={onClose}
      illustration={illustrationSrc('battery-transferred', themeKey)}
      title="Transfer custody"
      description="Moves custody via transfer — destination may be hub, workshop, or transit."
    >
      <Select
        label="Destination"
        data={DEST_OPTIONS}
        value={destination}
        onChange={(v) => setDestination((v as Dest | null) ?? 'hub')}
      />
      {needsHub ? (
        <Select
          mt="sm"
          label="Destination hub"
          placeholder="Select a hub"
          data={hubOptions.filter((h) => h.value !== currentHubId)}
          value={draftHub}
          onChange={setDraftHub}
          searchable
          nothingFoundMessage="No hubs"
        />
      ) : null}
      <TextInput
        mt="sm"
        label="Note (optional)"
        value={note}
        onChange={(e) => setNote(e.currentTarget.value)}
      />
      <Button
        mt="md"
        color="brand"
        disabled={!canSubmit}
        loading={transferMutation.isPending}
        onClick={async () => {
          if (!destination) return
          if (needsHub && !draftHub) return
          try {
            await transferMutation.mutateAsync({
              destination,
              ...(needsHub && draftHub ? { hub_id: draftHub } : {}),
              ...(note.trim() ? { note: note.trim() } : {}),
            })
            setDraftHub(null)
            setNote('')
            setDestination('hub')
            onClose()
            onSuccess()
          } catch (err) {
            notifications.show({
              color: 'red',
              message: apiErrorMessage(err, 'Transfer failed'),
            })
          }
        }}
      >
        Transfer
      </Button>
    </IllustratedFormModal>
  )
}
