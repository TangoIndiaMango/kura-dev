import type { CashDisplayStatus } from './cashReconHelpers'

const STEPS = [
  { id: 'collect', label: 'Collect' },
  { id: 'count', label: 'Count drawer' },
  { id: 'lodge', label: 'Bank lodge' },
] as const

function activeIndex(phase: string) {
  if (phase === 'ON_DUTY' || phase === 'DEPOSIT_PENDING') return 0
  // Auto-closed: collection is done, the drawer count is the current step.
  if (phase === 'COUNT_PENDING') return 1
  if (
    phase === 'AWAITING_LODGE' ||
    phase === 'VARIANCE' ||
    phase === 'SHORT' ||
    phase === 'CLOSED_SHORT'
  ) {
    // Drawer counted — collect + count done, lodge is the current step.
    return 2
  }
  return 2
}

/** Visual 3-step strip for cash shift recon. */
export function CashShiftPhaseStrip({
  phase,
}: {
  phase: CashDisplayStatus | string
}) {
  const active = activeIndex(phase)
  const doneThrough =
    phase === 'SETTLED' || phase === 'CLOSED' ? 2 : active > 0 ? active - 1 : -1

  return (
    <ol className="m-0 flex list-none flex-wrap gap-2 p-0">
      {STEPS.map((step, i) => {
        const done = i <= doneThrough || (phase === 'SETTLED' && i <= 2)
        const current = i === active && phase !== 'SETTLED' && phase !== 'CLOSED'
        return (
          <li
            key={step.id}
            className={`flex min-w-[7.5rem] flex-1 items-center gap-2 rounded-[10px] border px-3 py-2 text-[12px] font-semibold ${
              done
                ? 'border-[var(--pr)]/35 bg-[var(--prs)] text-[var(--tx)]'
                : current
                  ? 'border-[var(--am)]/40 bg-[var(--ta)] text-[var(--tx)]'
                  : 'border-[var(--bd)] bg-[var(--in)] text-[var(--mu)]'
            }`}
          >
            <span
              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-extrabold ${
                done
                  ? 'bg-[var(--pr)] text-white'
                  : current
                    ? 'bg-[var(--am)] text-[#1a1204]'
                    : 'bg-[var(--bd)] text-[var(--mu)]'
              }`}
            >
              {done ? '✓' : i + 1}
            </span>
            {step.label}
          </li>
        )
      })}
    </ol>
  )
}
