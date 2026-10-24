import React from 'react'
import {
  Wallet01Icon,
  Coins01Icon,
  QrCode01Icon,
  Invoice01Icon,
} from 'hugeicons-react'
import type { TabId } from '../../layout/FloatingGlassBottomBar'

interface QuickActionsRowProps {
  onNavigateTab: (tab: TabId) => void
  onOpenSwaps: () => void
  hasActivePass?: boolean
  onOpenWallet: () => void
}

export const QuickActionsRow: React.FC<QuickActionsRowProps> = ({
  onNavigateTab,
  onOpenSwaps,
  hasActivePass = false,
  onOpenWallet,
}) => {
  const actions: Array<{
    id: string
    label: string
    icon: React.ComponentType<{ size?: number }>
    onClick: () => void
  }> = [
    {
      id: 'swap',
      // The hero card already has "Book a swap"; this tile is for what you've done.
      label: hasActivePass ? 'My holds' : 'Swap history',
      icon: hasActivePass ? QrCode01Icon : Invoice01Icon,
      onClick: () => {
        if (hasActivePass) onOpenSwaps()
        else onNavigateTab('swap')
      },
    },
    {
      id: 'plans',
      label: 'Plans',
      icon: Coins01Icon,
      onClick: () => onNavigateTab('plans'),
    },
    {
      id: 'wallet',
      label: 'Receipts',
      icon: Wallet01Icon,
      onClick: onOpenWallet,
    },
  ]

  return (
    <section className="grid grid-cols-3 gap-2.5">
      {actions.map((action) => {
        const Icon = action.icon
        return (
          <button
            key={action.id}
            type="button"
            onClick={action.onClick}
            className="flex flex-col items-center gap-2 rounded-xl border border-[var(--kura-teal)]/35 bg-[var(--kura-bg-elevated)] px-1 py-3 transition hover:border-[var(--kura-teal)]"
          >
            <Icon size={20} />
            <span className="text-center text-[11px] font-semibold text-[var(--kura-text)]/90">
              {action.label}
            </span>
          </button>
        )
      })}
    </section>
  )
}
