import { useMemo } from 'react'
import { AdminBarChart, ADMIN_CHART_COLORS } from '@shared/components/charts'
import { useCapabilities } from '@features/auth'
import { useHubDemandForecast } from './hooks/use-demand-forecast'

export function HubNetworkCharts({
  readyByHub,
}: {
  readyByHub: Array<{ label: string; ready: number }>
}) {
  const { can } = useCapabilities()
  const { forecasts } = useHubDemandForecast({
    enabled: can('hubs:read'),
  })
  const demandByHub = useMemo(
    () =>
      forecasts.map((row) => ({
        label: row.hub_code.replace(/^HUB-/, ''),
        expected: row.expected_swaps_next_24h,
      })),
    [forecasts],
  )

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="rounded-[12px] border border-[var(--bd)] bg-[var(--sf)] p-4 shadow-[var(--sh)]">
        <h3 className="mb-3 text-[13px] font-bold text-[var(--tx)]">
          Ready inventory by hub
        </h3>
        <AdminBarChart
          data={readyByHub.length ? readyByHub : [{ label: '—', ready: 0 }]}
          series={[
            {
              dataKey: 'ready',
              name: 'Ready packs',
              color: ADMIN_CHART_COLORS.teal,
            },
          ]}
          height={200}
        />
      </div>
      <div className="rounded-[12px] border border-[var(--bd)] bg-[var(--sf)] p-4 shadow-[var(--sh)]">
        <h3 className="text-[13px] font-bold text-[var(--tx)]">
          Expected swaps · next 24h
        </h3>
        <p className="mb-3 text-[11px] text-[var(--mu)]">
          Trailing 28-day daily average · low confidence when history is sparse
        </p>
        <AdminBarChart
          data={
            demandByHub.length
              ? demandByHub
              : [{ label: '—', expected: 0 }]
          }
          series={[
            {
              dataKey: 'expected',
              name: 'Expected swaps',
              color: ADMIN_CHART_COLORS.amber,
            },
          ]}
          height={200}
        />
      </div>
    </div>
  )
}
