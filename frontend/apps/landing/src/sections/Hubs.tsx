import { useMemo, useState } from 'react'
import { IconArrow, IconPin } from '../components/Icons'
import { Heading, Section } from '../components/Section'
import { COMING_SOON, whatsappLink } from '../lib/config'
import { directionsUrl, hubArea, liveStates, mappable, type NetworkState, type PublicHub } from '../lib/network'
import { HubMap } from './HubMap'

const STATUS: Record<PublicHub['status'], { label: (n: number) => string; dot: string }> = {
  ready: { label: (n) => `${n} ready`, dot: 'bg-accent' },
  low: { label: (n) => (n > 0 ? `${n} ready` : 'Limited'), dot: 'bg-gold' },
  offline: { label: () => 'Closed now', dot: 'bg-fg-subtle' },
}

export function Hubs({ net }: { net: NetworkState }) {
  // Open hubs first; hubs without a real location stay off the page.
  const hubs = useMemo(
    () => mappable(net.data?.hubs ?? []).sort((a, b) => Number(a.status === 'offline') - Number(b.status === 'offline')),
    [net.data],
  )
  const states = liveStates(net.data)
  const [focus, setFocus] = useState<string | null>(null)

  return (
    <Section id="hubs" className="bg-surface-2/60">
      <Heading
        kicker="The network"
        title="Find a hub near you"
        lede={
          <>
            Live in {states.length ? states.join(' and ') : 'Lagos'} today, with more on the way. Counts are charged
            packs on the shelf right now.
          </>
        }
      />

      <div className="mt-12 grid gap-5 lg:grid-cols-[1.25fr_1fr]">
        <div className="reveal">
          {hubs.length ? (
            <HubMap hubs={hubs} focus={focus} />
          ) : (
            <div className="flex h-[360px] items-center justify-center rounded-3xl bg-surface-2 text-fg-muted lg:h-full">
              {net.loading ? 'Loading live hubs…' : 'Open the app to see live hubs.'}
            </div>
          )}
        </div>

        <div className="card reveal flex flex-col p-2" style={{ ['--i' as string]: 1 }}>
          <ul className="max-h-[520px] overflow-y-auto" data-lenis-prevent>
            {hubs.map((h) => {
              const s = STATUS[h.status]
              const { area, state } = hubArea(h.address)
              return (
                <li key={h.name} className="border-b border-line last:border-b-0">
                  <div className="flex items-start gap-3 rounded-2xl p-4 transition-colors hover:bg-surface-2">
                    <button
                      type="button"
                      onClick={() => setFocus(h.name)}
                      className="flex flex-1 items-start gap-3 text-left"
                      aria-label={`Show ${h.name} on the map`}
                    >
                      <span className={`mt-2 h-2.5 w-2.5 shrink-0 rounded-full ${s.dot}`} />
                      <span>
                        <span className="block font-semibold">{h.name}</span>
                        <span className="block text-sm text-fg-muted">
                          {[area, state].filter(Boolean).join(', ')} · {h.hours_label}
                        </span>
                      </span>
                    </button>
                    <div className="text-right">
                      <p className="num text-sm font-bold">{s.label(h.ready_count)}</p>
                      <a
                        href={directionsUrl(h)}
                        target="_blank"
                        rel="noopener"
                        className="mt-1 inline-flex items-center gap-1 text-sm font-medium text-accent hover:text-accent-strong"
                      >
                        Directions <IconArrow className="h-3.5 w-3.5" />
                      </a>
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        </div>
      </div>

      <div className="mt-14 grid gap-8 lg:grid-cols-[1.25fr_1fr] lg:items-center">
        <div className="reveal">
          <p className="kicker text-fg-subtle">Coming next</p>
          <ul className="mt-4 flex flex-wrap gap-2.5">
            {COMING_SOON.map((c) => (
              <li key={c.name} className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-4 py-2">
                <IconPin className="h-4 w-4 text-gold" />
                <span className="font-semibold">{c.name}</span>
                <span className="text-sm text-fg-muted">{c.state}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="card reveal flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-semibold">No hub near you yet?</p>
            <p className="text-sm text-fg-muted">Tell us where you ride and we’ll tell you when one opens.</p>
          </div>
          <a
            href={whatsappLink('Hi KURA, please let me know when a hub opens near me. I ride around: ')}
            className="btn btn-primary shrink-0"
          >
            Ask on WhatsApp
          </a>
        </div>
      </div>
    </Section>
  )
}
