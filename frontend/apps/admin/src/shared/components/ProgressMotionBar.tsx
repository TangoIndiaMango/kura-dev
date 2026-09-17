import React from 'react'

/** Visible motion under progress illustrations (no GIF assets yet). */
export function ProgressMotionBar({ label = 'Working…' }: { label?: string }) {
  return (
    <div className="flex w-full flex-col items-center gap-3 pt-1">
      <div className="kura-progress-track h-1.5 w-full overflow-hidden rounded-full bg-[var(--bd)]">
        <div className="kura-progress-indeterminate h-full w-1/3 rounded-full bg-[var(--pr)]" />
      </div>
      <div className="flex items-center gap-1.5" aria-hidden>
        <span className="kura-dot-bounce h-1.5 w-1.5 rounded-full bg-[var(--pr)]" />
        <span className="kura-dot-bounce kura-dot-bounce-delay-1 h-1.5 w-1.5 rounded-full bg-[var(--pr)]" />
        <span className="kura-dot-bounce kura-dot-bounce-delay-2 h-1.5 w-1.5 rounded-full bg-[var(--pr)]" />
      </div>
      <p className="text-[11px] font-medium text-[var(--mu)]">{label}</p>
    </div>
  )
}
