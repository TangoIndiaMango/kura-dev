import React, { useState } from 'react'
import { TextInput } from '@mantine/core'
import { ArrowLeft01Icon, Tick01Icon } from 'hugeicons-react'
import { notifications } from '@mantine/notifications'
import { useAuth } from '../../auth/AuthProvider'
import { apiErrorMessage } from '../../../lib/api/auth'
import { KuraIllustrationModal } from '../../../shared/components'
import { OperatorPrimaryButton } from '../../../shared/components/operator/OperatorPrimaryButton'
import { useOperatorWallet } from '../../wallet/hooks/use-operator-wallet'
import {
  useCreateVehicle,
  useVehicleModels,
  type VehicleDetailApi,
} from '../hooks/use-swap-live'

export type AddedVehicleResult = {
  id: string
  name: string
  short: string
  reg: string
  battery: string
}

interface AddVehicleStepProps {
  onAdded: (vehicle: AddedVehicleResult) => void
  onBack?: () => void
  submitLabel?: string
  title?: string
  subtitle?: string
}

export const AddVehicleStep: React.FC<AddVehicleStepProps> = ({
  onAdded,
  onBack,
  submitLabel = 'Continue',
  title = 'Add a vehicle',
  subtitle = 'Pick a catalogue model and enter your plate — saved only on your account.',
}) => {
  const { isAuthenticated } = useAuth()
  const modelsQuery = useVehicleModels({ enabled: isAuthenticated })
  const wallet = useOperatorWallet({ enabled: isAuthenticated })
  const createMut = useCreateVehicle()

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [plate, setPlate] = useState('')
  const [hardwareId, setHardwareId] = useState('')
  const [busyOpen, setBusyOpen] = useState(false)

  const models = modelsQuery.models
  const modelsLoading = isAuthenticated && modelsQuery.isLoading
  const plateOk = plate.trim().length >= 5
  // Optional: bikes without telematics have no controller serial (backend allows blank).
  const hardwareIdOk = hardwareId.trim().length === 0 || hardwareId.trim().length >= 4
  const canSubmit =
    Boolean(selectedId) && plateOk && hardwareIdOk && isAuthenticated

  const submitLive = async () => {
    if (!selectedId || !plateOk) return
    setBusyOpen(true)
    try {
      const row = (await createMut.mutateAsync({
        vehicle_model_id: selectedId,
        registration_plate: plate.trim().toUpperCase(),
        hardware_id: hardwareId.trim().toUpperCase(),
        ...(wallet.wallet?.account_id
          ? { account_id: wallet.wallet.account_id }
          : {}),
      })) as VehicleDetailApi
      setBusyOpen(false)
      onAdded({
        id: row.id,
        name: `${row.make} ${row.model_name}`,
        short: row.model_name,
        reg: row.registration_plate,
        battery: row.battery_type_name || row.vehicle_type,
      })
    } catch (err) {
      setBusyOpen(false)
      notifications.show({
        color: 'red',
        message: apiErrorMessage(err),
      })
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {onBack ? (
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1 self-start text-sm text-[var(--kura-muted)]"
        >
          <ArrowLeft01Icon size={16} />
          Back
        </button>
      ) : null}

      <div>
        <h2 className="text-lg font-bold text-[var(--kura-text)]">{title}</h2>
        <p className="mt-1 text-xs text-[var(--kura-muted)]">{subtitle}</p>
      </div>

      {modelsLoading ? (
        <div className="flex flex-col gap-2.5">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-[72px] animate-pulse rounded-xl bg-[var(--kura-border)]/40"
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {models.map((m) => {
            const active = m.id === selectedId
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => setSelectedId(m.id)}
                className={`flex items-center justify-between rounded-xl border px-4 py-4 text-left transition ${
                  active
                    ? 'border-[var(--kura-teal)] bg-[var(--kura-teal)]/10'
                    : 'border-[var(--kura-border)] bg-[var(--kura-bg-elevated)]'
                }`}
              >
                <span className="flex flex-col gap-0.5">
                  <span className="text-[15px] font-bold text-[var(--kura-text)]">
                    {m.make} {m.model}
                  </span>
                  <span className="text-[12px] text-[var(--kura-muted)]">
                    {m.vehicle_type} · {m.battery_type_name}
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

      {selectedId ? (
        <div className="flex flex-col gap-4">
          <TextInput
            label="Registration plate"
            value={plate}
            onChange={(e) => setPlate(e.currentTarget.value.toUpperCase())}
            placeholder="e.g. LSR-482-XA"
            styles={fieldStyles}
          />
          <TextInput
            label="Vehicle hardware ID (optional)"
            description="Controller or telematics serial, if your vehicle has one."
            value={hardwareId}
            onChange={(e) => setHardwareId(e.currentTarget.value.toUpperCase())}
            placeholder="e.g. MCU-KR-20481"
            error={
              hardwareId.length > 0 && !hardwareIdOk
                ? 'Enter at least 4 characters'
                : undefined
            }
            styles={fieldStyles}
          />
        </div>
      ) : null}

      <div className="pt-2">
        <OperatorPrimaryButton
          onClick={() => {
            submitLive().catch(() => undefined)
          }}
          disabled={!canSubmit || createMut.isPending}
        >
          {submitLabel}
        </OperatorPrimaryButton>
      </div>

      <KuraIllustrationModal
        opened={busyOpen}
        onClose={() => {}}
        illustrationId="syncing"
        title="Saving vehicle"
        description="Registering this bike on your Kura account…"
        closeOnClickOutside={false}
        primaryAction={{
          label: 'Please wait',
          onClick: () => {},
          loading: true,
        }}
      />
    </div>
  )
}

const fieldStyles = {
  label: {
    fontSize: 12,
    fontWeight: 700,
    color: 'var(--kura-text)',
    marginBottom: 6,
  },
  description: {
    color: 'var(--kura-muted)',
    fontSize: 11,
    marginBottom: 6,
  },
  input: {
    borderRadius: 12,
    borderColor: 'var(--kura-border)',
    backgroundColor: 'var(--kura-bg-elevated)',
    color: 'var(--kura-text)',
    fontSize: 14,
    minHeight: 48,
    textTransform: 'uppercase',
  },
} as const
