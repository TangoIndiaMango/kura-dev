import React from 'react'

export type AccountHubTab =
  | 'profile'
  | 'vehicles'
  | 'payments'
  | 'engine'
  | 'settings'

const ALL_TABS: Array<{ id: AccountHubTab; label: string }> = [
  { id: 'profile', label: 'Profile' },
  { id: 'vehicles', label: 'Vehicles' },
  { id: 'payments', label: 'Payments' },
  { id: 'engine', label: 'Stored engine' },
  { id: 'settings', label: 'Settings' },
]

interface AccountHubTabsProps {
  active: AccountHubTab
  onChange: (tab: AccountHubTab) => void
  /** When false, hide Stored engine (no custody records for this account). */
  showEngineTab?: boolean
}

export const AccountHubTabs: React.FC<AccountHubTabsProps> = ({
  active,
  onChange,
  showEngineTab = true,
}) => {
  const tabs = showEngineTab
    ? ALL_TABS
    : ALL_TABS.filter((t) => t.id !== 'engine')

  return (
    <div className="-mx-1 overflow-x-auto pb-1">
      <div className="flex min-w-max gap-1.5 px-1">
        {tabs.map((tab) => {
          const on = tab.id === active
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChange(tab.id)}
              className={`rounded-xl px-3.5 py-2 text-[12px] font-bold transition ${
                on
                  ? 'border border-[var(--kura-teal)]/50 bg-[var(--kura-bg-elevated)] text-[var(--kura-text)]'
                  : 'border border-transparent text-[var(--kura-muted)] hover:text-[var(--kura-text)]'
              }`}
            >
              {tab.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
