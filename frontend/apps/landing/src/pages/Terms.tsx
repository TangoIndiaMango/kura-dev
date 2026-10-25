import { COMPANY } from '../lib/config'
import { LegalPage, type LegalSection } from './Legal'

const SECTIONS: LegalSection[] = [
  {
    id: 'about',
    title: 'About these terms',
    body: (
      <p>
        These terms are an agreement between you and {COMPANY.legalName} (“KURA”, “we”) for using our battery-swap
        hubs, app and website. By creating an account you agree to them.
      </p>
    ),
  },
  {
    id: 'account',
    title: 'Your account',
    body: (
      <ul>
        <li>You sign up with a phone number you control and set a 4-digit PIN. Keep your PIN private — anyone with it can confirm bookings on your account.</li>
        <li>Give accurate details. We may ask you to verify your identity before you can use some features.</li>
        <li>Tell us straight away if you think someone else has used your account.</li>
      </ul>
    ),
  },
  {
    id: 'packs',
    title: 'Battery packs',
    body: (
      <ul>
        <li>Packs remain KURA’s property. A swap gives you a charged pack in exchange for the one you return.</li>
        <li>Use packs only in the vehicle they were issued to, and don’t open, modify or tamper with them.</li>
        <li>If a pack isn’t returned within 48 hours of being issued, new bookings for that vehicle pause until it’s returned. After 7 days the pack is treated as lost and the account may be suspended.</li>
        <li>We may recover the cost of packs lost or damaged through misuse.</li>
      </ul>
    ),
  },
  {
    id: 'bookings',
    title: 'Bookings, payments and refunds',
    body: (
      <ul>
        <li>Prices are shown in the app before you pay. You can pay per swap, on a plan, through Paystack, or in cash at the hub.</li>
        <li>A booking paid with Paystack holds a pack once payment is confirmed, for the time shown in the app.</li>
        <li>If you cancel a paid booking, or it runs out before your swap, the amount is refunded to how you paid after a review. We tell you when it’s sent.</li>
        <li>Plans cover the swaps and period shown when you buy them, for the vehicle you choose.</li>
      </ul>
    ),
  },
  {
    id: 'fleets',
    title: 'Fleet accounts',
    body: (
      <p>
        Fleet owners are responsible for the drivers they add, the limits they set and the swaps made on their
        vehicles. Drivers must keep their own PIN private.
      </p>
    ),
  },
  {
    id: 'use',
    title: 'Fair use and safety',
    body: (
      <ul>
        <li>Follow hub staff instructions and safety signs at the bay.</li>
        <li>Don’t misuse the service, try to get around limits or checks, or use someone else’s account.</li>
        <li>We may pause or close accounts involved in fraud, abuse or safety risks.</li>
      </ul>
    ),
  },
  {
    id: 'availability',
    title: 'Availability',
    body: (
      <p>
        We work to keep hubs open and stocked, and show live availability in the app, but we can’t guarantee a pack
        will be available at every hub at every moment unless you hold a confirmed booking.
      </p>
    ),
  },
  {
    id: 'liability',
    title: 'Our responsibility to you',
    body: (
      <p>
        Nothing in these terms limits rights you have under Nigerian consumer protection law. Otherwise, to the extent
        the law allows, we are not responsible for indirect losses such as lost earnings, and our total liability for a
        claim is limited to the amount you paid for the swap or plan concerned.
      </p>
    ),
  },
  {
    id: 'law',
    title: 'Changes and governing law',
    body: (
      <p>
        We may update these terms and will tell you in the app before important changes take effect. These terms are
        governed by the laws of the Federal Republic of Nigeria. Questions? Write to{' '}
        <a href={`mailto:${COMPANY.email}`} className="font-semibold text-accent underline">{COMPANY.email}</a>.
      </p>
    ),
  },
]

export function Terms() {
  return (
    <LegalPage
      title="Terms of service"
      intro={<p>The rules for using KURA hubs, bookings and plans — written to be read, not skimmed past.</p>}
      sections={SECTIONS}
    />
  )
}
