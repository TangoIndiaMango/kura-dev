import { APP_URL, COMPANY, WHATSAPP_DISPLAY, whatsappLink } from '../lib/config'
import { hashLink, Logo } from './Nav'

export function Footer({ home = true }: { home?: boolean }) {
  const year = new Date().getFullYear()
  const product = [
    { id: 'how-it-works', label: 'How it works' },
    { id: 'pricing', label: 'Plans' },
    { id: 'hubs', label: 'Hubs' },
    { id: 'fleets', label: 'Fleets' },
    { id: 'faq', label: 'FAQ' },
  ]
  const linkCls = 'text-on-inverse-muted transition-colors hover:text-on-inverse'

  return (
    <footer className="bg-inverse px-4 pt-16 pb-10 text-on-inverse sm:px-6 md:px-10" data-theme-surface="inverse">
      <div className="mx-auto max-w-[1240px]">
        <div className="grid gap-12 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1.3fr]">
          <div>
            <Logo invert />
            <p className="mt-4 max-w-xs text-on-inverse-muted">
              Battery swaps for Nigeria’s okada, keke and boat operators — cheaper than petrol, ready in a
              minute.
            </p>
            <a href={APP_URL} className="btn mt-6 bg-on-inverse text-inverse hover:bg-gold hover:text-on-gold">
              Open the KURA app
            </a>
          </div>

          <nav aria-label="Product">
            <p className="kicker text-gold">Product</p>
            <ul className="mt-4 space-y-3">
              {product.map((l) => (
                <li key={l.id}>
                  <a {...hashLink(home, l.id)} className={linkCls}>{l.label}</a>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-label="Company">
            <p className="kicker text-gold">Company</p>
            <ul className="mt-4 space-y-3">
              <li><a href="/contact" className={linkCls}>Contact us</a></li>
              <li><a href="/privacy" className={linkCls}>Privacy policy</a></li>
              <li><a href="/terms" className={linkCls}>Terms of service</a></li>
              <li><a href={APP_URL} className={linkCls}>Sign in</a></li>
            </ul>
          </nav>

          <div>
            <p className="kicker text-gold">Get in touch</p>
            <ul className="mt-4 space-y-3">
              <li>
                <a href={`mailto:${COMPANY.email}`} className={linkCls}>{COMPANY.email}</a>
              </li>
              <li>
                <a href={whatsappLink('Hi KURA, I have a question.')} className={linkCls}>
                  WhatsApp {WHATSAPP_DISPLAY}
                </a>
              </li>
              <li className="text-on-inverse-muted">{COMPANY.address}</li>
            </ul>
            {COMPANY.socials.length ? (
              <ul className="mt-5 flex flex-wrap gap-4">
                {COMPANY.socials.map((s) => (
                  <li key={s.href}>
                    <a href={s.href} className={linkCls} rel="noopener">{s.label}</a>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </div>

        <div className="mt-16 flex flex-col gap-3 border-t border-[color:var(--on-inverse-muted)]/20 pt-6 text-sm text-on-inverse-muted md:flex-row md:items-center md:justify-between">
          <p>
            © {year} {COMPANY.legalName}
            {COMPANY.rcNumber ? ` · RC ${COMPANY.rcNumber}` : ''}. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}
