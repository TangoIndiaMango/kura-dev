import { useState } from 'react'
import { Button, Text, useMantineColorScheme } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import {
  IllustratedFormModal,
  MediaDropzone,
} from '@shared/components'
import { illustrationSrc } from '@shared/illustrations/catalog'
import { uploadMedia } from '@lib/api/media'
import { apiErrorMessage } from '@lib/api/auth'

type Props = {
  opened: boolean
  tag: string
  busy?: boolean
  onClose: () => void
  onConfirm: (payload: {
    photo_asset_ids: string[]
    signature_asset_id: string
  }) => void | Promise<void>
}

export function EngineReleaseModal({
  opened,
  tag,
  busy = false,
  onClose,
  onConfirm,
}: Props) {
  const { colorScheme } = useMantineColorScheme()
  const themeKey = colorScheme === 'dark' ? 'dark' : 'light'
  const [photo, setPhoto] = useState<File | null>(null)
  const [photo2, setPhoto2] = useState<File | null>(null)
  const [signature, setSignature] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)

  const reset = () => {
    setPhoto(null)
    setPhoto2(null)
    setSignature(null)
    setUploading(false)
  }

  const submit = async () => {
    if (!photo) {
      notifications.show({
        color: 'red',
        message: 'At least one release photo is required.',
      })
      return
    }
    if (!signature) {
      notifications.show({
        color: 'red',
        message: 'Release signature is required.',
      })
      return
    }
    setUploading(true)
    try {
      const [u1, u2, sig] = await Promise.all([
        uploadMedia(photo, 'engines'),
        photo2 ? uploadMedia(photo2, 'engines') : Promise.resolve(null),
        uploadMedia(signature, 'engines'),
      ])
      const ids = [u1, u2].filter(Boolean).map((u) => u!.id)
      await onConfirm({
        photo_asset_ids: ids,
        signature_asset_id: sig.id,
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
      title="Release this engine?"
      description={`Return ${tag} to the owner after case review. Photos and signature are required.`}
    >
      <Text size="sm" c="dimmed" mb="sm">
        Photos of the petrol unit at handover. PNG or JPG, max 5 MB each.
      </Text>
      <div className="grid gap-3 sm:grid-cols-2">
        <MediaDropzone
          value={photo}
          onChange={setPhoto}
          label="Release photo"
          description="Required · PNG or JPG · max 5 MB"
          accept={['image/png', 'image/jpeg']}
          maxSizeMB={5}
          minHeight={110}
        />
        <MediaDropzone
          value={photo2}
          onChange={setPhoto2}
          label="Second photo (optional)"
          description="Condition / handover"
          accept={['image/png', 'image/jpeg']}
          maxSizeMB={5}
          minHeight={110}
        />
      </div>
      <div className="mt-3">
        <MediaDropzone
          value={signature}
          onChange={setSignature}
          label="Owner signature"
          description="Required · signed release acknowledgement"
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
        disabled={locked || !photo || !signature}
        onClick={() => {
          submit().catch(() => undefined)
        }}
      >
        Release engine
      </Button>
    </IllustratedFormModal>
  )
}
