import { AdminModuleLayout } from '@shared/components'
import { useUrlTab } from '@shared/hooks/useUrlTab'
import { useCapabilities } from '../auth/useCapabilities'
import { ReportsExploreTab } from './ReportsExploreTab'
import { ReportsHistoryTab } from './ReportsHistoryTab'
import { ReportsSummaryTab } from './ReportsSummaryTab'

/** Summary (revenue staff and chairmen), Explore (exports) and History. */
export function ReportsPanel() {
  const { can } = useCapabilities()
  const hasSummary = can('analytics:revenue') || can('analytics:cooperative')
  const tabs = [
    ...(hasSummary ? [{ id: 'summary', label: 'Summary' }] : []),
    { id: 'explore', label: 'Explore' },
    { id: 'history', label: 'History' },
  ]
  const [tab, setTab] = useUrlTab(tabs[0].id, { valid: tabs.map((t) => t.id) })

  return (
    <AdminModuleLayout
      title="Reports"
      subtitle="The whole business for the dates you pick, and exports of any module you can see."
      tabs={tabs}
      activeTab={tab}
      onTabChange={setTab}
      contentVariant="bare"
    >
      {tab === 'summary' && hasSummary ? <ReportsSummaryTab /> : null}
      {tab === 'explore' ? <ReportsExploreTab /> : null}
      {tab === 'history' ? <ReportsHistoryTab /> : null}
    </AdminModuleLayout>
  )
}
