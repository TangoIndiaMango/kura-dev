import { useState } from 'react'
import { Text } from '@mantine/core'
import { FilePreviewModal } from './FilePreviewModal'
import { RevealImage } from './RevealImage'

export type MediaThumbItem = {
  id: string
  url: string
  label: string
  contentType?: string | null
}

type Props = {
  title?: string
  description?: string
  items: MediaThumbItem[]
  emptyLabel?: string
  columnsClassName?: string
}

export function MediaThumbGallery({
  title,
  description,
  items,
  emptyLabel,
  columnsClassName = 'grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4',
}: Props) {
  const [preview, setPreview] = useState<MediaThumbItem | null>(null)

  if (!items.length) {
    if (!emptyLabel) return null
    return (
      <section>
        {title ? (
          <Text fw={700} size="sm" className="text-[var(--tx)]">
            {title}
          </Text>
        ) : null}
        {description ? (
          <Text size="xs" c="dimmed" className="mt-1 mb-2">
            {description}
          </Text>
        ) : null}
        <Text size="sm" c="dimmed">
          {emptyLabel}
        </Text>
      </section>
    )
  }

  return (
    <section>
      {title ? (
        <Text fw={700} size="sm" className="text-[var(--tx)]">
          {title}
        </Text>
      ) : null}
      {description ? (
        <Text size="xs" c="dimmed" className="mt-1 mb-2">
          {description}
        </Text>
      ) : title ? (
        <div className="mb-2" />
      ) : null}
      <div className={`grid ${columnsClassName}`}>
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setPreview(item)}
            className="group overflow-hidden rounded-[10px] border border-[var(--bd)] bg-[var(--in)] text-left transition hover:border-[var(--pr)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--pr)]"
          >
            <div className="aspect-[4/3] w-full overflow-hidden bg-[var(--sf)]">
              <RevealImage
                src={item.url}
                alt={item.label}
                fit="cover"
                h="100%"
                w="100%"
              />
            </div>
            <div className="truncate px-2 py-1.5 text-[11px] font-semibold text-[var(--mu)] group-hover:text-[var(--tx)]">
              {item.label} · tap to enlarge
            </div>
          </button>
        ))}
      </div>
      <FilePreviewModal
        opened={Boolean(preview?.url)}
        onClose={() => setPreview(null)}
        url={preview?.url ?? null}
        title={preview?.label}
        preferImage={
          !preview?.contentType ||
          preview.contentType.toLowerCase().startsWith('image/')
        }
        contentType={preview?.contentType}
      />
    </section>
  )
}
