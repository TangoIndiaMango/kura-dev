import {
  AdminModuleLayout,
  useAdminModuleControls,
} from '@shared/components'
import { useUrlTab } from '@shared/hooks/useUrlTab'
import { RevenueCohortsTab } from './RevenueCohortsTab'
import { RevenueLiveOverview } from './RevenueLiveOverview'
import {
  RevenueSettingsTab,
  useRevenueAnalyticsSettings,
} from './RevenueSettingsTab'
import { RevenueStreamsTab } from './RevenueStreamsTab'
import { formatPct } from './revenueMath'
import { useRevenueRetention } from './useRevenueCohorts'
import { useRevenueOverview } from './useRevenueOverview'

function compactKobo(value: number) {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value / 100)
}

export function RevenuePanel() {
  const [tab, setTab] = useUrlTab('overview', {
    valid: ['overview', 'streams', 'cohorts', 'settings'],
  })
  const controls = useAdminModuleControls({
    scope: 'revenue',
    statusOptions: [],
    includeDateRangeInFilter: false,
  })
  const analyticsSettings = useRevenueAnalyticsSettings()
  const query = useRevenueOverview({
    start_date: controls.dateRange.start_date || undefined,
    end_date: controls.dateRange.end_date || undefined,
  })
  const data = query.data

  const liveKpis = [
    {
      title: 'Revenue',
      value: data ? compactKobo(data.gross_kobo) : '—',
      sub: 'Paid for services · wallet top-ups excluded',
      tone: 'success' as const,
    },
    {
      title: 'VAT recorded',
      value: data ? compactKobo(data.vat_kobo) : '—',
      sub: 'Server-recorded kobo',
    },
    {
      title: 'Outstanding',
      value: data ? compactKobo(data.outstanding_kobo) : '—',
      sub: `${data?.outstanding_transactions ?? 0} pending transactions`,
      tone: data?.outstanding_kobo ? ('warning' as const) : ('default' as const),
    },
    {
      title: 'Active plans',
      value: String(data?.subscriptions.active ?? 0),
      sub: `${data?.subscriptions.pending ?? 0} awaiting payment`,
    },
  ]

  // Streams and cohorts tabs: riders and plans over the last 30 days.
  const retention = useRevenueRetention(tab !== 'overview' && tab !== 'settings')
  const r = retention.data
  const retentionKpis = [
    {
      title: 'Active riders · 30d',
      value: r ? r.active_riders.toLocaleString('en-NG') : '—',
      sub: r ? `${r.active_riders_before.toLocaleString('en-NG')} the 30 days before` : 'Paid or swapped',
    },
    {
      title: 'Rider churn · 30d',
      value: formatPct(r?.churn_pct),
      sub: r ? `${r.churned_riders} stopped` : 'Active before, not since',
      tone:
        r?.churn_pct != null && r.churn_pct > analyticsSettings.settings.churnWarnPct
          ? ('warning' as const)
          : ('default' as const),
    },
    {
      title: 'Plan renewal · 30d',
      value: formatPct(r?.renewal_pct),
      sub: r ? `${r.plans_renewed} of ${r.plans_ended} plans that ended` : 'Renewed within 3 days',
      tone: r?.renewal_pct != null ? ('success' as const) : ('default' as const),
    },
    {
      title: 'Active plans',
      value: r ? r.active_plans.toLocaleString('en-NG') : '—',
      sub: 'Right now',
    },
  ]

  return (
    <>
      <AdminModuleLayout
        title="Revenue Analytics"
        subtitle="Collections, streams and rider cohorts from KURA's own payments and swaps"
        dateRangeSlot={tab === 'overview' || tab === 'streams' ? controls.dateRangeSlot : null}
        tabs={[
          { id: 'overview', label: 'Revenue' },
          { id: 'streams', label: 'Revenue streams' },
          { id: 'cohorts', label: 'Cohorts & ARPU' },
          { id: 'settings', label: 'Assumptions' },
        ]}
        activeTab={tab}
        onTabChange={setTab}
        kpis={tab === 'overview' ? liveKpis : tab === 'settings' ? [] : retentionKpis}
      >
        {tab === 'overview' ? (
          <RevenueLiveOverview
            data={data}
            isLoading={query.isLoading}
            isError={query.isError}
          />
        ) : null}
        {tab === 'streams' ? (
          <RevenueStreamsTab range={controls.dateRange} />
        ) : null}
        {tab === 'cohorts' ? <RevenueCohortsTab /> : null}
        {tab === 'settings' ? (
          <RevenueSettingsTab
            draft={analyticsSettings.draft}
            setDraft={analyticsSettings.setDraft}
            dirty={analyticsSettings.dirty}
            partnersOk={analyticsSettings.partnersOk}
            onSave={analyticsSettings.save}
            onReset={analyticsSettings.reset}
            onRestoreDefaults={analyticsSettings.restoreDefaults}
          />
        ) : null}
      </AdminModuleLayout>
      {controls.filterModal}
    </>
  )
}
