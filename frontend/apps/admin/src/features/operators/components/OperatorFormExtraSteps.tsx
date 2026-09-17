import { Select, Switch, TextInput } from '@mantine/core'
import {
  discountSelectOptionsFrom,
  useSelectableDiscounts,
} from '@features/discounts'
import type { OperatorRecord } from '../types'

const BATTERY_TYPES = [
  'Spiro Moto 48V',
  'Keke 60V',
  'Asobo Marine 72V',
  'Max 60V',
  'Boat 72V',
]

type Props = {
  operator?: OperatorRecord | null
  editing: boolean
  autoRenew: boolean
  setAutoRenew: (v: boolean) => void
  showVehicle: boolean
  showPlan: boolean
}

export function OperatorFormExtraSteps({
  operator,
  editing,
  autoRenew,
  setAutoRenew,
  showVehicle,
  showPlan,
}: Props) {
  const { discounts } = useSelectableDiscounts({ enabled: showPlan })

  return (
    <>
      {showVehicle ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Select
            key={`vehicle-${operator?.id ?? 'new'}`}
            label="Vehicle Type"
            data={['Motorcycle', 'Tricycle', 'Boat']}
            defaultValue="Motorcycle"
            required
          />
          <TextInput
            key={`reg-${operator?.id ?? 'new'}`}
            label="Registration / Hull Tag"
            placeholder="LSR-482-XA or HULL-IGB-14"
            defaultValue=""
            required
          />
          <TextInput
            key={`make-${operator?.id ?? 'new'}`}
            label="Make"
            placeholder="e.g. Spiro"
          />
          <TextInput
            key={`model-${operator?.id ?? 'new'}`}
            label="Model"
            placeholder="e.g. E-Moto Pro"
          />
          <Select
            key={`batt-${operator?.id ?? 'new'}`}
            className="sm:col-span-2"
            label="Battery Type"
            description="Critical for hub stock compatibility."
            data={BATTERY_TYPES}
            required
          />
        </div>
      ) : null}

      {showPlan ? (
        <div className="flex flex-col gap-4">
          <Select
            key={`plan-${operator?.id ?? 'new'}`}
            label={editing ? 'Plan' : 'Starting Plan'}
            data={['Monthly', 'Weekly', 'Daily', 'Pay-per-swap']}
            defaultValue="Weekly"
            required
          />
          <Select
            key={`discount-${operator?.id ?? 'new'}`}
            label="Issued discount"
            placeholder="None — pick Active / Scheduled"
            data={discountSelectOptionsFrom(discounts, true)}
            defaultValue={operator?.discountId ?? ''}
            searchable
            clearable
            description="Optional. Issues a code the operator must enter at checkout — never auto-applied."
          />
          <Switch
            label="Auto-renew"
            description="Charge wallet on plan expiry. On failure, lapse to pay-per-swap with a notification."
            checked={autoRenew}
            onChange={(e) => setAutoRenew(e.currentTarget.checked)}
          />
          {editing ? (
            <Select
              key={`status-${operator?.id ?? 'new'}`}
              label="Status"
              defaultValue={operator?.status ?? 'ACTIVE'}
              data={[
                { value: 'ACTIVE', label: 'Active' },
                { value: 'PENDING', label: 'Pending' },
                { value: 'SUSPENDED', label: 'Suspended' },
                { value: 'DEREGISTERED', label: 'Deregistered' },
              ]}
            />
          ) : (
            <p className="rounded-[10px] border border-[var(--bd)] bg-[var(--in)] px-3 py-2.5 text-[12.5px] text-[var(--mu)]">
              Register creates a KURA ID + virtual account and emails an invite so
              the operator can set their password. Swaps unlock after identity review.
            </p>
          )}
        </div>
      ) : null}
    </>
  )
}
