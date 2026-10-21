import React from 'react'
import { OperatorBackHeader } from '../../../shared/components/operator/OperatorBackHeader'

interface VehicleCard {
  id: string
  name: string
  status: string
  assignedDriverId?: string | null
  assignedDriverName?: string | null
  rows: Array<{ label: string; value: string }>
}

interface MyVehiclesScreenProps {
  onBack: () => void
  onAddVehicle?: () => void
  vehicles: VehicleCard[]
  /** Hide back header when shown under Account tabs. */
  embedded?: boolean
  loading?: boolean
  page?: number
  totalPages?: number
  count?: number
  onPageChange?: (page: number) => void
  /** Soft fleet — assign a locked driver to this vehicle. */
  onAssignDriver?: (vehicle: VehicleCard) => void
}

function statusClass(status: string) {
  const s = status.toLowerCase()
  if (s === 'active') return 'bg-[var(--kura-green)]/15 text-[var(--kura-green)]'
  if (s === 'pending') return 'bg-[var(--kura-amber)]/15 text-[var(--kura-amber)]'
  if (s === 'suspended' || s === 'retired')
    return 'bg-[var(--kura-coral)]/15 text-[var(--kura-coral)]'
  return 'bg-[var(--kura-border)]/40 text-[var(--kura-muted)]'
}

export const MyVehiclesScreen: React.FC<MyVehiclesScreenProps> = ({
  onBack,
  onAddVehicle,
  vehicles,
  embedded = false,
  loading = false,
  page = 1,
  totalPages = 1,
  count = 0,
  onPageChange,
  onAssignDriver,
}) => {
  const showPager = Boolean(onPageChange) && totalPages > 1

  return (
    <div className="flex flex-col gap-4">
      {embedded ? (
        <h3 className="text-[15px] font-bold text-[var(--kura-text)]">My vehicles</h3>
      ) : (
        <OperatorBackHeader title="My vehicles" onBack={onBack} />
      )}

      {loading ? (
        <div className="flex flex-col gap-3">
          {[0, 1].map((i) => (
            <div
              key={i}
              className="h-[120px] animate-pulse rounded-2xl bg-[var(--kura-border)]/40"
            />
          ))}
        </div>
      ) : vehicles.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[var(--kura-border)] bg-[var(--kura-bg-elevated)] px-4 py-8 text-center">
          <p className="text-[14px] font-semibold text-[var(--kura-text)]">
            No vehicles yet
          </p>
          <p className="mt-1 text-[12px] text-[var(--kura-muted)]">
            Add one when you’re ready to book a swap.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {vehicles.map((vehicle) => (
            <article
              key={vehicle.id}
              className="rounded-2xl border border-[var(--kura-border)] bg-[var(--kura-bg-elevated)] p-4"
            >
              <div className="mb-3 flex items-center justify-between gap-2">
                <h3 className="text-[15px] font-bold text-[var(--kura-text)]">
                  {vehicle.name}
                </h3>
                <span
                  className={`rounded-md px-2 py-0.5 text-[11px] font-bold ${statusClass(vehicle.status)}`}
                >
                  {vehicle.status}
                </span>
              </div>
              <dl className="grid grid-cols-2 gap-x-3 gap-y-2.5">
                {vehicle.rows.map((row) => (
                  <div key={row.label} className="flex flex-col gap-0.5">
                    <dt className="text-[11px] text-[var(--kura-muted)]">
                      {row.label}
                    </dt>
                    <dd className="text-[12px] font-semibold text-[var(--kura-text)]">
                      {row.value}
                    </dd>
                  </div>
                ))}
              </dl>
              {onAssignDriver ? (
                <button
                  type="button"
                  className="mt-3 w-full rounded-xl border border-[var(--kura-border)] py-2 text-[12px] font-bold text-[var(--kura-teal-bright)]"
                  onClick={() => onAssignDriver(vehicle)}
                >
                  Assign driver
                </button>
              ) : null}
            </article>
          ))}
        </div>
      )}

      {showPager ? (
        <div className="flex items-center justify-between gap-2 text-[12px] text-[var(--kura-muted)]">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => onPageChange?.(page - 1)}
            className="rounded-lg border border-[var(--kura-border)] px-3 py-1.5 font-semibold disabled:opacity-40"
          >
            Previous
          </button>
          <span>
            Page {page} of {totalPages}
            {count ? ` · ${count} total` : ''}
          </span>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => onPageChange?.(page + 1)}
            className="rounded-lg border border-[var(--kura-border)] px-3 py-1.5 font-semibold disabled:opacity-40"
          >
            Next
          </button>
        </div>
      ) : null}

      <button
        type="button"
        onClick={onAddVehicle}
        className="w-full rounded-xl border border-[var(--kura-teal)]/40 py-3.5 text-[14px] font-bold text-[var(--kura-teal-bright)]"
      >
        + Add {vehicles.length === 0 && count === 0 ? 'a vehicle' : 'another vehicle'}
      </button>
    </div>
  )
}
