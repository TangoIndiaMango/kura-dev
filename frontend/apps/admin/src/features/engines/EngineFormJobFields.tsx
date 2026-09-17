import { Select, TextInput } from '@mantine/core'

type Option = { value: string; label: string }

type Props = {
  accountId: string
  vehicleId: string
  eboarderSerial: string
  accountOptions: Option[]
  vehicleOptions: Option[]
  onAccountId: (v: string) => void
  onVehicleId: (v: string) => void
  onEboarderSerial: (v: string) => void
}

export function EngineFormJobFields({
  accountId,
  vehicleId,
  eboarderSerial,
  accountOptions,
  vehicleOptions,
  onAccountId,
  onVehicleId,
  onEboarderSerial,
}: Props) {
  return (
    <div className="flex flex-col gap-3">
      <Select
        label="Account"
        searchable
        data={accountOptions}
        value={accountId || null}
        onChange={(v) => {
          onAccountId(v ?? '')
          onVehicleId('')
        }}
      />
      <Select
        label="Vehicle"
        searchable
        data={vehicleOptions}
        value={vehicleId || null}
        onChange={(v) => onVehicleId(v ?? '')}
      />
      <TextInput
        label="E-boarder serial (optional for now)"
        value={eboarderSerial}
        onChange={(e) => onEboarderSerial(e.currentTarget.value)}
      />
    </div>
  )
}
