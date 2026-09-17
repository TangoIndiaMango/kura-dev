import { useMemo } from 'react'
import { Checkbox, Text } from '@mantine/core'
import { allSafetyPassed, emptySafetyChecks } from './engineHelpers'
import type { EngineSafetyChecks, SafetyCheckId } from './types'

/** PRD 5.4 — all six must pass before retrofit /activate. */
export const RETROFIT_SAFETY_ITEMS: {
  id: SafetyCheckId
  label: string
}[] = [
  { id: 'hull', label: 'Canoe hull sound (no critical cracks / leaks)' },
  { id: 'mount', label: 'E-boarder mount secure' },
  { id: 'throttle', label: 'Throttle responsive' },
  { id: 'kill', label: 'Kill switch functional' },
  { id: 'cable', label: 'Cable insulation intact' },
  { id: 'float', label: 'Flotation / buoyancy verified' },
]

export type { SafetyCheckId, EngineSafetyChecks }
export { allSafetyPassed, emptySafetyChecks }

export function EngineSafetyChecklist({
  value,
  onChange,
  locked,
  gate = 'activation',
  optionalNote,
}: {
  value: EngineSafetyChecks
  onChange: (next: EngineSafetyChecks) => void
  locked?: boolean
  gate?: 'activation' | 'release' | 'intake'
  optionalNote?: string
}) {
  const passed = useMemo(() => allSafetyPassed(value), [value])
  const gateCopy =
    gate === 'activation'
      ? 'Required before Activate'
      : gate === 'release'
        ? 'Confirm before release'
        : 'Optional at intake'

  return (
    <section>
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <Text fw={700} size="sm" className="text-[var(--tx)]">
          Safety checklist
        </Text>
        <Text size="xs" c="dimmed">
          {optionalNote ?? gateCopy}
          {passed ? ' · Clear' : ''}
        </Text>
      </div>
      <div className="flex flex-col gap-2">
        {RETROFIT_SAFETY_ITEMS.map((item) => (
          <Checkbox
            key={item.id}
            label={item.label}
            checked={Boolean(value[item.id])}
            disabled={locked}
            onChange={(e) =>
              onChange({ ...value, [item.id]: e.currentTarget.checked })
            }
          />
        ))}
      </div>
    </section>
  )
}
