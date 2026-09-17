import React from 'react'
import {
  Home01Icon,
  ZapIcon,
  Wallet01Icon,
  Coins01Icon,
  UserIcon,
} from 'hugeicons-react'

export type TabId = 'home' | 'swap' | 'wallet' | 'plans' | 'account'

interface FloatingGlassBottomBarProps {
  activeTab: TabId
  onChangeTab: (tab: TabId) => void
}

interface NavItem {
  id: TabId
  label: string
  icon: React.ComponentType<{ size?: number; className?: string }>
}

/** Order matches Operator hifi: Home · Swap · Wallet · Plans · Account */
const NAV_ITEMS: NavItem[] = [
  { id: 'home', label: 'Home', icon: Home01Icon },
  { id: 'swap', label: 'Swap', icon: ZapIcon },
  { id: 'wallet', label: 'Wallet', icon: Wallet01Icon },
  { id: 'plans', label: 'Plans', icon: Coins01Icon },
  { id: 'account', label: 'Account', icon: UserIcon },
]

export const FloatingGlassBottomBar: React.FC<FloatingGlassBottomBarProps> = ({
  activeTab,
  onChangeTab,
}) => {
  return (
    <div className="pointer-events-none fixed bottom-4 left-1/2 z-40 w-[92%] max-w-md -translate-x-1/2">
      <nav
        aria-label="Bottom Navigation"
        className="kura-glass-bar pointer-events-auto flex items-center justify-around rounded-2xl px-2 py-2"
      >
        {NAV_ITEMS.map((item) => {
          const isActive = activeTab === item.id
          const Icon = item.icon

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onChangeTab(item.id)}
              className={`flex flex-col items-center justify-center rounded-lg px-3 py-1.5 transition ${
                isActive
                  ? 'font-semibold text-[var(--kura-teal-bright)]'
                  : 'text-[var(--kura-muted)] hover:text-[var(--kura-text)]'
              }`}
            >
              <Icon size={20} className={isActive ? 'stroke-[2.5]' : 'stroke-2'} />
              <span className="mt-1 text-[11px]">{item.label}</span>
            </button>
          )
        })}
      </nav>
    </div>
  )
}
