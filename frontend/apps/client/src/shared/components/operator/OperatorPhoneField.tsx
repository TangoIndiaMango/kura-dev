import React from 'react'

interface OperatorPhoneFieldProps {
  value: string
  onChange: (value: string) => void
  countryCode?: string
  error?: string | null
}

/** Keep national MSISDN only — +234 is shown; max 10 digits (e.g. 8012345678). */
export function normalizeNgNationalDigits(raw: string): string {
  let digits = (raw || '').replace(/\D/g, '')
  if (digits.startsWith('234')) digits = digits.slice(3)
  if (digits.startsWith('0')) digits = digits.slice(1)
  return digits.slice(0, 10)
}

export function formatNgNationalDisplay(digits: string): string {
  const d = normalizeNgNationalDigits(digits)
  if (d.length <= 3) return d
  if (d.length <= 6) return `${d.slice(0, 3)} ${d.slice(3)}`
  return `${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6)}`
}

export function isCompleteNgNational(value: string): boolean {
  return normalizeNgNationalDigits(value).length === 10
}

/** Nigeria-first phone field matching Operator hifi. */
export const OperatorPhoneField: React.FC<OperatorPhoneFieldProps> = ({
  value,
  onChange,
  countryCode = '+234',
  error = null,
}) => {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-[13px] font-medium text-[var(--kura-muted)]">
        Phone number
      </span>
      <div
        className={`flex overflow-hidden rounded-xl border bg-[var(--kura-bg-elevated)] ${
          error ? 'border-[var(--kura-coral)]' : 'border-[var(--kura-teal)]'
        }`}
      >
        <span className="flex items-center border-r border-[var(--kura-border)] px-3.5 text-sm font-semibold text-[var(--kura-text)]">
          {countryCode}
        </span>
        <input
          type="tel"
          inputMode="numeric"
          autoComplete="tel-national"
          maxLength={12}
          value={value}
          onChange={(e) =>
            onChange(formatNgNationalDisplay(e.target.value))
          }
          placeholder="803 412 1000"
          className="min-w-0 flex-1 bg-transparent px-3.5 py-3.5 text-[15px] font-medium text-[var(--kura-text)] outline-none placeholder:text-[var(--kura-text)]/35"
        />
      </div>
      {error ? (
        <span className="text-[12px] font-medium text-[var(--kura-coral)]" role="alert">
          {error}
        </span>
      ) : (
        <span className="text-[11px] text-[var(--kura-muted)]">
          10 digits after +234 — e.g. 801 234 5678
        </span>
      )}
    </label>
  )
}
