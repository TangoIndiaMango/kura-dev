import React from 'react'

export type AccountHubTab =
  | 'profile'
  | 'vehicles'
  | 'drivers'
  | 'spend'
  | 'payments'
  | 'engine'
  | 'settings'

const ALL_TABS: Array<{ id: AccountHubTab; label: string }> = [
  { id: 'profile', label: 'Profile' },
  { id: 'vehicles', label: 'Vehicles' },
  { id: 'drivers', label: 'Drivers' },
  { id: 'spend', label: 'Spend' },
  { id: 'payments', label: 'Payments' },
  { id: 'engine', label: 'Stored engine' },
  { id: 'settings', label: 'Settings' },
]

interface AccountHubTabsProps {
  active: AccountHubTab
  onChange: (tab: AccountHubTab) => void
  /** When false, hide Stored engine (no custody records for this account). */
  showEngineTab?: boolean
  /** Soft fleet — drivers tab when account is FLEET or has 2+ vehicles. */
  showDriversTab?: boolean
  /** Account owner only — fleet money is not shown to peer drivers. */
  showSpendTab?: boolean
}

export const AccountHubTabs: React.FC<AccountHubTabsProps> = ({
  active,
  onChange,
  showEngineTab = true,
  showDriversTab = false,
  showSpendTab = false,
}) => {
  let tabs = ALL_TABS
  if (!showEngineTab) tabs = tabs.filter((t) => t.id !== 'engine')
  if (!showDriversTab) tabs = tabs.filter((t) => t.id !== 'drivers')
  if (!showSpendTab) tabs = tabs.filter((t) => t.id !== 'spend')

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
