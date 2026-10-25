import { useId, useState } from 'react'
import { IconPlus } from '../components/Icons'
import { Heading, Section } from '../components/Section'
import { whatsappLink } from '../lib/config'

// Answers match how the system works today; keep them in step with the app.
export const FAQ: { q: string; a: string }[] = [
  {
    q: 'What vehicles can use KURA?',
    a: 'Electric motorcycles (okada), tricycles (keke) and boats that run on a KURA-compatible battery pack. If you ride petrol today, talk to us about switching.',
  },
  {
    q: 'How do I pay?',
    a: 'Pay ahead in the app with Paystack (card, bank transfer or USSD), or pay the agent in cash at the hub. You can also pay per swap or buy a daily, weekly or monthly plan for your vehicle.',
  },
  {
    q: 'Do I need to book before I go?',
    a: 'No — you can walk into any open hub. Booking holds a charged pack for you so it’s waiting when you arrive. A Paystack booking is held once it’s paid.',
  },
  {
    q: 'What if I book and can’t make it?',
    a: 'Cancel in the app any time. If you paid and the booking is cancelled or runs out before your swap, the money goes back to the card or account you paid from after a quick review — we let you know when it’s sent.',
  },
  {
    q: 'What if the hub runs out of packs?',
    a: 'The app shows how many charged packs each hub has right now, so you can pick one that’s ready. Booking ahead guarantees yours.',
  },
  {
    q: 'Do I own the battery?',
    a: 'No — packs belong to KURA and you swap them for a full one each time. Bring your pack back when you swap: if a pack is kept for more than 48 hours, new bookings for that vehicle pause until it’s returned.',
  },
  {
    q: 'Do I need a smartphone?',
    a: 'KURA runs in your phone’s web browser — there’s nothing to download from an app store. At the hub, the agent can also find your booking with your code.',
  },
  {
    q: 'I own several vehicles. Can I manage them together?',
    a: 'Yes. A fleet account holds all your vehicles, lets you assign drivers who swap with their own PIN, set daily limits per driver, and see every swap with a receipt.',
  },
  {
    q: 'How is my data used?',
    a: 'We use your details to run your account, verify who you are, process swaps and payments, and keep you safe. We don’t sell your data. See our privacy policy for the details.',
  },
]

function Item({ q, a, open, onToggle }: { q: string; a: string; open: boolean; onToggle: () => void }) {
  const id = useId()
  return (
    <li className="border-b border-line">
      <h3>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={id}
          onClick={onToggle}
          className="flex w-full items-center justify-between gap-6 py-6 text-left text-lg font-semibold sm:text-xl"
        >
          {q}
          <span
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-line transition-transform duration-300 ${
              open ? 'rotate-45 bg-fg text-bg' : ''
            }`}
          >
            <IconPlus className="h-4 w-4" />
          </span>
        </button>
      </h3>
      <div
        id={id}
        role="region"
        className={`grid transition-[grid-template-rows] duration-500 ease-out ${open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}
      >
        <div className="overflow-hidden">
          <p className="max-w-3xl pb-6 text-fg-muted">
            {a}
            {q.startsWith('How is my data') ? (
              <>
                {' '}
                <a href="/privacy" className="font-semibold text-accent underline underline-offset-2">Privacy policy</a>
              </>
            ) : null}
          </p>
        </div>
      </div>
    </li>
  )
}

export function Faq() {
  const [open, setOpen] = useState<number | null>(0)
  return (
    <Section id="faq">
      <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr]">
        <div>
          <Heading kicker="FAQ" title="Questions riders ask" lede="Can’t find your answer? Message us — a real person replies." />
          <a href={whatsappLink('Hi KURA, I have a question: ')} className="btn btn-secondary reveal mt-8">
            Ask on WhatsApp
          </a>
        </div>
        <ul className="reveal border-t border-line">
          {FAQ.map((f, i) => (
            <Item key={f.q} q={f.q} a={f.a} open={open === i} onToggle={() => setOpen(open === i ? null : i)} />
          ))}
        </ul>
      </div>
    </Section>
  )
}
