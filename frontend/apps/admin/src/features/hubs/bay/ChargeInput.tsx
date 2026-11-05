import { Button, Group, NumberInput, Slider } from '@mantine/core'
import { READY_CHARGE_PCT } from '../hooks/use-bay-charging'

const QUICK = [25, 50, 75, 100]

/** Charge % entry: type it, slide it, or tap a common value. */
export function ChargeInput({
  value,
  onChange,
  label = 'Charge now',
  disabled = false,
}: {
  value: number | null
  onChange: (pct: number) => void
  label?: string
  disabled?: boolean
}) {
  const ready = value != null && value >= READY_CHARGE_PCT
  return (
    <div className="w-full">
      <NumberInput
        label={label}
        description="Read it from the charger or the pack's display."
        placeholder="e.g. 80"
        suffix="%"
        min={0}
        max={100}
        clampBehavior="strict"
        allowDecimal={false}
        value={value ?? ''}
        disabled={disabled}
        onChange={(v) => onChange(typeof v === 'number' ? v : Number(v) || 0)}
      />
      <Slider
        mt="md"
        min={0}
        max={100}
        step={1}
        value={value ?? 0}
        disabled={disabled}
        color={ready ? 'teal' : 'yellow'}
        onChange={onChange}
        marks={[{ value: READY_CHARGE_PCT, label: `${READY_CHARGE_PCT}% ready` }]}
        label={(v) => `${v}%`}
      />
      <Group gap={6} mt="xl">
        {QUICK.map((q) => (
          <Button
            key={q}
            size="compact-sm"
            radius="xl"
            variant={value === q ? 'filled' : 'default'}
            color="brand"
            disabled={disabled}
            onClick={() => onChange(q)}
          >
            {q}%
          </Button>
        ))}
      </Group>
    </div>
  )
}
