import { useState } from 'react'
import { Select, TextInput } from '@mantine/core'

export const VEHICLE_TYPE_OPTIONS = [
  { value: 'MOTORCYCLE', label: 'Motorcycle' },
  { value: 'TRICYCLE', label: 'Tricycle' },
  { value: 'BOAT', label: 'Boat' },
]

const ADD_VALUE = '__ADD_VEHICLE_TYPE__'

export function normalizeVehicleTypeCode(raw: string): string {
  return raw
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 50)
}

function prettyCode(code: string): string {
  return code.replace(/_/g, ' ')
}

interface VehicleTypeFieldProps {
  value: string
  onChange: (code: string) => void
  error?: string
  label?: string
  disabled?: boolean
}

export function VehicleTypeField({
  value,
  onChange,
  error,
  label = 'Vehicle type',
  disabled,
}: VehicleTypeFieldProps) {
  const isKnown = VEHICLE_TYPE_OPTIONS.some((o) => o.value === value)
  const [custom, setCustom] = useState(Boolean(value) && !isKnown)
  const [customText, setCustomText] = useState(
    value && !isKnown ? prettyCode(value) : '',
  )

  return (
    <div className="flex flex-col gap-2">
      <Select
        label={label}
        required
        disabled={disabled}
        data={[
          ...VEHICLE_TYPE_OPTIONS,
          { value: ADD_VALUE, label: 'Add a different type…' },
        ]}
        value={custom ? ADD_VALUE : value || null}
        onChange={(v) => {
          if (v === ADD_VALUE) {
            setCustom(true)
            onChange(normalizeVehicleTypeCode(customText))
            return
          }
          setCustom(false)
          onChange(v ?? '')
        }}
        allowDeselect={false}
        searchable
        maxDropdownHeight={280}
        comboboxProps={{
          withinPortal: true,
          transitionProps: { transition: 'pop', duration: 200 },
        }}
        error={custom ? undefined : error}
      />
      {custom ? (
        <TextInput
          label="Your vehicle type"
          placeholder="e.g. Cargo trike, E-keke max…"
          disabled={disabled}
          value={customText}
          onChange={(e) => {
            setCustomText(e.currentTarget.value)
            onChange(normalizeVehicleTypeCode(e.currentTarget.value))
          }}
          error={error}
          description="Saved as a new vehicle type and selectable for the next model."
        />
      ) : null}
    </div>
  )
}
