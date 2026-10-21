import {
  AdminModuleLayout,
  DemoDataBanner,
  useAdminModuleControls,
} from '@shared/components'
import { useUrlTab } from '@shared/hooks/useUrlTab'
import {
  MOCK_REVENUE_COLLECTIONS,
  MOCK_REVENUE_STREAMS,
} from '@shared/mock/adminMockData'
import { RevenueCohortsTab } from './RevenueCohortsTab'
import { RevenueLiveOverview } from './RevenueLiveOverview'
import {
  RevenueSettingsTab,
  useRevenueAnalyticsSettings,
} from './RevenueSettingsTab'
import { RevenueStreamsTab } from './RevenueStreamsTab'
import {
  formatCompactNaira,
  formatPct,
  scaleCollections,
  scaleStreams,
  sumStreams,
} from './revenueMath'
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
      title: 'Gross collected',
      value: data ? compactKobo(data.gross_kobo) : '—',
      sub: 'Successful payments',
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

  const collections = scaleCollections(MOCK_REVENUE_COLLECTIONS, controls.dateRange)
  const modelledTotal = sumStreams(
    scaleStreams(MOCK_REVENUE_STREAMS, controls.dateRange),
  )
  const modelKpis = [
    {
      title: 'Modelled revenue',
      value: formatCompactNaira(modelledTotal),
      sub: 'Planning model · not ledger',
      tone: 'default' as const,
    },
    {
      title: 'MRR',
      value: formatCompactNaira(collections.mrrNaira),
      sub: `${collections.activeOperators} active operators`,
    },
    {
      title: 'Renewal rate',
      value: formatPct(collections.renewalRatePct),
      sub: 'Plan renewals',
      tone: 'success' as const,
    },
    {
      title: 'Churn · 30d',
      value: formatPct(collections.churn30dPct),
      sub: 'Modelled attrition',
      tone: 'warning' as const,
    },
  ]

  return (
    <>
      <AdminModuleLayout
        title="Revenue Analytics"
        subtitle="Live collections from the ledger, plus revenue-model planning views"
        dateRangeSlot={tab === 'settings' ? null : controls.dateRangeSlot}
        tabs={[
          { id: 'overview', label: 'Live collections' },
          { id: 'streams', label: 'Revenue streams' },
          { id: 'cohorts', label: 'Cohorts & ARPU' },
          { id: 'settings', label: 'Assumptions' },
        ]}
        activeTab={tab}
        onTabChange={setTab}
        kpis={tab === 'overview' ? liveKpis : modelKpis}
      >
        {tab !== 'overview' ? (
          <div className="mb-3">
            <DemoDataBanner
              module="Revenue model"
              detail="Streams / cohorts use planning assumptions — not ledger truth. Use Live collections for ops."
            />
          </div>
        ) : null}
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
