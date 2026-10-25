import { QrMock } from './Illustrations'
import { IconBolt, IconPin } from './Icons'

/**
 * The booking pass a rider shows at the hub, drawn in HTML (an illustration of
 * the app, not a screenshot). The hub name comes from live data when present.
 */
export function PhonePass({ hub }: { hub?: string }) {
  return (
    <div
      aria-hidden
      className="relative w-[248px] rounded-[2.4rem] border border-white/10 bg-[oklch(0.16_0.01_230)] p-2.5 shadow-[0_30px_60px_-20px_oklch(0_0_0/0.5)]"
    >
      <div className="overflow-hidden rounded-[1.9rem] bg-[oklch(0.985_0.005_88)] text-[oklch(0.19_0.012_230)]">
        <div className="flex items-center justify-between px-5 pt-3 text-[10px] font-semibold">
          <span>9:41</span>
          <span className="h-4 w-16 rounded-full bg-[oklch(0.16_0.01_230)]" />
          <span>100%</span>
        </div>
        <div className="px-5 pt-4 pb-5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[oklch(0.47_0.075_195)]">
            Booking confirmed
          </p>
          <p className="mt-1 text-lg font-bold leading-tight">Show this at the bay</p>
          <div className="mt-4 rounded-2xl bg-[oklch(0.935_0.013_88)] p-4 text-center">
            <QrMock className="mx-auto h-24 w-24" />
            <p className="mt-3 text-[11px] text-[oklch(0.43_0.012_230)]">Booking code</p>
            <p className="text-2xl font-extrabold tracking-[0.12em]">KB-4821</p>
          </div>
          <div className="mt-4 space-y-2.5 text-[12px]">
            <p className="flex items-center gap-2">
              <IconPin className="h-4 w-4 text-[oklch(0.47_0.075_195)]" />
              <span className="font-semibold">{hub ?? 'Yaba Commercial Hub'}</span>
            </p>
            <p className="flex items-center gap-2">
              <IconBolt className="h-4 w-4 text-[oklch(0.7_0.15_75)]" />
              Pack held for you · <span className="font-semibold">14:52</span>
            </p>
          </div>
          <div className="mt-4 flex items-center justify-between rounded-xl bg-[oklch(0.47_0.075_195)] px-4 py-3 text-white">
            <span className="text-[12px] font-semibold">Paid with Paystack</span>
            <span className="text-sm font-bold">✓</span>
          </div>
        </div>
      </div>
    </div>
  )
}
