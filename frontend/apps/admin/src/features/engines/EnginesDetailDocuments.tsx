import { Text } from '@mantine/core'
import { EngineMediaGallery } from './components/EngineMediaGallery'
import type { EngineDetailApi, EngineMediaItem, RetrofitDetailApi } from './types'

function mediaList(
  items: EngineMediaItem[] | undefined,
  fallbackIds: string[] | undefined,
): EngineMediaItem[] {
  if (items?.length) return items
  return (fallbackIds ?? []).map((id) => ({
    id,
    url: null,
    label: id.split('/').pop() || id,
  }))
}

function asSingle(
  media: EngineMediaItem | null | undefined,
  id: string | undefined,
  fallbackLabel: string,
): EngineMediaItem[] {
  if (media) return [media]
  if (!id) return []
  return [{ id, url: null, label: id.split('/').pop() || fallbackLabel }]
}

type Props = {
  engine: EngineDetailApi
  retrofit: RetrofitDetailApi | null
}

export function EnginesDetailDocuments({ engine, retrofit }: Props) {
  const intake = mediaList(engine.intake_media, engine.intake_photos)
  const signature = asSingle(
    engine.intake_signature_media,
    engine.intake_signature,
    'Signature',
  )
  const release = mediaList(engine.release_media, engine.release_photos)
  const releaseSig = asSingle(
    engine.release_signature_media,
    engine.release_signature,
    'Release signature',
  )
  const install = mediaList(retrofit?.install_media, retrofit?.photos)

  return (
    <div className="flex flex-col gap-4">
      <section className="rounded-[12px] border border-[var(--bd)] bg-[var(--sf)] p-4 shadow-[var(--sh)]">
        <Text fw={700} size="sm" className="mb-3 text-[var(--tx)]">
          Custody documents
        </Text>
        <div className="flex flex-col gap-4">
          <EngineMediaGallery
            title="Intake photos"
            description="Petrol unit when sealed into custody."
            items={intake}
            emptyLabel="No intake photos."
          />
          <EngineMediaGallery
            title="Intake signature"
            description="Signed at intake (agent + witness)."
            items={signature}
            emptyLabel="No signature on file."
          />
          <EngineMediaGallery
            title="Release photos"
            description="After the unit is returned to the owner."
            items={release}
            emptyLabel={
              engine.status === 'RELEASED'
                ? 'No release photos.'
                : 'Not released yet.'
            }
          />
          {engine.status === 'RELEASED' || releaseSig.length > 0 ? (
            <EngineMediaGallery
              title="Release signature"
              description="Signed at handover."
              items={releaseSig}
              emptyLabel="No release signature."
            />
          ) : null}
        </div>
      </section>

      {retrofit ? (
        <section className="rounded-[12px] border border-[var(--bd)] bg-[var(--sf)] p-4 shadow-[var(--sh)]">
          <Text fw={700} size="sm" className="mb-3 text-[var(--tx)]">
            Install documents
          </Text>
          <EngineMediaGallery
            title="Install photos"
            description="E-boarder mount on the hull."
            items={install}
            emptyLabel="No install photos yet."
          />
        </section>
      ) : null}
    </div>
  )
}
