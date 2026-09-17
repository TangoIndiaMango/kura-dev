import React from 'react'

/** Visible motion under progress illustrations — determinate when `value` is set. */
export function ProgressMotionBar({
  label = 'Working…',
  value,
}: {
  label?: string
  /** 0–100 for real upload progress; omit for indeterminate. */
  value?: number
}) {
  const determinate = typeof value === 'number' && Number.isFinite(value)
  const pct = determinate ? Math.min(100, Math.max(0, value)) : 0

  return (
    <div className="flex w-full flex-col items-center gap-3 pt-1">
      <div
        className="kura-progress-track h-1.5 w-full overflow-hidden rounded-full bg-[var(--kura-border)]"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={determinate ? pct : undefined}
        aria-label={label}
      >
        {determinate ? (
          <div
            className="h-full rounded-full bg-[var(--kura-teal)] transition-[width] duration-200 ease-out"
            style={{ width: `${pct}%` }}
          />
        ) : (
          <div className="kura-progress-indeterminate h-full w-1/3 rounded-full bg-[var(--kura-teal)]" />
        )}
      </div>
      <div className="flex items-center gap-1.5" aria-hidden>
        <span className="kura-dot-bounce h-1.5 w-1.5 rounded-full bg-[var(--kura-teal)]" />
        <span className="kura-dot-bounce kura-dot-bounce-delay-1 h-1.5 w-1.5 rounded-full bg-[var(--kura-teal)]" />
        <span className="kura-dot-bounce kura-dot-bounce-delay-2 h-1.5 w-1.5 rounded-full bg-[var(--kura-teal)]" />
      </div>
      <p className="text-[11px] font-medium text-[var(--kura-muted)]">{label}</p>
    </div>
  )
}
