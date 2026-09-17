import { useState } from 'react'
import dayjs from 'dayjs'
import { DateRangePicker, type DateRangeOutput } from '@shared/components'
import { DashboardKpiGrid } from './components/DashboardKpiGrid'
import { DashboardSwapsChart } from './components/DashboardSwapsChart'
import { DashboardHubStrip } from './components/DashboardHubStrip'
import { DashboardActivityFeed } from './components/DashboardActivityFeed'

function defaultMonthRange(): DateRangeOutput {
  return {
    start_date: dayjs().startOf('month').format('YYYY-MM-DD'),
    end_date: dayjs().endOf('month').format('YYYY-MM-DD'),
  }
}

export function AdminDashboardView() {
  const [dateRange, setDateRange] = useState<DateRangeOutput>(defaultMonthRange)

  return (
    <div className="flex w-full flex-col gap-4">
      <div className="relative flex flex-col gap-4 rounded-[12px] border border-[var(--bd)] bg-[var(--sf)] p-5 shadow-[var(--sh)]">
        <div className="flex items-center justify-between gap-4">
          <div className="text-[17px] font-bold text-[var(--tx)]">Overview</div>
          <DateRangePicker date={dateRange} onChange={setDateRange} />
        </div>
        <DashboardKpiGrid />
        <DashboardSwapsChart />
      </div>

      <DashboardHubStrip />
      <DashboardActivityFeed />
    </div>
  )
}
