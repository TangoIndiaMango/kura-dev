import { useState } from 'react'
import { Button, Textarea, useMantineColorScheme } from '@mantine/core'
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
  onClose: () => void
  busy?: boolean
  onSubmit: (input: {
    body: string
    attachment_asset_id?: string
  }) => Promise<void>
}

export function CaseNoteComposeModal({
  opened,
  onClose,
  busy = false,
  onSubmit,
}: Props) {
  const { colorScheme } = useMantineColorScheme()
  const themeKey = colorScheme === 'dark' ? 'dark' : 'light'
  const [draft, setDraft] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)

  const reset = () => {
    setDraft('')
    setFile(null)
    setUploading(false)
  }

  const submit = async () => {
    const body = draft.trim()
    if (!body && !file) return
    setUploading(true)
    try {
      let attachmentId: string | undefined
      if (file) {
        const uploaded = await uploadMedia(file, 'support')
        attachmentId = uploaded.id
      }
      await onSubmit({
        body,
        ...(attachmentId ? { attachment_asset_id: attachmentId } : {}),
      })
      reset()
      onClose()
    } catch (err) {
      notifications.show({
        color: 'red',
        message: apiErrorMessage(err),
      })
    } finally {
      setUploading(false)
    }
  }

  return (
    <IllustratedFormModal
      opened={opened}
      onClose={() => {
        if (uploading || busy) return
        reset()
        onClose()
      }}
      illustration={illustrationSrc('success-check', themeKey)}
      title="Add note"
      description="Visible on the case thread. Optional photo for evidence."
    >
      <Textarea
        label="Note"
        minRows={3}
        autosize
        value={draft}
        onChange={(e) => setDraft(e.currentTarget.value)}
        placeholder="What did ops find or ask?"
      />
      <div className="mt-3">
        <MediaDropzone
          value={file}
          onChange={setFile}
          label="Photo (optional)"
          description="PNG or JPG · max 5 MB"
          accept={['image/png', 'image/jpeg']}
          maxSizeMB={5}
          minHeight={120}
        />
      </div>
      <Button
        mt="md"
        fullWidth
        className="bg-[var(--pr)] hover:opacity-90"
        loading={uploading || busy}
        disabled={uploading || busy || (!draft.trim() && !file)}
        onClick={() => {
          submit()
        }}
      >
        Save note
      </Button>
    </IllustratedFormModal>
  )
}
