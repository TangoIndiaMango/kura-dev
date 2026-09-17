import type { ReactNode } from 'react'

export type FormStepItem = {
  label: string
  /** Optional short hint under the label (sidebar only). */
  description?: string
}

export type FormStepperProps = {
  steps: FormStepItem[]
  activeStep: number
  onStepChange?: (index: number) => void
  /**
   * vertical — left aside (desktop)
   * horizontal — top scroller when aside is collapsed (md / mobile)
   */
  orientation?: 'vertical' | 'horizontal'
  className?: string
}

/**
 * Single stepper used by SidebarFormLayout:
 * - vertical in the left panel on desktop
 * - horizontal scroll-x when the aside is hidden
 */
export function FormStepper({
  steps,
  activeStep,
  onStepChange,
  orientation = 'vertical',
  className = '',
}: FormStepperProps) {
  if (orientation === 'horizontal') {
    return (
      <nav
        aria-label="Form steps"
        className={`-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${className}`}
      >
        {steps.map((step, i) => {
          const active = i === activeStep
          const done = i < activeStep
          return (
            <button
              key={step.label}
              type="button"
              onClick={() => onStepChange?.(i)}
              className={`inline-flex shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 text-[12.5px] font-semibold transition-colors ${
                active
                  ? 'border-[var(--pr)] bg-[var(--pr)] text-white'
                  : done
                    ? 'border-[var(--pr)]/40 bg-[var(--tg)] text-[#1E8E4E]'
                    : 'border-[var(--bd)] bg-[var(--sf)] text-[var(--mu)]'
              }`}
            >
              <span
                className={`flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold ${
                  active
                    ? 'bg-white/20 text-white'
                    : done
                      ? 'bg-[#1E8E4E]/15 text-[#1E8E4E]'
                      : 'bg-[var(--tn)] text-[var(--mu)]'
                }`}
              >
                {i + 1}
              </span>
              {step.label}
            </button>
          )
        })}
      </nav>
    )
  }

  return (
    <nav aria-label="Form steps" className={`flex flex-col ${className}`}>
      {steps.map((step, i) => {
        const active = i === activeStep
        const done = i < activeStep
        const last = i === steps.length - 1
        return (
          <div key={step.label} className="flex gap-3">
            <div className="flex w-7 shrink-0 flex-col items-center">
              <button
                type="button"
                onClick={() => onStepChange?.(i)}
                aria-current={active ? 'step' : undefined}
                className={`flex h-7 w-7 items-center justify-center rounded-full border-[1.5px] text-[12px] font-bold transition-colors ${
                  done
                    ? 'border-[var(--pr)] bg-[var(--pr)] text-white'
                    : active
                      ? 'border-[var(--pr)] bg-[var(--sf)] text-[var(--pr)]'
                      : 'border-[var(--bd)] bg-transparent text-[var(--mu)]'
                }`}
              >
                {i + 1}
              </button>
              {!last ? (
                <span
                  aria-hidden
                  className={`mt-1 w-[2px] flex-1 min-h-[18px] ${
                    done ? 'bg-[var(--pr)]' : 'bg-[var(--bd)]'
                  }`}
                />
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => onStepChange?.(i)}
              className={`mb-3 min-w-0 flex-1 pb-1 text-left ${last ? 'mb-0' : ''}`}
            >
              <span
                className={`block text-[13.5px] ${
                  active
                    ? 'font-bold text-[var(--tx)]'
                    : done
                      ? 'font-semibold text-[var(--tx)]'
                      : 'font-normal text-[var(--mu)]'
                }`}
              >
                {step.label}
              </span>
              {step.description ? (
                <span className="mt-0.5 block text-[12px] text-[var(--mu)]">
                  {step.description}
                </span>
              ) : null}
            </button>
          </div>
        )
      })}
    </nav>
  )
}

export type FormStepperSlotProps = {
  children?: ReactNode
}
