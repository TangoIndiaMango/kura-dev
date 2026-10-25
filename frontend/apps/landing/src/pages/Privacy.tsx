import { COMPANY } from '../lib/config'
import { LegalPage, type LegalSection } from './Legal'

const mail = (e: string) => <a href={`mailto:${e}`} className="font-semibold text-accent underline">{e}</a>

const SECTIONS: LegalSection[] = [
  {
    id: 'who',
    title: 'Who we are',
    body: (
      <p>
        {COMPANY.legalName} (“KURA”, “we”) runs a battery-swap network for electric motorcycles, tricycles and boats
        in Nigeria. We are the data controller for the personal data described here, and we process it in line with
        the Nigeria Data Protection Act 2023 (NDPA). You can reach us about privacy at {mail(COMPANY.email)}.
      </p>
    ),
  },
  {
    id: 'collect',
    title: 'What we collect',
    body: (
      <ul>
        <li><strong>Account details:</strong> your phone number, name, a PIN (stored only as a secure hash) and, if you add one, your email address.</li>
        <li><strong>Identity verification:</strong> the ID you choose to verify with (for example NIN, BVN, voter’s card, passport or driver’s licence), its number and photos. Staff see only the last four digits.</li>
        <li><strong>Vehicles:</strong> registration, model and the battery pack currently fitted.</li>
        <li><strong>Swaps and bookings:</strong> which hub, when, which packs went in and out, charge levels and the agent who served you.</li>
        <li><strong>Payments:</strong> amounts, method and references. Card and bank details are handled by Paystack. We never see or store your full card number.</li>
        <li><strong>Location:</strong> only if you allow it, to show hubs near you. For vehicles fitted with a tracker, location and battery readings from the vehicle.</li>
        <li><strong>Device and usage:</strong> a device identifier and basic technical data used to keep your account secure and spot fraud.</li>
        <li><strong>Support:</strong> messages you send us and the case history.</li>
      </ul>
    ),
  },
  {
    id: 'use',
    title: 'How we use it, and why we are allowed to',
    body: (
      <>
        <ul>
          <li><strong>To provide the service</strong> (contract): your account, bookings, swaps, plans, receipts and refunds.</li>
          <li><strong>To keep packs and accounts safe</strong> (legitimate interests and legal obligation): identity checks, tracking where each pack is, unusual-activity checks, and pausing bookings when a pack isn’t returned.</li>
          <li><strong>To meet the law</strong> (legal obligation): tax, accounting and lawful requests from authorities.</li>
          <li><strong>To tell you about your service</strong> (contract): booking, payment and refund updates in the app.</li>
          <li><strong>Optional data sharing</strong> (consent): anything you opt into in the app’s consent settings. You can withdraw consent at any time.</li>
        </ul>
        <p>We do not sell your personal data.</p>
      </>
    ),
  },
  {
    id: 'share',
    title: 'Who we share it with',
    body: (
      <ul>
        <li><strong>Paystack</strong>, to take payments and send refunds.</li>
        <li><strong>Service providers</strong> who host our systems, store images and send email, under contracts that limit their use of your data.</li>
        <li><strong>Your fleet owner</strong>, if you drive a vehicle on a fleet account: they see that vehicle’s swaps and your limits.</li>
        <li><strong>Your cooperative</strong>, if you belong to one: it may be told when a pack on your vehicle is overdue, and sees totals for its members.</li>
        <li><strong>Authorities</strong>, when the law requires it.</li>
      </ul>
    ),
  },
  {
    id: 'keep',
    title: 'How long we keep it',
    body: (
      <p>
        We keep your data while your account is open and for as long as needed afterwards to meet legal, tax and
        accounting duties and to resolve disputes. Swap, battery and payment records are kept as part of our
        financial and safety records. When data is no longer needed, we delete or anonymise it.
      </p>
    ),
  },
  {
    id: 'rights',
    title: 'Your rights',
    body: (
      <>
        <p>Under the NDPA you can ask us to:</p>
        <ul>
          <li>give you a copy of your personal data;</li>
          <li>correct anything that’s wrong;</li>
          <li>delete your data, where we don’t need to keep it;</li>
          <li>restrict or object to some uses, and withdraw consent;</li>
          <li>move your data to another provider.</li>
        </ul>
        <p>
          Write to {mail(COMPANY.email)} from the phone number or email on your account. You can also
          complain to the Nigeria Data Protection Commission (NDPC).
        </p>
      </>
    ),
  },
  {
    id: 'security',
    title: 'Security',
    body: (
      <p>
        We protect your data with encrypted connections (HTTPS), access controls by role, an audit trail of changes to
        accounts and money, and a certified payment partner. No system is perfectly secure; if a breach puts your rights at risk, we will tell you and the NDPC as
        the law requires.
      </p>
    ),
  },
  {
    id: 'changes',
    title: 'Changes to this policy',
    body: <p>If we change this policy in a way that matters, we’ll tell you in the app before it takes effect.</p>,
  },
]

export function Privacy() {
  return (
    <LegalPage
      title="Privacy policy"
      intro={<p>This policy explains what personal data KURA collects when you use our hubs, app and website, why, and the choices you have.</p>}
      sections={SECTIONS}
    />
  )
}
