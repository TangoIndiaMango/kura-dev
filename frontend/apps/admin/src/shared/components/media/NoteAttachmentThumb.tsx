import { useState } from 'react'
import { FilePreviewModal, RevealImage } from '@shared/components'

type Props = {
  url: string
  label?: string
  contentType?: string | null
}

/** Compact thumb under a note/activity row — opens FilePreviewModal. */
export function NoteAttachmentThumb({ url, label, contentType }: Props) {
  const [open, setOpen] = useState(false)
  const title = label || 'Attachment'
  const preferImage =
    !contentType || contentType.toLowerCase().startsWith('image/')

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-2 block w-full max-w-[220px] overflow-hidden rounded-[8px] border border-[var(--bd)] bg-[var(--sf)] text-left transition hover:border-[var(--pr)]"
      >
        <div className="aspect-[4/3] w-full overflow-hidden bg-[var(--in)]">
          <RevealImage
            src={url}
            alt={title}
            fit="cover"
            h="100%"
            w="100%"
          />
        </div>
        <div className="truncate px-2 py-1 text-[10px] font-semibold text-[var(--mu)]">
          {title} · tap to enlarge
        </div>
      </button>
      <FilePreviewModal
        opened={open}
        onClose={() => setOpen(false)}
        url={url}
        title={title}
        preferImage={preferImage}
        contentType={contentType}
      />
    </>
  )
}
