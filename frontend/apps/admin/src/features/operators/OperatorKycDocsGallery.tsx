import { MediaThumbGallery } from '@shared/components'
import type { KycPayload } from './utils/map-account'

export function OperatorKycDocsGallery({ kyc }: { kyc?: KycPayload | null }) {
  const items = [
    kyc?.photo_url
      ? { id: 'face', label: 'Face photo', url: kyc.photo_url }
      : null,
    kyc?.id_front_url
      ? { id: 'front', label: 'ID front', url: kyc.id_front_url }
      : null,
    kyc?.id_back_url
      ? { id: 'back', label: 'ID back', url: kyc.id_back_url }
      : null,
  ].filter(Boolean) as { id: string; label: string; url: string }[]

  if (!items.length) {
    return (
      <p className="mt-3 text-[12.5px] text-[var(--mu)]">
        No ID photos on file yet. Operator must submit face + card scans from the app.
      </p>
    )
  }

  return (
    <div className="mt-4">
      <MediaThumbGallery
        title="Submitted photos"
        items={items.map((item) => ({
          ...item,
          contentType: 'image/jpeg',
        }))}
        columnsClassName="grid-cols-2 gap-3 sm:grid-cols-3"
      />
    </div>
  )
}
