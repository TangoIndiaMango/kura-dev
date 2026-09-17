import React from 'react'
import { Notification01Icon } from 'hugeicons-react'

interface OperatorHeaderProps {
  title?: string
  subtitle?: string
  onOpenNotifications?: () => void
  showUnreadDot?: boolean
}

export const OperatorHeader: React.FC<OperatorHeaderProps> = ({
  title = 'Yusuf Abdullahi',
  subtitle = 'Good morning',
  onOpenNotifications,
  showUnreadDot = false,
}) => {
  return (
    <header className="sticky top-0 z-30 flex items-center justify-between border-b border-[var(--kura-border-subtle)] bg-[var(--kura-bg)]/90 px-5 py-3.5 backdrop-blur-md">
      <div className="flex min-w-0 flex-col">
        <h1 className="truncate text-[17px] font-bold tracking-tight text-[var(--kura-text)]">
          {subtitle}, {title}
        </h1>
      </div>

      <button
        type="button"
        onClick={onOpenNotifications}
        className="relative rounded-xl border border-[var(--kura-border)] bg-[var(--kura-bg-elevated)] p-2.5 text-[var(--kura-text)]/80 transition hover:bg-white/5"
        title="Notifications"
        aria-label="Notifications"
      >
        <Notification01Icon size={18} />
        {showUnreadDot ? (
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-[var(--kura-coral)] ring-2 ring-[var(--kura-bg)]" />
        ) : null}
      </button>
    </header>
  )
}
