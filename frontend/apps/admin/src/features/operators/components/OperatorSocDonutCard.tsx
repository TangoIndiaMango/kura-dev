import { DonutChart } from '@mantine/charts'
import { Skeleton } from '@mantine/core'
import { SecurityCheckIcon } from 'hugeicons-react'
import type { AccountDetailStats } from '../types'

interface OperatorSocDonutCardProps {
  stats?: AccountDetailStats
  isLoading?: boolean
}

export function OperatorSocDonutCard({
  stats,
  isLoading,
}: OperatorSocDonutCardProps) {
  if (isLoading && !stats) {
    return (
      <div className="flex h-full min-h-[300px] flex-col justify-between rounded-[14px] border border-[var(--bd)] bg-[var(--sf)] p-4 shadow-[var(--sh)] sm:p-5">
        <Skeleton height={18} width={160} radius="sm" className="mb-3" />
        <div className="flex flex-1 items-center justify-center">
          <Skeleton height={140} width={140} circle />
        </div>
        <Skeleton height={14} width="80%" radius="sm" className="mt-3" />
      </div>
    )
  }

  const avgSoc = stats?.avg_returned_soc ?? 0
  const totalSwaps = stats?.swaps_count ?? 0

  const distribution = stats?.soc_distribution ?? [
    { name: 'Optimal (>20%)', value: 0, color: '#0D7C8F' },
    { name: 'Adequate (12–20%)', value: 0, color: '#4FC3F7' },
    { name: 'Critical (<12%)', value: 0, color: '#E74C3C' },
  ]

  const hasData = distribution.some((d) => d.value > 0)
  const criticalSlice = distribution.find((d) => d.name.includes('Critical'))
  const criticalCount = criticalSlice?.value ?? 0
  const isHealthy = criticalCount === 0

  return (
    <div className="flex h-full min-h-[320px] flex-col justify-between rounded-[14px] border border-[var(--bd)] bg-[var(--sf)] p-4 shadow-[var(--sh)] sm:p-5">
      <div>
        <div className="flex items-center justify-between">
          <h3 className="text-[13.5px] font-bold text-[var(--tx)]">
            Battery Return Health
          </h3>
          <span className="flex items-center gap-1 rounded-[6px] bg-[var(--in)] px-2 py-0.5 text-[10.5px] font-bold tracking-wide text-[var(--mu)]">
            <SecurityCheckIcon size={13} color="var(--pr)" />
            <span>PACK DISCIPLINE</span>
          </span>
        </div>
        <p className="mt-0.5 text-[11.5px] text-[var(--mu)]">
          Distribution of State of Charge at hub arrival
        </p>
      </div>

      <div className="my-2 flex flex-1 flex-col items-center justify-center">
        {totalSwaps === 0 || !hasData ? (
          <div className="flex flex-col items-center justify-center py-6 text-center text-[12px] text-[var(--mu)]">
            <span className="text-[26px] font-extrabold text-[var(--tx)]">
              {avgSoc}%
            </span>
            <span className="mt-1">Awaiting return cycle data</span>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <DonutChart
              data={distribution}
              size={135}
              thickness={18}
              withLabels={false}
              withTooltip
              chartLabel={`${avgSoc}%`}
            />
            <ul className="mt-3 flex flex-wrap justify-center gap-x-3 gap-y-1 text-[11px] text-[var(--mu)]">
              {distribution.map((slice) => (
                <li key={slice.name} className="flex items-center gap-1.5">
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ background: slice.color }}
                  />
                  <span>
                    {slice.name}: <strong className="text-[var(--tx)]">{slice.value}</strong>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className={`mt-2 rounded-[8px] border px-2.5 py-2 text-[11.5px] ${
        isHealthy
          ? 'border-emerald-500/20 bg-emerald-500/5 text-emerald-600'
          : 'border-rose-500/20 bg-rose-500/5 text-rose-600'
      }`}>
        <p className="font-semibold">
          {isHealthy
            ? '✓ Safe battery buffer maintained (>12% SoC on swap)'
            : `⚠️ ${criticalCount} swaps returned with deep depletion (<12% SoC)`}
        </p>
      </div>
    </div>
  )
}
