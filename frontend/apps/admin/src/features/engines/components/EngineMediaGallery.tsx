import { MediaThumbGallery } from '@shared/components'
import type { EngineMediaItem } from '../types'

type Props = {
  title: string
  description?: string
  items: EngineMediaItem[]
  emptyLabel?: string
}

export function EngineMediaGallery({
  title,
  description,
  items,
  emptyLabel,
}: Props) {
  return (
    <MediaThumbGallery
      title={title}
      description={description}
      emptyLabel={emptyLabel}
      items={items
        .filter((item) => Boolean(item.url))
        .map((item) => ({
          id: item.id,
          url: item.url as string,
          label: item.label,
          contentType: item.content_type ?? 'image/jpeg',
        }))}
    />
  )
}
