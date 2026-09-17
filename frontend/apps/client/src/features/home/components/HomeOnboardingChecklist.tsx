import React from 'react'
import type { TabId } from '../../layout/FloatingGlassBottomBar'

export interface ChecklistItem {
  id: string
  label: string
  done: boolean
  tab?: TabId
}

interface HomeOnboardingChecklistProps {
  items: ChecklistItem[]
  onOpen: (item: ChecklistItem) => void
}

/** New-user checklist — account → name/PIN → vehicle → fund → first swap. */
export const HomeOnboardingChecklist: React.FC<HomeOnboardingChecklistProps> = ({
  items,
  onOpen,
}) => {
  const done = items.filter((i) => i.done).length
  if (done >= items.length) return null

  return (
    <section className="rounded-2xl border border-[var(--kura-border)] bg-[var(--kura-bg-elevated)] px-4 py-3.5">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-[14px] font-bold text-[var(--kura-text)]">
          Get started
        </h2>
        <span className="text-[11px] font-semibold text-[var(--kura-muted)]">
          {done}/{items.length}
        </span>
      </div>
      <ul className="mt-3 flex flex-col gap-2">
        {items.map((item) => (
          <li key={item.id}>
            <button
              type="button"
              disabled={item.done || !item.tab}
              onClick={() => {
                if (!item.done && item.tab) onOpen(item)
              }}
              className={`flex w-full items-center gap-2.5 rounded-xl px-2 py-2 text-left ${
                item.done
                  ? 'opacity-55'
                  : 'hover:bg-[var(--kura-teal)]/10'
              }`}
            >
              <span
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-extrabold ${
                  item.done
                    ? 'bg-[var(--kura-green)]/20 text-[var(--kura-green)]'
                    : 'border border-[var(--kura-border)] text-[var(--kura-muted)]'
                }`}
              >
                {item.done ? '✓' : ''}
              </span>
              <span
                className={`text-[13px] font-semibold ${
                  item.done
                    ? 'text-[var(--kura-muted)] line-through'
                    : 'text-[var(--kura-text)]'
                }`}
              >
                {item.label}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}
