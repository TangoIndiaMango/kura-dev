import React from 'react'
import { ArrowDown01Icon } from 'hugeicons-react'
import type { OperatorHomePlan, OperatorVehicle } from '../../../shared/session'
import {
  catalogById,
  resolvePlanOptionId,
} from '../planCatalog'

export function findPlanForVehicle(
  plans: OperatorHomePlan[],
  vehicle: OperatorVehicle,
) {
  const byId = plans.find((p) => p.vehicleId === vehicle.id)
  if (byId) return byId

  const byExact = plans.find(
    (p) => p.vehicle === vehicle.name || p.vehicle === vehicle.short,
  )
  if (byExact) return byExact

  const name = vehicle.name.toLowerCase()
  const short = vehicle.short.toLowerCase()
  return (
    plans.find((p) => {
      const label = p.vehicle.toLowerCase()
      return label.includes(short) || name.includes(label) || label.includes(name)
    }) ?? null
  )
}

export function isPayPerSwap(
  plan: OperatorHomePlan | null,
  vehicle: OperatorVehicle | null,
) {
  if (!vehicle) return true
  if (vehicle.plan === 'None' || vehicle.plan === 'Pay-per-swap') return true
  const optionId =
    plan?.planOptionId ??
    (plan ? resolvePlanOptionId(plan.subtitle) : null) ??
    resolvePlanOptionId(vehicle.plan)
  return !plan || optionId === 'pps' || optionId == null
}

/** Coverage label for chips / lists — not vehicle “Active”. */
export function planCoverageLabel(
  plan: OperatorHomePlan | null,
  vehicle: OperatorVehicle,
) {
  if (isPayPerSwap(plan, vehicle)) return 'Pay/swap'

  if (plan?.status === 'Expiring') {
    return plan.daysLeft <= 2
      ? `${plan.daysLeft}d left`
      : `Expiring · ${plan.daysLeft}d`
  }
  if (plan?.status === 'Expired') return 'Expired'

  const optionId =
    plan?.planOptionId ?? resolvePlanOptionId(plan?.subtitle ?? vehicle.plan)
  return catalogById(optionId ?? '')?.name ?? vehicle.plan
}

interface VehiclePlanPickerProps {
  vehicles: OperatorVehicle[]
  plans: OperatorHomePlan[]
  activeVehicleId: string
  /** Opens the vehicle switcher sheet (2+ vehicles). */
  onOpenSwitcher: () => void
}

/**
 * Account-style context switcher: one clear active vehicle.
 * 1 vehicle → static context. 2+ → tap to switch via sheet.
 */
export const VehiclePlanPicker: React.FC<VehiclePlanPickerProps> = ({
  vehicles,
  plans,
  activeVehicleId,
  onOpenSwitcher,
}) => {
  if (vehicles.length === 0) return null

  const active =
    vehicles.find((v) => v.id === activeVehicleId) ?? vehicles[0]
  const plan = findPlanForVehicle(plans, active)
  const coverage = planCoverageLabel(plan, active)
  const detail =
    plan && !isPayPerSwap(plan, active)
      ? `${coverage} · ${plan.progressLabel}`
      : coverage
  const canSwitch = vehicles.length > 1

  const body = (
    <>
      <div className="min-w-0 flex-1 text-left">
        <p className="truncate text-[14px] font-bold text-[var(--kura-text)]">
          {active.name}
        </p>
        <p className="truncate text-[12px] text-[var(--kura-muted)]">{detail}</p>
      </div>
      {canSwitch ? (
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[var(--kura-border)] bg-[var(--kura-bg)] text-[var(--kura-teal-bright)]">
          <ArrowDown01Icon size={18} />
        </span>
      ) : null}
    </>
  )

  if (!canSwitch) {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-[var(--kura-border)] bg-[var(--kura-bg-elevated)] px-3.5 py-3">
        {body}
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={onOpenSwitcher}
      className="flex w-full items-center gap-3 rounded-2xl border border-[var(--kura-border)] bg-[var(--kura-bg-elevated)] px-3.5 py-3 text-left transition active:scale-[0.99]"
      aria-haspopup="dialog"
      aria-label={`Current vehicle ${active.name}. Switch vehicle.`}
    >
      {body}
    </button>
  )
}
