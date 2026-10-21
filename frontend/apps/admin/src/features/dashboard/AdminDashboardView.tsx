import { DashboardKpiGrid } from './components/DashboardKpiGrid'
import { DashboardSwapsChart } from './components/DashboardSwapsChart'
import { DashboardHubStrip } from './components/DashboardHubStrip'
import { DashboardActivityFeed } from './components/DashboardActivityFeed'

export function AdminDashboardView() {
  return (
    <div className="flex w-full flex-col gap-4">
      <div className="relative flex flex-col gap-4 rounded-[12px] border border-[var(--bd)] bg-[var(--sf)] p-5 shadow-[var(--sh)]">
        <div className="flex items-center justify-between gap-4">
          <div className="text-[17px] font-bold text-[var(--tx)]">Today</div>
          <div className="text-[12px] text-[var(--mu)]">Lagos time · refreshes every 30 s</div>
        </div>
        <DashboardKpiGrid />
        <DashboardSwapsChart />
      </div>

      <DashboardHubStrip />
      <DashboardActivityFeed />
    </div>
  )
}
