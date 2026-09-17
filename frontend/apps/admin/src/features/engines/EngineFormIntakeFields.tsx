import { Select, TextInput, Textarea } from '@mantine/core'
import { MediaDropzone } from '@shared/components'

type Opt = { value: string; label: string }

type Props = {
  tag: string
  make: string
  model: string
  hp: string
  condition: string
  hubId: string
  witnessId: string
  photoFile: File | null
  photoFile2: File | null
  signatureFile: File | null
  notes: string
  hubs: Opt[]
  staff: Opt[]
  onTag: (v: string) => void
  onMake: (v: string) => void
  onModel: (v: string) => void
  onHp: (v: string) => void
  onCondition: (v: string) => void
  onHubId: (v: string) => void
  onWitnessId: (v: string) => void
  onPhotoFile: (f: File | null) => void
  onPhotoFile2: (f: File | null) => void
  onSignatureFile: (f: File | null) => void
  onNotes: (v: string) => void
}

export function EngineFormIntakeFields({
  tag,
  make,
  model,
  hp,
  condition,
  hubId,
  witnessId,
  photoFile,
  photoFile2,
  signatureFile,
  notes,
  hubs,
  staff,
  onTag,
  onMake,
  onModel,
  onHp,
  onCondition,
  onHubId,
  onWitnessId,
  onPhotoFile,
  onPhotoFile2,
  onSignatureFile,
  onNotes,
}: Props) {
  return (
    <div className="flex flex-col gap-3">
      <TextInput
        label="Engine tag"
        value={tag}
        onChange={(e) => onTag(e.currentTarget.value)}
        placeholder="PE-YMH-15-XXXX"
      />
      <div className="grid gap-3 sm:grid-cols-3">
        <TextInput label="Make" value={make} onChange={(e) => onMake(e.currentTarget.value)} />
        <TextInput label="Model" value={model} onChange={(e) => onModel(e.currentTarget.value)} />
        <TextInput label="HP" value={hp} onChange={(e) => onHp(e.currentTarget.value)} />
      </div>
      <Select
        label="Condition"
        data={[
          { value: 'GOOD', label: 'Good' },
          { value: 'FAIR', label: 'Fair' },
          { value: 'POOR', label: 'Poor' },
          { value: 'UNKNOWN', label: 'Unknown' },
        ]}
        value={condition}
        onChange={(v) => onCondition(v ?? 'FAIR')}
      />
      <Select
        label="Storage hub"
        searchable
        data={hubs}
        value={hubId || null}
        onChange={(v) => onHubId(v ?? '')}
      />
      <Select
        label="Witness (staff)"
        searchable
        data={staff}
        value={witnessId || null}
        onChange={(v) => onWitnessId(v ?? '')}
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <MediaDropzone
          value={photoFile}
          onChange={onPhotoFile}
          label="Intake photo"
          description="Hull / engine · PNG or JPG · max 5 MB"
          accept={['image/png', 'image/jpeg']}
          maxSizeMB={5}
          minHeight={110}
        />
        <MediaDropzone
          value={photoFile2}
          onChange={onPhotoFile2}
          label="Second photo (optional)"
          description="Condition detail"
          accept={['image/png', 'image/jpeg']}
          maxSizeMB={5}
          minHeight={110}
        />
      </div>
      <MediaDropzone
        value={signatureFile}
        onChange={onSignatureFile}
        label="Owner / agent signature"
        description="Required · PNG or JPG · max 5 MB"
        accept={['image/png', 'image/jpeg']}
        maxSizeMB={5}
        minHeight={110}
      />
      <Textarea
        label="Notes"
        minRows={2}
        value={notes}
        onChange={(e) => onNotes(e.currentTarget.value)}
      />
    </div>
  )
}
