import type { BatteryDetailApi } from './types'

export function BatteryPackOverview({
  battery,
  onOpenHub,
}: {
  battery: BatteryDetailApi
  onOpenHub: (hubId: string) => void
}) {
  return (
    <section className="rounded-[16px] border border-[var(--bd)] bg-[var(--sf)] p-5 shadow-[var(--sh)] sm:p-6">
      <h2 className="text-[16px] font-bold text-[var(--tx)]">Pack overview</h2>
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <p className="text-[12px] font-medium text-[var(--mu)]">Serial</p>
          <p className="mt-1 font-mono text-[14px] font-semibold text-[var(--tx)]">
            {battery.serial}
          </p>
        </div>
        <div>
          <p className="text-[12px] font-medium text-[var(--mu)]">Custodian</p>
          <p className="mt-1 text-[14px] font-semibold text-[var(--tx)]">
            {battery.custodian_type}
            {battery.custodian_id
              ? ` · ${battery.custodian_id.slice(0, 8)}`
              : ''}
          </p>
        </div>
        <div>
          <p className="text-[12px] font-medium text-[var(--mu)]">Hub</p>
          <p className="mt-1 text-[14px] font-semibold text-[var(--tx)]">
            {battery.hub_code
              ? `${battery.hub_code} · ${battery.hub_name ?? ''}`
              : '—'}
          </p>
          {battery.current_hub_id ? (
            <button
              type="button"
              className="mt-1 text-[12px] font-semibold text-[var(--pr)]"
              onClick={() => onOpenHub(battery.current_hub_id!)}
            >
              Open hub
            </button>
          ) : null}
        </div>
      </div>
    </section>
  )
}
