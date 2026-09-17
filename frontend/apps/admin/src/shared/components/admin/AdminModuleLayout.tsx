import type { ReactNode } from 'react'
import { AdminKpiCard, type AdminKpiCardProps } from './AdminKpiCard'

export interface AdminModuleTab {
  id: string
  label: string
}

export interface AdminModuleLayoutProps {
  title: string
  subtitle?: string
  tabs?: AdminModuleTab[]
  activeTab?: string
  onTabChange?: (id: string) => void
  kpis?: AdminKpiCardProps[]
  /** Shown top-right on the Overview card (DateRangePicker). */
  dateRangeSlot?: ReactNode
  overviewTitle?: string
  chartsSlot?: ReactNode
  /** `bare` skips the outer content card (settings pages with their own section cards). */
  contentVariant?: 'card' | 'bare'
  children?: ReactNode
}

export function AdminModuleLayout({
  title,
  subtitle,
  tabs,
  activeTab,
  onTabChange,
  kpis = [],
  dateRangeSlot,
  overviewTitle = 'Overview',
  chartsSlot,
  contentVariant = 'card',
  children,
}: AdminModuleLayoutProps) {
  const showOverviewCard = kpis.length > 0 || Boolean(dateRangeSlot)

  return (
    <div className="flex min-w-0 flex-col gap-5">
      <div className="min-w-0">
        <h1 className="text-[22px] font-bold tracking-tight text-[var(--tx)]">{title}</h1>
        {subtitle ? (
          <p className="mt-1 text-[13px] text-[var(--mu)]">{subtitle}</p>
        ) : null}
      </div>

      {tabs && tabs.length > 0 ? (
        <div className="flex gap-1 border-b border-[var(--bd)]">
          {tabs.map((tab) => {
            const isActive = tab.id === activeTab
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onTabChange?.(tab.id)}
                className={`-mb-px px-3.5 py-2.5 text-[13px] font-semibold transition-colors ${
                  isActive
                    ? 'border-b-2 border-[var(--pr)] text-[var(--pr)]'
                    : 'border-b-2 border-transparent text-[var(--mu)] hover:text-[var(--tx)]'
                }`}
              >
                {tab.label}
              </button>
            )
          })}
        </div>
      ) : null}

      {showOverviewCard ? (
        <div className="rounded-[12px] border border-[var(--bd)] bg-[var(--sf)] p-5 shadow-[var(--sh)]">
          {dateRangeSlot ? (
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div className="text-[17px] font-bold text-[var(--tx)]">{overviewTitle}</div>
              <div className="shrink-0">{dateRangeSlot}</div>
            </div>
          ) : null}
          {kpis.length > 0 ? (
            <div
              className={
                kpis.length >= 5
                  ? 'grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5'
                  : 'grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4'
              }
            >
              {kpis.map((kpi) => (
                <AdminKpiCard key={kpi.title} {...kpi} />
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      {chartsSlot ? (
        <div className="relative z-0 w-full overflow-hidden">{chartsSlot}</div>
      ) : null}

      {children ? (
        contentVariant === 'bare' ? (
          <div className="relative z-[1] min-w-0">{children}</div>
        ) : (
          <div className="relative z-[1] min-w-0 rounded-[12px] border border-[var(--bd)] bg-[var(--sf)] shadow-[var(--sh)]">
            {children}
          </div>
        )
      ) : null}
    </div>
  )
}
