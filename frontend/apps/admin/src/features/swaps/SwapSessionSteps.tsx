import { Tick02Icon } from 'hugeicons-react'
import type { SwapStep } from './swapDetailHelpers'

export function SwapSessionSteps({
  steps,
  title = 'Swap steps',
  meta,
  activeStepId,
  onStepClick,
}: {
  steps: SwapStep[]
  title?: string
  meta?: string
  activeStepId?: string
  onStepClick: (step: SwapStep) => void
}) {
  return (
    <section className="rounded-[12px] border border-[var(--bd)] bg-[var(--sf)] p-4 shadow-[var(--sh)] sm:p-5">
      <div className="mb-5 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-[14px] font-bold text-[var(--tx)]">{title}</h2>
        {meta ? (
          <p className="text-[12.5px] font-medium text-[var(--mu)]">{meta}</p>
        ) : null}
      </div>

      <ol className="flex w-full list-none items-start gap-0 p-0">
        {steps.map((step, i) => {
          const next = steps[i + 1]
          const lineDone = step.done && Boolean(next?.done)
          const featured = activeStepId === step.id
          return (
            <li
              key={step.id}
              className="flex min-w-0 flex-1 flex-col items-center text-center"
            >
              <div className="flex w-full items-center">
                <div className="h-0.5 flex-1 bg-transparent" />
                <button
                  type="button"
                  disabled={!step.done}
                  onClick={() => step.done && onStepClick(step)}
                  title={step.done ? `View ${step.title}` : step.title}
                  className={`relative z-[1] flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition ${
                    step.done
                      ? 'bg-[#1E8E4E] text-white hover:brightness-110'
                      : 'border-2 border-[var(--bd)] bg-[var(--sf)] text-[var(--mu)]'
                  } ${featured ? 'ring-2 ring-[var(--pr)] ring-offset-2 ring-offset-[var(--sf)]' : ''} ${
                    step.done ? 'cursor-pointer' : 'cursor-default'
                  }`}
                >
                  {step.done ? (
                    <Tick02Icon size={16} strokeWidth={2.5} />
                  ) : (
                    <span className="text-[11px] font-bold">{i + 1}</span>
                  )}
                </button>
                <div
                  className={`h-0.5 flex-1 ${
                    i === steps.length - 1
                      ? 'bg-transparent'
                      : lineDone
                        ? 'bg-[#1E8E4E]'
                        : 'bg-[var(--bd)]'
                  }`}
                />
              </div>
              <button
                type="button"
                disabled={!step.done}
                onClick={() => step.done && onStepClick(step)}
                className={`mt-2.5 max-w-[7.5rem] px-0.5 text-center ${
                  step.done ? 'cursor-pointer hover:opacity-80' : 'cursor-default'
                }`}
              >
                <p className="text-[12.5px] font-bold leading-tight text-[var(--tx)]">
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
