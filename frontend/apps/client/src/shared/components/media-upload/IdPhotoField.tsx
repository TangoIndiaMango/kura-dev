import React, { useEffect, useRef, useState } from 'react'
import { Camera01Icon, Delete02Icon } from 'hugeicons-react'

interface IdPhotoFieldProps {
  label: string
  hint?: string
  value: File | null
  onChange: (file: File | null) => void
  /** Prefer front camera for face; rear for ID cards. */
  capture?: 'user' | 'environment'
  /** On-file preview when editing without picking a new file. */
  existingUrl?: string | null
}

/** Native capture — avoids Mantine Dropzone dual-React issues; better for phone cameras. */
export function IdPhotoField({
  label,
  hint,
  value,
  onChange,
  capture = 'environment',
  existingUrl = null,
}: IdPhotoFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(null)

  useEffect(() => {
    if (!value) {
      setPreview(null)
      return
    }
    const url = URL.createObjectURL(value)
    setPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [value])

  const shown = preview || existingUrl || null
  const fromExisting = Boolean(!preview && existingUrl)

  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-[12px] font-bold text-[var(--kura-text)]">{label}</p>
      {hint ? (
        <p className="text-[11px] text-[var(--kura-muted)]">{hint}</p>
      ) : null}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture={capture}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0] ?? null
          e.target.value = ''
          onChange(file)
        }}
      />

      {shown ? (
        <div className="relative overflow-hidden rounded-xl border border-[var(--kura-border)]">
          <img
            src={shown}
            alt=""
            className={`w-full object-cover ${capture === 'user' ? 'max-h-52' : 'max-h-40'}`}
          />
          {fromExisting ? (
            <p className="absolute bottom-2 left-2 rounded-md bg-black/55 px-2 py-0.5 text-[10px] font-semibold text-white">
              On file — tap Replace to change
            </p>
          ) : null}
          <div className="absolute right-2 top-2 flex gap-1.5">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="inline-flex items-center gap-1 rounded-lg bg-black/55 px-2 py-1 text-[11px] font-bold text-white"
            >
              <Camera01Icon size={12} />
              Replace
            </button>
            {preview ? (
              <button
                type="button"
                onClick={() => onChange(null)}
                className="inline-flex items-center gap-1 rounded-lg bg-black/55 px-2 py-1 text-[11px] font-bold text-white"
              >
                <Delete02Icon size={12} />
                Undo
              </button>
            ) : null}
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-[var(--kura-border)] bg-[var(--kura-bg-elevated)] px-4 py-7 text-[var(--kura-muted)] transition hover:border-[var(--kura-teal)]/50"
        >
          <Camera01Icon size={22} />
          <span className="text-[13px] font-semibold">Tap to take or choose photo</span>
        </button>
      )}
    </div>
  )
}
