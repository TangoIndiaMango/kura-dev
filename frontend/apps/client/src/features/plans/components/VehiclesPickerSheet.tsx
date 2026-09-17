import React, { useMemo, useState } from 'react'
import { Search01Icon, Tick01Icon } from 'hugeicons-react'
import type { OperatorHomePlan, OperatorVehicle } from '../../../shared/session'
import { OperatorSheet } from './OperatorSheet'
import {
  findPlanForVehicle,
  isPayPerSwap,
  planCoverageLabel,
} from './VehiclePlanPicker'

interface VehiclesPickerSheetProps {
  opened: boolean
  vehicles: OperatorVehicle[]
  plans: OperatorHomePlan[]
  activeVehicleId: string
  onClose: () => void
  onSelect: (vehicleId: string) => void
}

export const VehiclesPickerSheet: React.FC<VehiclesPickerSheetProps> = ({
  opened,
  vehicles,
  plans,
  activeVehicleId,
  onClose,
  onSelect,
}) => {
  const [query, setQuery] = useState('')
  const showSearch = vehicles.length >= 5

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return vehicles
    return vehicles.filter(
      (v) =>
        v.name.toLowerCase().includes(q) ||
        v.short.toLowerCase().includes(q) ||
        v.reg.toLowerCase().includes(q),
    )
  }, [vehicles, query])

  return (
    <OperatorSheet
      opened={opened}
      title="Switch vehicle"
      onClose={() => {
        setQuery('')
        onClose()
      }}
    >
      <p className="mb-3 text-[12px] text-[var(--kura-muted)]">
        Plans are per vehicle. Pick which one to manage.
      </p>

      {showSearch ? (
        <label className="mb-3 flex items-center gap-2 rounded-xl border border-[var(--kura-border)] bg-[var(--kura-bg-elevated)] px-3 py-2.5">
          <Search01Icon size={16} className="shrink-0 text-[var(--kura-muted)]" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name or plate"
            className="min-w-0 flex-1 bg-transparent text-[13px] font-medium text-[var(--kura-text)] outline-none placeholder:text-[var(--kura-muted)]"
          />
        </label>
      ) : null}

      <ul className="flex flex-col gap-2">
        {filtered.map((v) => {
          const plan = findPlanForVehicle(plans, v)
          const active = v.id === activeVehicleId
          const coverage = planCoverageLabel(plan, v)
          const urgent =
            plan?.status === 'Expiring' || plan?.status === 'Expired'
          return (
            <li key={v.id}>
              <button
                type="button"
                onClick={() => {
                  onSelect(v.id)
                  setQuery('')
                  onClose()
                }}
                className={`flex w-full items-center gap-3 rounded-xl border px-3.5 py-3.5 text-left transition ${
                  active
                    ? 'border-[var(--kura-teal)] bg-[var(--kura-teal)]/10'
                    : 'border-[var(--kura-border)] bg-[var(--kura-bg-elevated)]'
                }`}
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14px] font-bold text-[var(--kura-text)]">
                    {v.name}
                  </span>
                  <span className="mt-0.5 block truncate text-[12px] text-[var(--kura-muted)]">
                    {coverage}
                    {plan && !isPayPerSwap(plan, v)
                      ? ` · ${plan.progressLabel}`
                      : ''}
                    {' · '}
                    {v.reg}
                  </span>
                </span>
                {urgent ? (
                  <span className="shrink-0 rounded-md bg-[var(--kura-amber)]/15 px-2 py-0.5 text-[11px] font-bold text-[var(--kura-amber)]">
                    {plan?.status}
                  </span>
                ) : null}
                {active ? (
                  <Tick01Icon
                    size={18}
                    className="shrink-0 text-[var(--kura-teal-bright)]"
                  />
                ) : null}
              </button>
            </li>
          )
        })}
      </ul>

      {filtered.length === 0 ? (
        <p className="py-6 text-center text-[13px] text-[var(--kura-muted)]">
          No vehicles match “{query}”.
        </p>
      ) : null}
    </OperatorSheet>
  )
}
