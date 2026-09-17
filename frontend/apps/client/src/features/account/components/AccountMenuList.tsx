import React from 'react'
import { ArrowRight01Icon } from 'hugeicons-react'

export interface AccountMenuItem {
  id: string
  title: string
  subtitle: string
  toggle?: boolean
  danger?: boolean
}

interface AccountMenuListProps {
  items: AccountMenuItem[]
  darkModeOn: boolean
  onToggleDark: () => void
  onItemClick: (id: string) => void
}

export const AccountMenuList: React.FC<AccountMenuListProps> = ({
  items,
  darkModeOn,
  onToggleDark,
  onItemClick,
}) => {
  return (
    <section className="overflow-hidden rounded-2xl border border-[var(--kura-border)] bg-[var(--kura-bg-elevated)]">
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() =>
            item.toggle ? onToggleDark() : onItemClick(item.id)
          }
          className="flex w-full items-center justify-between gap-3 border-b border-[var(--kura-border-subtle)] px-4 py-3.5 text-left last:border-b-0"
        >
          <span className="flex min-w-0 flex-col gap-0.5">
            <span
              className={`text-[14px] font-bold ${
                item.danger ? 'text-[var(--kura-coral)]' : 'text-[var(--kura-text)]'
              }`}
            >
              {item.title}
            </span>
            {item.subtitle ? (
              <span className="truncate text-[12px] text-[var(--kura-muted)]">
                {item.subtitle}
              </span>
            ) : null}
          </span>

          {item.toggle ? (
            <span
              role="switch"
              aria-checked={darkModeOn}
              className={`relative h-7 w-12 shrink-0 rounded-full border transition ${
                darkModeOn
                  ? 'border-[var(--kura-teal)] bg-[var(--kura-teal)]'
                  : 'border-[var(--kura-border)] bg-[#D8DEE5]'
              }`}
            >
              <span
                className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow-sm transition ${
                  darkModeOn ? 'left-[22px]' : 'left-0.5'
                }`}
              />
            </span>
          ) : (
            <ArrowRight01Icon
              size={16}
              className="shrink-0 text-[var(--kura-muted)]"
            />
          )}
        </button>
      ))}
    </section>
  )
}
