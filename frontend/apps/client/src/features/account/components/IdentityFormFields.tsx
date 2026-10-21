import { IdPhotoField } from '../../../shared/components/media-upload/IdPhotoField'

export const identityFieldStyles = {
  label: {
    fontSize: 12,
    fontWeight: 700,
    color: 'var(--kura-text)',
    marginBottom: 6,
  },
  input: {
    borderRadius: 12,
    borderColor: 'var(--kura-border)',
    backgroundColor: 'var(--kura-bg-elevated)',
    color: 'var(--kura-text)',
    fontSize: 14,
    minHeight: 48,
  },
} as const

export function IdentityPhotoPair({
  front,
  back,
  onFront,
  onBackFile,
  frontUrl,
  backUrl,
}: {
  front: File | null
  back: File | null
  onFront: (f: File | null) => void
  onBackFile: (f: File | null) => void
  frontUrl?: string | null
  backUrl?: string | null
}) {
  return (
    <div className="flex flex-col gap-3">
      <IdPhotoField
        label="ID front *"
        hint="Clear, full card"
        value={front}
        onChange={onFront}
        existingUrl={frontUrl}
      />
      <IdPhotoField
        label="ID back *"
        hint="Clear, full card — the side with the barcode or signature"
        value={back}
        onChange={onBackFile}
        existingUrl={backUrl}
      />
    </div>
  )
}
