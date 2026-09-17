import React from 'react'
import { Tick01Icon } from 'hugeicons-react'

interface ChecklistItem {
  id: string
  label: string
  done: boolean
}

interface GetStartedChecklistProps {
  done: number
  total: number
  items: ChecklistItem[]
}

export const GetStartedChecklist: React.FC<GetStartedChecklistProps> = ({
  done,
  total,
  items,
}) => {
  return (
    <section className="rounded-2xl border border-[var(--kura-border)] bg-[var(--kura-bg-elevated)] p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-bold text-[var(--kura-text)]">Get started</h2>
        <span className="text-xs font-semibold text-[var(--kura-muted)]">
          {done} of {total}
        </span>
      </div>
      <ul className="flex flex-col gap-2.5">
        {items.map((item) => (
          <li key={item.id} className="flex items-center gap-3">
            <span
              className={`flex h-6 w-6 items-center justify-center rounded-full ${
                item.done
                  ? 'bg-[var(--kura-green)] text-white'
                  : 'border border-[var(--kura-border)] text-transparent'
              }`}
            >
              <Tick01Icon size={14} />
            </span>
            <span
              className={`text-sm ${
                item.done
                  ? 'text-[var(--kura-text)]/70 line-through'
                  : 'font-medium text-[var(--kura-text)]'
              }`}
            >
              {item.label}
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}
