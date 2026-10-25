import { useId, useState } from 'react'
import { Photo } from '../components/Photo'
import { Segmented } from '../components/Section'
import { APP_URL, KURA_PER_DAY_NAIRA, PETROL_PER_DAY_NAIRA, VEHICLES, type VehicleType } from '../lib/config'
import { naira } from '../lib/network'

export function Calculator() {
  const [type, setType] = useState<VehicleType>('MOTORCYCLE')
  const [days, setDays] = useState(26)
  const sliderId = useId()

  // Both sides are estimates from config — the result is always shown.
  const petrol = PETROL_PER_DAY_NAIRA[type] * 100 * days
  const kura = KURA_PER_DAY_NAIRA[type] * 100 * days
  const saved = Math.max(0, petrol - kura)
  const pct = petrol ? Math.round((saved / petrol) * 100) : 0
  const kuraShare = petrol ? Math.min(100, (kura / petrol) * 100) : 0

  return (
    <section className="px-4 py-20 sm:px-6 md:px-10 md:py-28">
      <div className="relative mx-auto max-w-[1240px] overflow-hidden rounded-[2rem] bg-inverse text-on-inverse">
        <Photo
          name="lagos-traffic"
          alt=""
          sizes="(min-width: 1240px) 1240px, 100vw"
          className="absolute inset-0"
          imgClassName="h-full w-full object-cover opacity-25"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-inverse via-inverse/90 to-inverse/60" />

        <div className="relative grid gap-12 p-6 sm:p-10 lg:grid-cols-2 lg:p-14">
          <div>
            <p className="kicker reveal text-gold">Run the numbers</p>
            <h2 className="reveal mt-4 text-[2.4rem] font-bold sm:text-5xl" style={{ ['--i' as string]: 1 }}>
              What is petrol costing you?
            </h2>
            <p className="reveal mt-4 max-w-md text-on-inverse-muted" style={{ ['--i' as string]: 2 }}>
              Pick your vehicle and how many days you work. The difference stays in your pocket.
            </p>

            <div className="mt-10 [&_[role=radiogroup]]:bg-white/10 [&_[role=radio]]:text-white/70 [&_[aria-checked=true]]:!bg-white [&_[aria-checked=true]]:!text-[oklch(0.17_0.01_230)]">
              <Segmented
                label="Vehicle"
                value={type}
                onChange={setType}
                options={VEHICLES.map((v) => ({ value: v.type, label: v.short }))}
              />
            </div>
            <div className="mt-8 max-w-md">
              <label htmlFor={sliderId} className="flex items-baseline justify-between">
                <span className="text-on-inverse-muted">Working days a month</span>
                <span className="num text-3xl font-bold">{days}</span>
              </label>
              <input
                id={sliderId}
                type="range"
                min={1}
                max={31}
                value={days}
                onChange={(e) => setDays(Number(e.target.value))}
                className="mt-3 h-2 w-full cursor-pointer accent-[var(--gold)]"
              />
            </div>
          </div>

          <div className="rounded-3xl bg-white/[0.06] p-6 ring-1 ring-white/10 backdrop-blur sm:p-8" aria-live="polite">
            <p className="text-on-inverse-muted">You keep every month</p>
            <p className="num mt-1 text-6xl font-extrabold text-gold sm:text-7xl" style={{ fontStretch: '80%' }}>
              {naira(saved)}
            </p>
            <p className="mt-2 text-on-inverse-muted">
              About {pct}% less than petrol · {naira(saved * 12)} a year
            </p>

            <div className="mt-8 space-y-4">
              <div>
                <div className="flex justify-between text-sm">
                  <span>Petrol</span>
                  <span className="num font-semibold">{naira(petrol)}</span>
                </div>
                <div className="mt-2 h-3 rounded-full bg-white/80" />
              </div>
              <div>
                <div className="flex justify-between text-sm">
                  <span>KURA</span>
                  <span className="num font-semibold">{naira(kura)}</span>
                </div>
                <div className="mt-2 h-3 rounded-full bg-white/10">
                  <div
                    className="h-3 rounded-full bg-[var(--accent)] transition-[width] duration-700 ease-out"
                    style={{ width: `${kuraShare}%` }}
                  />
                </div>
              </div>
            </div>

            <p className="mt-6 text-xs text-on-inverse-muted">
              Estimate based on a typical day’s petrol against a typical day of KURA swaps. Your numbers will
              vary — see today’s prices in the app.
            </p>
            <a href={APP_URL} className="btn mt-6 w-full bg-gold text-on-gold hover:bg-white">
              Start saving today
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}
