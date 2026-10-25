import { Photo } from '../components/Photo'
import { IconArrow } from '../components/Icons'
import { APP_URL, USSD_CODE, whatsappLink } from '../lib/config'

export function PromiseBand() {
  return (
    <section className="relative overflow-hidden bg-inverse px-4 py-24 text-on-inverse sm:px-6 md:px-10 md:py-32">
      <Photo
        name="rider-motion"
        alt=""
        sizes="50vw"
        className="absolute inset-y-0 right-0 hidden w-1/2 md:block"
        imgClassName="h-full w-full object-cover opacity-50"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-inverse via-inverse/90 to-inverse/30" />
      <div className="relative mx-auto max-w-[1240px]">
        <p className="kicker reveal text-gold">One promise</p>
        <p lang="pcm" className="display reveal mt-6 text-[4.2rem] sm:text-[6.5rem] lg:text-[8.5rem]" style={{ ['--i' as string]: 1 }}>
          E cheap pass
          <br />
          <span className="text-gold">petrol.</span>
        </p>
        <p className="reveal mt-6 text-on-inverse-muted" style={{ ['--i' as string]: 2 }}>
          Nigerian Pidgin for “it’s cheaper than petrol”.
        </p>
      </div>
    </section>
  )
}

export function Cta() {
  return (
    <section className="px-4 pb-20 sm:px-6 md:px-10 md:pb-28">
      <div className="relative mx-auto max-w-[1240px] overflow-hidden rounded-[2rem] bg-accent px-6 py-16 text-on-accent sm:px-12 md:py-20">
        <span aria-hidden className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-gold/25 blur-3xl" />
        <div className="relative max-w-2xl">
          <h2 className="display reveal text-[3.4rem] sm:text-[5rem]">Stop buying petrol.</h2>
          <p className="reveal mt-5 text-lg opacity-85" style={{ ['--i' as string]: 1 }}>
            Sign up with your phone number in a couple of minutes, add your vehicle and book your first swap.
          </p>
          <div className="reveal mt-9 flex flex-wrap gap-3" style={{ ['--i' as string]: 2 }}>
            <a href={APP_URL} className="btn bg-on-accent text-accent hover:bg-gold hover:text-on-gold">
              Get started <IconArrow />
            </a>
            <a href={whatsappLink('Hi KURA, I have a question.')} className="btn ring-1 ring-current hover:bg-on-accent/10">
              Chat on WhatsApp
            </a>
          </div>
          {USSD_CODE ? (
            <p className="mt-8 opacity-85">
              No smartphone? Dial <strong className="text-xl">{USSD_CODE}</strong>. It works on every network.
            </p>
          ) : null}
        </div>
      </div>
    </section>
  )
}
