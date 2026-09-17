import React from 'react'
import { ArrowLeft01Icon, Tick01Icon } from 'hugeicons-react'
import { OperatorPrimaryButton } from '../../shared/components/operator/OperatorPrimaryButton'

export interface VehicleOption {
  id: string
  name: string
  plate: string
  battery: string
}

interface VehicleScreenProps {
  options: VehicleOption[]
  selectedId: string | null
  onSelect: (id: string) => void
  onContinue: () => void
  onBack: () => void
}

export const VehicleScreen: React.FC<VehicleScreenProps> = ({
  options,
  selectedId,
  onSelect,
  onContinue,
  onBack,
}) => {
  return (
    <div className="flex min-h-full flex-col px-5 pb-8 pt-6">
      <button
        type="button"
        onClick={onBack}
        className="mb-8 inline-flex items-center gap-1 self-start text-sm text-[var(--kura-muted)]"
      >
        <ArrowLeft01Icon size={16} />
        Back
      </button>

      <h1 className="text-[26px] font-bold tracking-tight text-[var(--kura-text)]">
        Add your vehicle
      </h1>
      <p className="mt-2 text-[14px] leading-relaxed text-[var(--kura-muted)]">
        Pick the vehicle you will swap batteries for.
      </p>

      <div className="mt-8 flex flex-col gap-3">
        {options.map((v) => {
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
                  {v.plate} · {v.battery}
                </span>
              </span>
              {active ? (
                <Tick01Icon size={18} className="text-[var(--kura-teal-bright)]" />
              ) : null}
            </button>
          )
        })}
      </div>

      <div className="mt-auto pt-10">
        <OperatorPrimaryButton onClick={onContinue} disabled={!selectedId}>
          Continue
        </OperatorPrimaryButton>
      </div>
    </div>
  )
}
