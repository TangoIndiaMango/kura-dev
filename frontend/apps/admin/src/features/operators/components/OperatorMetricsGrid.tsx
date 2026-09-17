import { Skeleton } from '@mantine/core'
import {
  BatteryCharging01Icon,
  FlashIcon,
  FuelStationIcon,
  Activity01Icon,
} from 'hugeicons-react'
import { formatNaira } from '@shared/utils/currency'
import type { AccountDetailStats } from '../types'

interface OperatorMetricsGridProps {
  stats?: AccountDetailStats
  isLoading?: boolean
}

export function OperatorMetricsGrid({ stats, isLoading }: OperatorMetricsGridProps) {
  if (isLoading && !stats) {
    return (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="rounded-[14px] border border-[var(--bd)] bg-[var(--sf)] p-4 shadow-[var(--sh)]"
          >
            <Skeleton height={14} width="40%" radius="sm" className="mb-2" />
            <Skeleton height={28} width="70%" radius="sm" className="mb-2" />
            <Skeleton height={12} width="50%" radius="sm" />
          </div>
        ))}
      </div>
    )
  }

  const swapsCount = stats?.swaps_count ?? 0
  const swapsPerDay = stats?.swaps_per_day ?? 0
  const energyKwh = stats?.energy_kwh_total ?? 0
  const fuelSavedKobo = stats?.fuel_saved_kobo ?? 0
  const avgSoc = stats?.avg_returned_soc ?? 0

  const velocityOk = swapsPerDay >= 2.0
  const socSafe = avgSoc >= 12

  const cards = [
    {
      id: 'swaps',
      title: 'Swaps Velocity',
      value: swapsCount.toLocaleString(),
      sub: `${swapsPerDay} / day avg`,
      badge: velocityOk ? 'Target met' : 'Below target',
      badgeTone: velocityOk ? 'bg-[var(--prs)] text-[var(--pr)]' : 'bg-amber-500/10 text-amber-600',
      icon: <BatteryCharging01Icon size={18} color="var(--pr)" />,
    },
    {
      id: 'energy',
      title: 'Delivered Energy',
      value: `${energyKwh.toLocaleString()} kWh`,
      sub: 'Pack SoC throughput',
      badge: '3.24 kWh DoD',
      badgeTone: 'bg-[var(--in)] text-[var(--tx)]',
      icon: <FlashIcon size={18} color="var(--pr)" />,
    },
    {
      id: 'fuel',
      title: 'Displaced Petrol',
      value: formatNaira(fuelSavedKobo, { fromKobo: true }),
      sub: 'PMS offset equivalent',
      badge: '₦800/L benchmark',
      badgeTone: 'bg-emerald-500/10 text-emerald-600',
      icon: <FuelStationIcon size={18} color="var(--pr)" />,
    },
    {
      id: 'soc',
      title: 'Avg Return SoC',
      value: `${avgSoc}%`,
      sub: 'Battery depletion buffer',
      badge: socSafe ? 'Healthy > 10%' : 'Depleted < 10%',
      badgeTone: socSafe ? 'bg-[var(--prs)] text-[var(--pr)]' : 'bg-rose-500/10 text-rose-600',
      icon: <Activity01Icon size={18} color="var(--pr)" />,
    },
  ]

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((c) => (
        <div
          key={c.id}
          className="flex flex-col justify-between rounded-[14px] border border-[var(--bd)] bg-[var(--sf)] p-4 shadow-[var(--sh)] transition-all hover:border-[var(--bd-h)]"
        >
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-semibold text-[var(--mu)]">
              {c.title}
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-[8px] bg-[var(--in)] border border-[var(--bd)]">
              {c.icon}
            </div>
          </div>

          <div className="my-2.5">
            <span className="text-[24px] font-extrabold tracking-tight text-[var(--tx)]">
              {c.value}
            </span>
          </div>

          <div className="flex items-center justify-between gap-1 border-t border-[var(--bd)]/60 pt-2 text-[11.5px]">
            <span className="text-[var(--mu)] truncate">{c.sub}</span>
            <span className={`rounded-[4px] px-1.5 py-0.5 font-bold uppercase tracking-wider text-[10px] ${c.badgeTone}`}>
              {c.badge}
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}
