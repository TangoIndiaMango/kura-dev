import { IconGauge, IconReceipt, IconSolar, IconUsers, IconWifiOff, IconBolt } from '../components/Icons'
import { Photo } from '../components/Photo'
import { Heading, Section } from '../components/Section'
import { APP_URL, COMPANY, whatsappLink } from '../lib/config'
import { useParallax } from '../lib/motion'

// What a fleet account does today (rider app: Vehicles, Drivers, Spend).
const FLEET = [
  { icon: <IconBolt />, title: 'Every vehicle, one account', body: 'Bikes, kekes and boats together, with each one’s battery and last swap.' },
  { icon: <IconUsers />, title: 'Assign drivers', body: 'Each driver gets their vehicle and swaps with their own phone and PIN.' },
  { icon: <IconGauge />, title: 'Daily limits per driver', body: 'Cap swaps or spend per driver per day, so nobody runs up your bill.' },
  { icon: <IconReceipt />, title: 'Swap history', body: 'Every swap by vehicle and driver, with a receipt, ready for your books.' },
]

const TRUST = [
  { icon: <IconSolar />, title: 'Solar powered', body: 'Hubs charge on solar with battery backup, so outages don’t stop a swap.' },
  { icon: <IconWifiOff />, title: 'Pass works offline', body: 'Your booking code and QR stay on your phone when data drops at the hub.' },
  { icon: <IconReceipt />, title: 'Every naira visible', body: 'Receipts for every swap, and unused payments go back to how you paid.' },
]

export function Fleets() {
  const parallax = useParallax<HTMLImageElement>(0.05)
  return (
    <>
      <Section id="fleets">
        <div className="grid gap-14 lg:grid-cols-2 lg:items-center">
          <div>
            <Heading
              kicker="For fleet owners"
              title="Fleets run better on KURA"
              lede="Run 3 vehicles or 300 from one account, and see exactly what your fleet spends."
            />
            <ul className="mt-10 grid gap-4 sm:grid-cols-2">
              {FLEET.map((f, i) => (
                <li key={f.title} className="reveal" style={{ ['--i' as string]: i }}>
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-soft text-accent">{f.icon}</span>
                  <h3 className="mt-4 text-lg font-bold">{f.title}</h3>
                  <p className="mt-1 text-fg-muted">{f.body}</p>
                </li>
              ))}
            </ul>
            <div className="reveal mt-10 flex flex-wrap gap-3">
              <a href={whatsappLink('Hi KURA, I’d like a fleet demo.')} className="btn btn-primary">
                Request a fleet demo
              </a>
              <a href={`mailto:${COMPANY.email}?subject=${encodeURIComponent('Fleet enquiry')}`} className="btn btn-secondary">
                Email us
              </a>
            </div>
            <p className="mt-4 text-sm text-fg-subtle">
              Or <a href={APP_URL} className="underline underline-offset-2 hover:text-fg">sign up</a> and add your
              vehicles yourself.
            </p>
          </div>

          <figure className="reveal relative overflow-hidden rounded-[2rem]">
            <div className="aspect-[4/5] overflow-hidden sm:aspect-[4/3] lg:aspect-[4/5]">
              <Photo
                name="kura-keke-hub"
                alt="Fleet operators at a KURA swap hub with electric tricycles"
                sizes="(min-width: 1024px) 600px, 100vw"
                imgRef={parallax}
                imgClassName="h-full w-full object-cover"
              />
            </div>
            <figcaption className="absolute right-4 bottom-4 left-4 rounded-2xl bg-surface/90 p-4 backdrop-blur">
              <p className="font-semibold">Keke fleet at a KURA hub</p>
              <p className="text-sm text-fg-muted">Drivers swap with their own PIN; the owner sees every swap.</p>
            </figcaption>
          </figure>
        </div>
      </Section>

      <section className="px-4 pb-20 sm:px-6 md:px-10 md:pb-28" aria-label="Why trust KURA">
        <ul className="mx-auto grid max-w-[1240px] gap-5 md:grid-cols-3">
          {TRUST.map((t, i) => (
            <li key={t.title} className="card reveal flex gap-4 p-6" style={{ ['--i' as string]: i }}>
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface-2 text-accent">{t.icon}</span>
              <div>
                <h3 className="text-lg font-bold">{t.title}</h3>
                <p className="mt-1 text-fg-muted">{t.body}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </>
  )
}
