import { IconArrow } from '../components/Icons'
import { Heading, Section } from '../components/Section'
import { APP_URL, whatsappLink } from '../lib/config'

// Ways to pay, without numbers: prices live in the app (set per vehicle by KURA).
const OPTIONS = [
  {
    name: 'Pay per swap',
    tag: 'No commitment',
    body: 'Pay only when you swap — by Paystack in the app, or cash at the hub.',
    perks: ['Nothing to sign up for', 'Any KURA hub', 'Receipt for every swap'],
  },
  {
    name: 'Daily',
    tag: 'Pay as you work',
    body: 'A day’s swaps for one price, so a busy day doesn’t cost more.',
    perks: ['Swaps included each day', 'Any KURA hub', 'Receipt for every swap'],
  },
  {
    name: 'Weekly',
    tag: 'Plan your week',
    body: 'Cover the week once and stop paying at every swap.',
    perks: ['Swaps for 7 days', 'Any KURA hub', 'Receipt for every swap'],
  },
  {
    name: 'Monthly',
    tag: 'Best value',
    body: 'The lowest daily cost for full-time riders and fleets.',
    perks: ['Swaps for 30 days', 'Any KURA hub', 'Receipt for every swap'],
    featured: true,
  },
]

export function Plans() {
  return (
    <Section id="pricing">
      <Heading
        kicker="Plans"
        title="Plans that pay for themselves"
        lede="Swap one at a time or cover your day, week or month. Plans are per vehicle — okada, keke or boat — and you see today’s prices in the app before you pay."
      />

      <ul className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {OPTIONS.map((o, i) => (
          <li
            key={o.name}
            className={`reveal relative flex flex-col rounded-3xl p-7 ${
              o.featured ? 'bg-inverse text-on-inverse shadow-card ring-2 ring-gold/70' : 'card'
            }`}
            style={{ ['--i' as string]: i }}
          >
            {o.featured ? (
              <span className="absolute -top-3 left-7 rounded-full bg-gold px-3 py-1 text-xs font-bold text-on-gold">
                {o.tag}
              </span>
            ) : (
              <p className="kicker text-fg-subtle">{o.tag}</p>
            )}
            <h3 className={`text-2xl font-bold ${o.featured ? 'mt-1' : 'mt-2'}`}>{o.name}</h3>
            <p className={`mt-2 ${o.featured ? 'text-on-inverse-muted' : 'text-fg-muted'}`}>{o.body}</p>
            <ul className="mt-6 flex-1 space-y-2.5 text-[0.95rem]">
              {o.perks.map((t) => (
                <li key={t} className="flex gap-2.5">
                  <span aria-hidden className={o.featured ? 'text-gold' : 'text-accent'}>✓</span>
                  {t}
                </li>
              ))}
            </ul>
            <a
              href={APP_URL}
              className={`btn mt-8 ${o.featured ? 'bg-gold text-on-gold hover:bg-on-inverse hover:text-inverse' : 'btn-secondary'}`}
            >
              See today’s prices
            </a>
          </li>
        ))}
      </ul>

      <p className="reveal mt-10 flex flex-wrap items-center gap-2 text-fg-muted">
        Running several vehicles?
        <a
          href={whatsappLink('Hi KURA, I’d like fleet pricing for my vehicles.')}
          className="inline-flex items-center gap-1.5 font-semibold text-accent hover:text-accent-strong"
        >
          Talk to us about fleet pricing <IconArrow />
        </a>
      </p>
    </Section>
  )
}
