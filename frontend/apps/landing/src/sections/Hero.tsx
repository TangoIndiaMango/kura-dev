import type { MouseEvent } from 'react'
import { Photo } from '../components/Photo'
import { PhonePass } from '../components/PhonePass'
import { IconArrow } from '../components/Icons'
import { APP_URL } from '../lib/config'
import { scrollToHash, useCountUp, useParallax } from '../lib/motion'
import { liveStates, openHubs, type NetworkState } from '../lib/network'

function LiveChip({ net }: { net: NetworkState }) {
  const hubs = openHubs(net.data)
  const states = liveStates(net.data)
  const label = net.loading
    ? 'Checking live hubs…'
    : hubs.length
      ? `${hubs.length} ${hubs.length === 1 ? 'hub' : 'hubs'} open now · ${states.join(' & ') || 'Lagos'}`
      : 'Live in Lagos'
  return (
    <a
      href="#hubs"
      onClick={(e: MouseEvent) => scrollToHash('#hubs') && e.preventDefault()}
      className="inline-flex items-center gap-2.5 rounded-full border border-line bg-surface py-1.5 pr-3.5 pl-2 text-sm font-medium shadow-card transition-colors hover:border-line-strong"
    >
      <span className="live-dot h-2.5 w-2.5 rounded-full bg-live" />
      {label}
      <IconArrow className="h-3.5 w-3.5 text-fg-subtle" />
    </a>
  )
}

function Stat({ value, prefix = '', suffix = '', label }: { value: number | null; prefix?: string; suffix?: string; label: string }) {
  const { ref, value: n } = useCountUp(value)
  return (
    <div className="px-1">
      <p className="num text-3xl font-bold sm:text-4xl">
        <span ref={ref as React.Ref<HTMLSpanElement>}>{value === null ? '—' : `${prefix}${n.toLocaleString('en-NG')}${suffix}`}</span>
      </p>
      <p className="mt-1 text-sm text-fg-muted">{label}</p>
    </div>
  )
}

export function Hero({ net }: { net: NetworkState }) {
  const parallax = useParallax<HTMLImageElement>(0.06)
  const open = openHubs(net.data)
  const ready = net.data ? open.reduce((n, h) => n + h.ready_count, 0) : null
  const featured = open.find((h) => h.status === 'ready') ?? open[0]

  return (
    <section id="top" className="relative overflow-hidden px-4 pt-28 pb-14 sm:px-6 md:px-10 md:pt-36 lg:pb-20">
      <div className="mx-auto grid max-w-[1240px] items-center gap-14 lg:grid-cols-[1.1fr_0.9fr]">
        <div>
          <LiveChip net={net} />
          <h1 className="display mt-7 text-[3.6rem] sm:text-[5.2rem] lg:text-[6.4rem]">
            A full battery
            <br />
            in <span className="text-accent">60 seconds</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg text-fg-muted sm:text-xl">
            Ride into a KURA hub, hand in your empty pack and ride out on a full one. Cheaper than petrol, built
            for okada riders, keke operators and boat operators.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-3">
            <a href={APP_URL} className="btn btn-primary px-7 text-[1.05rem]">
              Get started — it’s free
              <IconArrow />
            </a>
            <a
              href="#how-it-works"
              onClick={(e) => scrollToHash('#how-it-works') && e.preventDefault()}
              className="btn btn-secondary px-6"
            >
              See how it works
            </a>
          </div>
          <p className="mt-4 text-sm text-fg-subtle">Sign up with your phone number. No card needed to join.</p>
        </div>

        <div className="relative mx-auto h-[520px] w-full max-w-[460px] sm:h-[560px]">
          <div className="absolute inset-y-0 right-0 left-10 overflow-hidden rounded-[2rem] sm:left-16">
            <Photo
              name="okada-riders"
              alt="Okada riders waiting for passengers on a Lagos street"
              sizes="(min-width: 1024px) 400px, 80vw"
              priority
              imgRef={parallax}
              imgClassName="h-full w-full object-cover will-change-transform"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[oklch(0.16_0.01_230/0.55)] via-transparent" />
          </div>
          <div className="absolute bottom-6 left-0 sm:bottom-10">
            <PhonePass hub={featured?.name} />
          </div>
          <span aria-hidden className="absolute top-6 right-[-10px] hidden h-14 w-14 rounded-2xl bg-gold sm:block" />
        </div>
      </div>

      <div className={`mx-auto mt-16 grid max-w-[1240px] grid-cols-2 gap-x-6 gap-y-8 border-t border-line pt-8 ${net.data ? 'md:grid-cols-4' : ''}`}>
        <Stat value={60} suffix=" sec" label="Typical swap at the bay" />
        <Stat value={3} label="Okada, keke and boat" />
        {/* Live numbers only when the network has loaded — never a dash. */}
        {net.data ? (
          <>
            <Stat value={open.length} label="Hubs open right now" />
            <Stat value={ready} label="Charged packs on the shelf" />
          </>
        ) : null}
      </div>
    </section>
  )
}
