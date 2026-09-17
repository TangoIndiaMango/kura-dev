import { useEffect, useRef, useState } from 'react'
import { Text } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { Edit02Icon, Image01Icon, Upload04Icon } from 'hugeicons-react'

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes}B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)}KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`
}

export interface CompactMediaSlotProps {
  value: File | null
  onChange: (file: File | null) => void
  /** Shown under the empty/filled title when empty, e.g. "Front" */
  sideLabel?: string
  emptyTitle?: string
  filledTitle?: string
  existingMediaUrl?: string | null
  maxSizeMB?: number
  accept?: string
  error?: string | null
  className?: string
}

/**
 * Compact strip uploader (front/back ID sides). Height matches design (~141px);
 * width is fluid. Uses Kura brand teal — not third-party yellow accents.
 */
export function CompactMediaSlot({
  value,
  onChange,
  sideLabel,
  emptyTitle = 'No image',
  filledTitle,
  existingMediaUrl,
  maxSizeMB = 1,
  accept = 'image/png,image/jpeg,image/webp',
  error,
  className,
}: CompactMediaSlotProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [fileSize, setFileSize] = useState(0)

  const maxBytes = maxSizeMB * 1024 * 1024
  const filled = Boolean(previewUrl)
  const title = filled
    ? filledTitle || value?.name || sideLabel || 'Image'
    : sideLabel
      ? `${emptyTitle} · ${sideLabel}`
      : emptyTitle
  const sizeLabel = filled
    ? `${formatBytes(fileSize || value?.size || 0)}/${maxSizeMB}MB`
    : `0/${maxSizeMB}MB`

  useEffect(() => {
    if (value) {
      const url = URL.createObjectURL(value)
      setPreviewUrl(url)
      setFileSize(value.size)
      return () => URL.revokeObjectURL(url)
    }
    if (existingMediaUrl) {
      setPreviewUrl(existingMediaUrl)
      setFileSize(0)
      return
    }
    setPreviewUrl(null)
    setFileSize(0)
  }, [value, existingMediaUrl])

  const openPicker = () => inputRef.current?.click()

  const applyFile = (file: File | undefined) => {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      notifications.show({
        title: 'Invalid file',
        message: 'Upload a PNG or JPG image.',
        color: 'red',
      })
      return
    }
    if (file.size > maxBytes) {
      notifications.show({
        title: 'File too large',
        message: `Max ${maxSizeMB}MB.`,
        color: 'red',
      })
      return
    }
    onChange(file)
  }

  return (
    <div className={className}>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => {
          applyFile(e.target.files?.[0])
          e.target.value = ''
        }}
      />

      <button
        type="button"
        onClick={openPicker}
        className={`relative flex h-[141px] w-full items-center justify-between gap-2 overflow-hidden rounded-2xl border px-8 text-left transition ${
          filled
            ? 'border-[var(--bd)]'
            : 'border-[#EAECF0] bg-[#F9FAFB] hover:border-[var(--pr)]/40'
        } ${error ? 'border-[#C0392B]' : ''}`}
        style={
          filled && previewUrl
            ? {
                backgroundImage: `linear-gradient(0deg, rgba(0,0,0,0.5), rgba(0,0,0,0.5)), url(${previewUrl})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }
            : undefined
        }
        aria-label={filled ? `Change ${title}` : `Upload ${title}`}
      >
        <div className="flex min-w-0 items-center gap-2">
          <span
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
              filled ? 'bg-white' : 'bg-[var(--prs)]'
            }`}
          >
            <Image01Icon
              size={14}
              color={filled ? 'var(--sb)' : 'var(--pr)'}
              strokeWidth={1.5}
            />
          </span>
          <div className="min-w-0">
            <p
              className={`truncate text-[12px] font-medium leading-[18px] ${
                filled ? 'text-white' : 'text-[#344054]'
              }`}
            >
              {title}
            </p>
            <p
              className={`text-[12px] font-normal leading-[18px] ${
                filled ? 'text-white/90' : 'text-[#667085]'
              }`}
            >
              {sizeLabel}
            </p>
          </div>
        </div>

        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--pr)]">
          {filled ? (
            <Edit02Icon size={14} color="#fff" strokeWidth={1.5} />
          ) : (
            <Upload04Icon size={14} color="#fff" strokeWidth={1.5} />
          )}
        </span>
      </button>

      {error ? (
        <Text fz="xs" c="red.6" mt={6}>
          {error}
        </Text>
      ) : null}
    </div>
  )
}

export interface DocumentSidesUploadProps {
  front: File | null
  back: File | null
  onFrontChange: (file: File | null) => void
  onBackChange: (file: File | null) => void
  label?: string
  description?: string
  maxSizeMB?: number
  frontError?: string | null
  backError?: string | null
}

/** ID / document front + back using CompactMediaSlot. */
export function DocumentSidesUpload({
  front,
  back,
  onFrontChange,
  onBackChange,
  label = 'ID document',
  description = 'Front and back · PNG or JPG · max 1 MB each',
  maxSizeMB = 1,
  frontError,
  backError,
}: DocumentSidesUploadProps) {
  return (
    <div className="flex flex-col gap-2">
      <div>
        <p className="text-[13px] font-semibold text-[var(--tx)]">{label}</p>
        {description ? (
          <p className="mt-0.5 text-[12px] text-[var(--mu)]">{description}</p>
        ) : null}
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <CompactMediaSlot
          value={front}
          onChange={onFrontChange}
          sideLabel="Front"
          emptyTitle="No image"
          filledTitle="Front"
          maxSizeMB={maxSizeMB}
          error={frontError}
        />
        <CompactMediaSlot
          value={back}
          onChange={onBackChange}
          sideLabel="Back"
          emptyTitle="No image"
          filledTitle="Back"
          maxSizeMB={maxSizeMB}
          error={backError}
        />
      </div>
    </div>
  )
}

export type CustodyPhotoSlotId = 'hull' | 'petrol' | 'eboarder'

export interface CustodyPhotosUploadProps {
  hull: File | null
  petrol: File | null
  eboarder: File | null
  onHullChange: (file: File | null) => void
  onPetrolChange: (file: File | null) => void
  onEboarderChange: (file: File | null) => void
  /** Prefill when editing an existing vault (object URLs or remote). */
  existingUrls?: Partial<Record<CustodyPhotoSlotId, string | null>>
  label?: string
  description?: string
  maxSizeMB?: number
  hullError?: string | null
  petrolError?: string | null
  eboarderError?: string | null
}

/** PRD 5.4 intake vault — hull, surrendered petrol, e-boarder — CompactMediaSlot trio. */
export function CustodyPhotosUpload({
  hull,
  petrol,
  eboarder,
  onHullChange,
  onPetrolChange,
  onEboarderChange,
  existingUrls,
  label = 'Custody photos',
  description = 'Hull, surrendered ICE, and e-boarder · PNG or JPG · max 1 MB each',
  maxSizeMB = 1,
  hullError,
  petrolError,
  eboarderError,
}: CustodyPhotosUploadProps) {
  return (
    <div className="flex flex-col gap-2">
      <div>
        <p className="text-[13px] font-semibold text-[var(--tx)]">{label}</p>
        {description ? (
          <p className="mt-0.5 text-[12px] text-[var(--mu)]">{description}</p>
        ) : null}
      </div>
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        <CompactMediaSlot
          value={hull}
          onChange={onHullChange}
          sideLabel="Hull"
          emptyTitle="No image"
          filledTitle="Hull / vehicle"
          existingMediaUrl={existingUrls?.hull}
          maxSizeMB={maxSizeMB}
          error={hullError}
        />
        <CompactMediaSlot
          value={petrol}
          onChange={onPetrolChange}
          sideLabel="Petrol"
          emptyTitle="No image"
          filledTitle="Surrendered petrol"
          existingMediaUrl={existingUrls?.petrol}
          maxSizeMB={maxSizeMB}
          error={petrolError}
        />
        <CompactMediaSlot
          value={eboarder}
          onChange={onEboarderChange}
          sideLabel="E-boarder"
          emptyTitle="No image"
          filledTitle="E-boarder installed"
          existingMediaUrl={existingUrls?.eboarder}
          maxSizeMB={maxSizeMB}
          error={eboarderError}
        />
      </div>
    </div>
  )
}
