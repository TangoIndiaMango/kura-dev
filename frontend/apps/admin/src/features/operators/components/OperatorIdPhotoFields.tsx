import { DocumentSidesUpload, MediaDropzone } from '@shared/components'

type Props = {
  front: File | null
  back: File | null
  face: File | null
  onFrontChange: (f: File | null) => void
  onBackChange: (f: File | null) => void
  onFaceChange: (f: File | null) => void
}

export function OperatorIdPhotoFields({
  front,
  back,
  face,
  onFrontChange,
  onBackChange,
  onFaceChange,
}: Props) {
  return (
    <>
      <div className="sm:col-span-2">
        <DocumentSidesUpload
          front={front}
          back={back}
          onFrontChange={onFrontChange}
          onBackChange={onBackChange}
          label="ID document *"
          description="Front and back of the card are required · PNG or JPG · max 1 MB each"
        />
      </div>
      <div className="sm:col-span-2">
        <MediaDropzone
          value={face}
          onChange={onFaceChange}
          label="Face photo for hub verification *"
          description="Required · clear front-facing photo · PNG or JPG · max 5 MB."
          accept={['image/png', 'image/jpeg']}
          maxSizeMB={5}
          minHeight={180}
        />
      </div>
    </>
  )
}
