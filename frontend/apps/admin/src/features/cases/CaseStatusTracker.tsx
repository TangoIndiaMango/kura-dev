import { Tick02Icon } from 'hugeicons-react'

const CASE_STEPS = [
  { id: 'OPEN', title: 'Opened', detail: 'Case lodged' },
  { id: 'PENDING', title: 'In progress', detail: 'Assigned / working' },
  { id: 'RESOLVED', title: 'Resolved', detail: 'Outcome ready' },
  { id: 'CLOSED', title: 'Closed', detail: 'Done' },
] as const

function stepIndex(status: string): number {
  const i = CASE_STEPS.findIndex((s) => s.id === status)
  return i >= 0 ? i : 0
}

/** Horizontal case lifecycle tracker — same chrome as hub swap steps. */
export function CaseStatusTracker({
  status,
  assigneeName,
}: {
  status: string
  assigneeName?: string | null
}) {
  const current = stepIndex(status.toUpperCase())

  return (
    <div>
      <p className="mb-4 text-[12.5px] font-medium text-[var(--mu)]">
        {assigneeName
          ? `Owner · ${assigneeName}`
          : 'Unassigned · status moves as ops work the case'}
      </p>
      <ol className="flex w-full list-none items-start gap-0 p-0">
        {CASE_STEPS.map((step, i) => {
          const done = i < current
          const isCurrent = i === current
          const connectorDone = i < current
          return (
            <li
              key={step.id}
              className="flex min-w-0 flex-1 flex-col items-center text-center"
            >
              <div className="flex w-full items-center">
                <div className="h-0.5 flex-1 bg-transparent" />
                <span
                  className={`relative z-[1] flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                    isCurrent
                      ? 'bg-[var(--pr)] text-white ring-2 ring-[var(--pr)] ring-offset-2 ring-offset-[var(--sf)]'
                      : done
                        ? 'bg-[#1E8E4E] text-white'
                        : 'border-2 border-[var(--bd)] bg-[var(--sf)] text-[var(--mu)]'
                  }`}
                >
                  {done && !isCurrent ? (
                    <Tick02Icon size={16} strokeWidth={2.5} />
                  ) : (
                    <span className="text-[11px] font-bold">{i + 1}</span>
                  )}
                </span>
                <div
                  className={`h-0.5 flex-1 ${
                    i === CASE_STEPS.length - 1
                      ? 'bg-transparent'
                      : connectorDone
                        ? 'bg-[#1E8E4E]'
                        : 'bg-[var(--bd)]'
                  }`}
                />
              </div>
              <div className="mt-2.5 max-w-[7.5rem] px-0.5 text-center">
                <div
                  className={`text-[12px] font-bold leading-tight ${
                    isCurrent
                      ? 'text-[var(--pr)]'
                      : done
                        ? 'text-[var(--tx)]'
                        : 'text-[var(--mu)]'
                  }`}
                >
                  {step.title}
                </div>
                <div className="mt-0.5 text-[10.5px] leading-snug text-[var(--su)]">
                  {step.detail}
                </div>
              </div>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
