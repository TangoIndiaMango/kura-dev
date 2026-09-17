import type { ReactNode } from 'react'

/** Opens a peek drawer — keeps hub/swap/payment context instead of hopping modules. */
export function DetailPeekTrigger({
  label,
  hint,
  onClick,
}: {
  label: ReactNode
  hint?: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      title={hint}
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
      className="inline-flex max-w-full items-center gap-1 text-left text-[13.5px] font-semibold text-[var(--pr)] hover:underline"
    >
      <span className="truncate">{label}</span>
    </button>
  )
}
