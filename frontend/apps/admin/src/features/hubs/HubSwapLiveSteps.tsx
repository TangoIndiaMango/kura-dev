import { Tick02Icon } from 'hugeicons-react'

export type HubLiveStepId = 'lookup' | 'triage' | 'return' | 'issue' | 'settle' | 'done'

export type HubLiveStep = {
  id: HubLiveStepId
  title: string
  detail: string
  /** Reached or current — clickable to revisit */
  reachable: boolean
  current: boolean
  done: boolean
}

/** Live bay stepper — same chrome as swap CRM steps; allows going back. */
export function HubSwapLiveSteps({
  steps,
  onStepClick,
}: {
  steps: HubLiveStep[]
  onStepClick: (id: HubLiveStepId) => void
}) {
  const visible = steps.filter((s) => s.id !== 'done')
  return (
    <section className="rounded-[12px] border border-[var(--bd)] bg-[var(--sf)] p-4 shadow-[var(--sh)] sm:p-5">
      <div className="mb-5 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-[14px] font-bold text-[var(--tx)]">Swap steps</h2>
        <p className="text-[12.5px] font-medium text-[var(--mu)]">
          Tap a completed step to go back
        </p>
      </div>

      <ol className="flex w-full list-none items-start gap-0 p-0">
        {visible.map((step, i) => {
          const next = visible[i + 1]
          const lineDone = step.done && Boolean(next?.done || next?.current)
          return (
            <li
              key={step.id}
              className="flex min-w-0 flex-1 flex-col items-center text-center"
            >
              <div className="flex w-full items-center">
                <div className="h-0.5 flex-1 bg-transparent" />
                <button
                  type="button"
                  disabled={!step.reachable}
                  onClick={() => step.reachable && onStepClick(step.id)}
                  title={step.reachable ? `Go to ${step.title}` : step.title}
                  className={`relative z-[1] flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition ${
                    step.current
                      ? 'bg-[var(--pr)] text-white ring-2 ring-[var(--pr)] ring-offset-2 ring-offset-[var(--sf)]'
                      : step.done
                        ? 'bg-[#1E8E4E] text-white hover:brightness-110'
                        : 'border-2 border-[var(--bd)] bg-[var(--sf)] text-[var(--mu)]'
                  } ${step.reachable ? 'cursor-pointer' : 'cursor-default'}`}
                >
                  {step.done && !step.current ? (
                    <Tick02Icon size={16} strokeWidth={2.5} />
                  ) : (
                    <span className="text-[11px] font-bold">{i + 1}</span>
                  )}
                </button>
                <div
                  className={`h-0.5 flex-1 ${
                    i === visible.length - 1
                      ? 'bg-transparent'
                      : lineDone
                        ? 'bg-[#1E8E4E]'
                        : 'bg-[var(--bd)]'
                  }`}
                />
              </div>
              <button
                type="button"
                disabled={!step.reachable}
                onClick={() => step.reachable && onStepClick(step.id)}
                className={`mt-2.5 max-w-[7.5rem] px-0.5 text-center ${
                  step.reachable ? 'cursor-pointer hover:opacity-80' : 'cursor-default'
                }`}
              >
                <p
                  className={`text-[12.5px] font-bold leading-tight ${
                    step.current ? 'text-[var(--pr)]' : 'text-[var(--tx)]'
                  }`}
                >
                  {step.title}
                </p>
                <p className="mt-0.5 text-[11px] leading-snug text-[var(--mu)]">
                  {step.detail}
                </p>
              </button>
            </li>
          )
        })}
      </ol>
    </section>
  )
}
