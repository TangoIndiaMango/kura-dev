import React from 'react'
import { Tick01Icon } from 'hugeicons-react'
import { OperatorPrimaryButton } from '../../../shared/components/operator/OperatorPrimaryButton'

export interface SwapVehicle {
  id: string
  name: string
  short: string
  reg: string
  battery: string
  /** Pack type the hub must stock (e.g. "Titan 72V"), not the mounted serial. */
  batteryType?: string | null
  plan: string
  payPerSwapNaira?: number | null
}

interface SelectVehicleStepProps {
  vehicles: SwapVehicle[]
  selectedId: string | null
  onSelect: (id: string) => void
  onContinue: () => void
  loading?: boolean
}

export const SelectVehicleStep: React.FC<SelectVehicleStepProps> = ({
  vehicles,
  selectedId,
  onSelect,
  onContinue,
  loading = false,
}) => {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-bold text-[var(--kura-text)]">Select vehicle</h2>
        <p className="mt-1 text-xs text-[var(--kura-muted)]">
          Choose which vehicle needs a battery swap.
        </p>
      </div>

      {loading ? (
        <div className="flex flex-col gap-2">
          {[0, 1].map((i) => (
            <div
              key={i}
              className="h-[72px] animate-pulse rounded-2xl bg-[var(--kura-border)]/40"
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {vehicles.map((v) => {
            const active = v.id === selectedId
            return (
              <button
                key={v.id}
                type="button"
                onClick={() => onSelect(v.id)}
                className={`flex items-center justify-between rounded-xl border px-4 py-4 text-left transition ${
                  active
                    ? 'border-[var(--kura-teal)] bg-[var(--kura-teal)]/10'
                    : 'border-[var(--kura-border)] bg-[var(--kura-bg-elevated)]'
                }`}
              >
                <span className="flex flex-col gap-0.5">
                  <span className="text-[15px] font-bold text-[var(--kura-text)]">
                    {v.name}
                  </span>
                  <span className="text-[12px] text-[var(--kura-muted)]">
                    {v.reg} · {v.battery}
                  </span>
                  <span className="text-[11px] text-[var(--kura-teal-bright)]">
                    Plan · {v.plan}
                  </span>
                </span>
                {active ? (
                  <Tick01Icon
                    size={18}
                    className="text-[var(--kura-teal-bright)]"
                  />
                ) : null}
              </button>
            )
          })}
        </div>
      )}

      <OperatorPrimaryButton
        onClick={onContinue}
        disabled={!selectedId || loading}
      >
        Continue
      </OperatorPrimaryButton>
    </div>
  )
}
