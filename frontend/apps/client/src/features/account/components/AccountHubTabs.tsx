import React, { useEffect, useRef, useState } from 'react'

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

  // More tabs than fit on a phone: fade whichever edge hides tabs, no scrollbar.
  const scroller = useRef<HTMLDivElement>(null)
  const [edges, setEdges] = useState({ left: false, right: false })
  const measure = () => {
    const el = scroller.current
    if (!el) return
    setEdges({
      left: el.scrollLeft > 4,
      right: el.scrollLeft + el.clientWidth < el.scrollWidth - 4,
    })
  }
  useEffect(() => {
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [tabs.length])
  useEffect(() => {
    scroller.current
      ?.querySelector<HTMLElement>(`[data-tab="${active}"]`)
      ?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
  }, [active])

  const mask = `linear-gradient(to right, ${edges.left ? 'transparent' : '#000'}, #000 28px, #000 calc(100% - 28px), ${edges.right ? 'transparent' : '#000'})`

  return (
    <div
      ref={scroller}
      onScroll={measure}
      role="tablist"
      className="-mx-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      style={{ maskImage: mask, WebkitMaskImage: mask }}
    >
      <div className="flex min-w-max gap-1.5 px-1">
        {tabs.map((tab) => {
          const on = tab.id === active
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={on}
              data-tab={tab.id}
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
