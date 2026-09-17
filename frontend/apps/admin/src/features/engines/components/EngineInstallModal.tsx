import { useEffect, useState } from 'react'
import { Button, Select, Text, useMantineColorScheme } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import {
  IllustratedFormModal,
  MediaDropzone,
} from '@shared/components'
import { illustrationSrc } from '@shared/illustrations/catalog'
import { uploadMedia } from '@lib/api/media'
import { apiErrorMessage } from '@lib/api/auth'
import { useEBoarders } from '../hooks/use-eboarders'

type Props = {
  opened: boolean
  busy?: boolean
  initialSerial?: string
  onClose: () => void
  onConfirm: (payload: {
    eboarder_id?: string
    eboarder_serial: string
    photo_asset_ids: string[]
  }) => void | Promise<void>
}

export function EngineInstallModal({
  opened,
  busy = false,
  initialSerial = '',
  onClose,
  onConfirm,
}: Props) {
  const { colorScheme } = useMantineColorScheme()
  const themeKey = colorScheme === 'dark' ? 'dark' : 'light'
  const { rows: stock } = useEBoarders(
    { status: 'IN_STOCK', page: 1, page_size: 100 },
    { enabled: opened },
  )
  const [eboarderId, setEboarderId] = useState<string | null>(null)
  const [photo, setPhoto] = useState<File | null>(null)
  const [photo2, setPhoto2] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    if (!opened) return
    const match = stock.find(
      (r) => r.serial.toUpperCase() === initialSerial.toUpperCase(),
    )
    setEboarderId(match?.id ?? null)
  }, [opened, initialSerial, stock])

  const reset = () => {
    setEboarderId(null)
    setPhoto(null)
    setPhoto2(null)
    setUploading(false)
  }

  const selected = stock.find((r) => r.id === eboarderId)

  const submit = async () => {
    if (!selected) {
      notifications.show({
        color: 'red',
        message: 'Select an in-stock e-boarder.',
      })
      return
    }
    setUploading(true)
    try {
      const uploads = await Promise.all([
        photo ? uploadMedia(photo, 'engines') : Promise.resolve(null),
        photo2 ? uploadMedia(photo2, 'engines') : Promise.resolve(null),
      ])
      const ids = uploads.filter(Boolean).map((u) => u!.id)
      await onConfirm({
        eboarder_id: selected.id,
        eboarder_serial: selected.serial,
        photo_asset_ids: ids,
      })
      reset()
    } catch (err) {
      notifications.show({ color: 'red', message: apiErrorMessage(err) })
    } finally {
      setUploading(false)
    }
  }

  const locked = uploading || busy

  return (
    <IllustratedFormModal
      opened={opened}
      onClose={() => {
        if (locked) return
        reset()
        onClose()
      }}
      illustration={illustrationSrc('confirm-action', themeKey)}
      title="Mark e-boarder installed"
      description="Pick a unit from stock for this hull, then run the safety checklist."
    >
      <Select
        label="E-boarder from stock"
        placeholder={stock.length ? 'Select serial' : 'No units in stock'}
        required
        searchable
        data={stock.map((r) => ({
          value: r.id,
          label: `${r.serial} · ${r.make} ${r.model} · ${r.rated_kw} kW`,
        }))}
        value={eboarderId}
        onChange={setEboarderId}
        mb="sm"
      />
      <Text size="sm" c="dimmed" mb="sm">
        Optional photos of the mount on the hull. PNG or JPG, max 5 MB each.
      </Text>
      <div className="grid gap-3 sm:grid-cols-2">
        <MediaDropzone
          value={photo}
          onChange={setPhoto}
          label="Install photo"
          description="Optional · PNG or JPG · max 5 MB"
          accept={['image/png', 'image/jpeg']}
          maxSizeMB={5}
          minHeight={110}
        />
        <MediaDropzone
          value={photo2}
          onChange={setPhoto2}
          label="Second photo"
          description="Optional"
          accept={['image/png', 'image/jpeg']}
          maxSizeMB={5}
          minHeight={110}
        />
      </div>
      <Button
        mt="md"
        fullWidth
        className="bg-[var(--pr)] hover:opacity-90"
        loading={locked}
        disabled={locked || !eboarderId}
        onClick={() => {
          submit().catch(() => undefined)
        }}
      >
        Mark installed
      </Button>
    </IllustratedFormModal>
  )
}
