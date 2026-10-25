import type { ReactNode } from 'react'
import { IconChat, IconMail, IconPin } from '../components/Icons'
import { APP_URL, COMPANY, WHATSAPP_DISPLAY, whatsappLink } from '../lib/config'

function Card({ icon, title, body, children }: { icon: ReactNode; title: string; body: string; children: ReactNode }) {
  return (
    <li className="card flex flex-col p-7">
      <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent-soft text-accent">{icon}</span>
      <h2 className="mt-5 text-xl font-bold">{title}</h2>
      <p className="mt-2 flex-1 text-fg-muted">{body}</p>
      <div className="mt-6">{children}</div>
    </li>
  )
}

const link = 'inline-flex items-center gap-2 font-semibold text-accent hover:text-accent-strong break-all'

export function Contact() {
  return (
    <section className="px-4 pt-32 pb-24 sm:px-6 md:px-10 md:pt-40">
      <div className="mx-auto max-w-[1240px]">
        <p className="kicker text-accent">Contact us</p>
        <h1 className="mt-4 max-w-3xl text-5xl font-bold sm:text-6xl">We’re here to keep you moving.</h1>
        <p className="mt-5 max-w-2xl text-lg text-fg-muted">
          Riders get the fastest answer on WhatsApp. For fleets, partnerships, your data or anything else, email us
          and a person will reply.
        </p>

        <ul className="mt-14 grid gap-5 md:grid-cols-3">
          <Card icon={<IconChat />} title="WhatsApp" body="Help with a swap, a booking, a payment or a refund.">
            <a href={whatsappLink('Hi KURA, I need help with: ')} className={link}>{WHATSAPP_DISPLAY}</a>
          </Card>
          <Card icon={<IconMail />} title="Email" body="Fleets, partnerships, press, privacy requests. One inbox for everything.">
            <a href={`mailto:${COMPANY.email}`} className={link}>{COMPANY.email}</a>
          </Card>
          <Card icon={<IconPin />} title="Office" body={COMPANY.hours}>
            <p className="font-semibold">{COMPANY.legalName}</p>
            <p className="text-fg-muted">{COMPANY.address}</p>
          </Card>
        </ul>

        <div className="card mt-5 flex flex-col justify-between gap-6 p-7 sm:flex-row sm:items-center">
          <div>
            <p className="font-semibold">Already a rider?</p>
            <p className="mt-1 text-fg-muted">
              Your bookings, receipts and support cases are in the app, and you can open a support case there too.
            </p>
          </div>
          <a href={APP_URL} className="btn btn-primary shrink-0">Open the KURA app</a>
        </div>
      </div>
    </section>
  )
}
