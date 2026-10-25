import { IlloReserve, IlloSignup, IlloSwap } from '../components/Illustrations'
import { IconArrow } from '../components/Icons'
import { Photo, type ImageName } from '../components/Photo'
import { Heading, Section } from '../components/Section'
import { VEHICLES, type VehicleType } from '../lib/config'
import { scrollToHash } from '../lib/motion'

const STEPS = [
  {
    Illo: IlloSignup,
    title: 'Sign up with your phone',
    body: 'Enter your number, set a 4-digit PIN and add your vehicle. Takes a couple of minutes.',
  },
  {
    Illo: IlloReserve,
    title: 'Book a pack or just walk in',
    body: 'See which hubs have charged packs. Reserve one and pay ahead, or walk in and pay at the hub.',
  },
  {
    Illo: IlloSwap,
    title: 'Swap and ride',
    body: 'Show your code, hand in the empty pack, ride out on a full one. About a minute at the bay.',
  },
]

const BLURB: Record<VehicleType, string> = {
  MOTORCYCLE: 'More trips a day, no fuel queue, and a quieter ride for passengers.',
  TRICYCLE: 'Keep the keke earning all day. Swap at the hub instead of buying fuel.',
  BOAT: 'No more fuel runs before dawn. Swap and go straight out on the water.',
}

const PHOTO: Record<VehicleType, { name: ImageName; alt: string }> = {
  MOTORCYCLE: { name: 'kura-bike', alt: 'Electric motorcycle with a swappable battery pack' },
  TRICYCLE: { name: 'keke-street', alt: 'Keke tricycles on a street in Ikeja, Lagos' },
  BOAT: { name: 'boats', alt: 'Passenger boats on the water in Lagos' },
}

export function HowItWorks() {
  return (
    <Section id="how-it-works">
      <Heading
        kicker="How it works"
        title="Three steps. About a minute at the bay."
        lede="No mechanic, no fuel queue, no waiting for a charge. A swap is a handover, not a repair."
      />
      <ol className="mt-14 grid gap-5 md:grid-cols-3">
        {STEPS.map(({ Illo, title, body }, i) => (
          <li key={title} className="card reveal p-7" style={{ ['--i' as string]: i }}>
            <Illo className="h-32 w-full text-fg" />
            <p className="kicker mt-6 text-fg-subtle">Step {i + 1}</p>
            <h3 className="mt-2 text-2xl font-bold">{title}</h3>
            <p className="mt-3 text-fg-muted">{body}</p>
          </li>
        ))}
      </ol>

      <div className="mt-24 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <h3 className="reveal text-3xl font-bold sm:text-4xl">Built for the people who keep Nigeria moving</h3>
        <a
          href="#pricing"
          onClick={(e) => scrollToHash('#pricing') && e.preventDefault()}
          className="reveal inline-flex items-center gap-2 font-semibold text-accent hover:text-accent-strong"
        >
          See the plans <IconArrow />
        </a>
      </div>
      <div className="mt-8 grid gap-5 sm:grid-cols-3">
        {VEHICLES.map((v, i) => {
          return (
            <article key={v.type} className="card group reveal overflow-hidden" style={{ ['--i' as string]: i }}>
              <div className="aspect-[4/3] overflow-hidden">
                <Photo
                  name={PHOTO[v.type].name}
                  alt={PHOTO[v.type].alt}
                  sizes="(min-width: 640px) 33vw, 100vw"
                  imgClassName="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                />
              </div>
              <div className="p-6">
                <p className="kicker text-fg-subtle">{v.label}</p>
                <h4 className="mt-1 text-2xl font-bold">{v.rider}</h4>
                <p className="mt-3 border-t border-line pt-4 text-fg-muted">{BLURB[v.type]}</p>
              </div>
            </article>
          )
        })}
      </div>
    </Section>
  )
}

const TICKER = ['Okada', 'Keke', 'Boats', 'Solar hubs', 'Reserve ahead', 'Pay per swap', 'Daily · weekly · monthly', 'Card · transfer · USSD', 'Cash at the hub', 'Fleet accounts']

export function Ticker() {
  return (
    <div className="marquee-wrap overflow-hidden border-y border-line bg-surface py-5" aria-label="What KURA offers">
      <ul className="marquee flex w-max items-center gap-10 whitespace-nowrap" role="list">
        {[...TICKER, ...TICKER].map((t, i) => (
          <li key={i} aria-hidden={i >= TICKER.length} className="flex items-center gap-10 text-lg font-semibold text-fg-muted">
            {t}
            <span className="h-2 w-2 rotate-45 rounded-[2px] bg-gold" />
          </li>
        ))}
      </ul>
    </div>
  )
}
