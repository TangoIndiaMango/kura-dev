import type { ReactNode } from 'react'
import { IconCalendar, IconCard, IconCash, IconGauge, IconQr, IconReceipt, IconSolar } from '../components/Icons'
import { Photo } from '../components/Photo'
import { Heading, Section } from '../components/Section'
import { hubArea, openHubs, type NetworkState } from '../lib/network'

// Only what riders can do today — no wallet, airtime, bills or loans.

function Tile({ className = '', i, children }: { className?: string; i: number; children: ReactNode }) {
  return (
    <div className={`card reveal relative overflow-hidden p-7 ${className}`} style={{ ['--i' as string]: i }}>
      {children}
    </div>
  )
}

function TileHead({ icon, title, body }: { icon: ReactNode; title: string; body: string }) {
  return (
    <>
      <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent-soft text-accent">{icon}</span>
      <h3 className="mt-5 text-2xl font-bold">{title}</h3>
      <p className="mt-2 text-fg-muted">{body}</p>
    </>
  )
}

export function Features({ net }: { net: NetworkState }) {
  const hubs = openHubs(net.data).slice(0, 4)
  return (
    <Section id="features">
      <Heading
        kicker="The system"
        title="Everything around the swap, in one app"
        lede="Find a pack, hold it, pay how you like and keep every receipt, on any phone with a browser."
      />
      <div className="mt-14 grid gap-5 md:grid-cols-6">
        <Tile i={0} className="md:col-span-4">
          <div className="grid gap-8 sm:grid-cols-2">
            <div>
              <TileHead
                icon={<IconGauge />}
                title="Live availability"
                body="See how many charged packs each hub has before you ride over. No wasted trips."
              />
            </div>
            <ul className="space-y-2.5" aria-label="Hubs right now">
              {!net.loading && hubs.length === 0 ? (
                <li className="rounded-xl bg-surface-2 px-4 py-6 text-fg-muted">
                  Open the app to see how many packs each hub has right now.
                </li>
              ) : null}
              {(hubs.length ? hubs : net.loading ? [null, null, null] : []).map((h, i) => (
                <li key={h?.name ?? i} className="flex items-center justify-between rounded-xl bg-surface-2 px-4 py-3">
                  {h ? (
                    <>
                      <span>
                        <span className="block font-semibold">{h.name}</span>
                        <span className="text-sm text-fg-muted">{hubArea(h.address).area}</span>
                      </span>
                      <span className={`num text-sm font-bold ${h.status === 'ready' ? 'text-accent' : 'text-gold-ink'}`}>
                        {h.ready_count} ready
                      </span>
                    </>
                  ) : (
                    <span className="h-10 w-full animate-pulse rounded bg-bg" />
                  )}
                </li>
              ))}
            </ul>
          </div>
        </Tile>

        <Tile i={1} className="bg-accent text-on-accent md:col-span-2" >
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-on-accent/15">
            <IconQr />
          </span>
          <h3 className="mt-5 text-2xl font-bold">Reserve ahead</h3>
          <p className="mt-2 opacity-85">
            Hold a pack at the hub you’re heading to. You get a code and QR to show the agent. It works even when
            data drops.
          </p>
        </Tile>

        <Tile i={2} className="md:col-span-2">
          <TileHead
            icon={<IconCard />}
            title="Pay your way"
            body="Card, bank transfer or USSD through Paystack, or cash to the agent at the hub."
          />
          <div className="mt-5 flex flex-wrap gap-2">
            {[
              { icon: <IconCard className="h-4 w-4" />, t: 'Card' },
              { icon: <IconCash className="h-4 w-4" />, t: 'Cash at hub' },
              { icon: null, t: 'Transfer' },
              { icon: null, t: 'USSD' },
            ].map((c) => (
              <span key={c.t} className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1 text-sm font-medium">
                {c.icon}
                {c.t}
              </span>
            ))}
          </div>
        </Tile>

        <Tile i={3} className="md:col-span-2">
          <TileHead
            icon={<IconCalendar />}
            title="Plans that fit"
            body="Pay per swap, or pick a daily, weekly or monthly plan for your vehicle and stop paying each time."
          />
        </Tile>

        <Tile i={4} className="md:col-span-2">
          <TileHead
            icon={<IconReceipt />}
            title="A receipt every time"
            body="Every swap and payment is in your history. If a paid booking isn’t used, the money goes back to how you paid."
          />
        </Tile>

        <Tile i={5} className="min-h-[260px] p-0 text-on-inverse md:col-span-6">
          <Photo
            name="lagos-aerial"
            alt="Aerial view of Lekki, Lagos"
            sizes="(min-width: 1240px) 1240px, 100vw"
            className="absolute inset-0"
            imgClassName="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[oklch(0.14_0.01_230/0.88)] via-[oklch(0.14_0.01_230/0.55)] to-transparent" />
          <div className="relative max-w-lg p-8 md:p-10">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15 text-gold">
              <IconSolar />
            </span>
            <h3 className="mt-5 text-3xl font-bold text-white">Solar-powered hubs</h3>
            <p className="mt-2 text-white/80">
              Hubs charge packs on solar with battery backup, so a grid outage doesn’t stop your swap.
            </p>
          </div>
        </Tile>
      </div>
    </Section>
  )
}
