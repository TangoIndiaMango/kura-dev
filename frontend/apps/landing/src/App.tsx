import { Footer } from './components/Footer'
import { Nav } from './components/Nav'
import { useReveal, useSmoothScroll } from './lib/motion'
import { useNetwork } from './lib/network'
import { Contact } from './pages/Contact'
import { Privacy } from './pages/Privacy'
import { Terms } from './pages/Terms'
import { Calculator } from './sections/Calculator'
import { Cta, PromiseBand } from './sections/Cta'
import { Faq } from './sections/Faq'
import { Features } from './sections/Features'
import { Fleets } from './sections/Fleets'
import { Hero } from './sections/Hero'
import { HowItWorks, Ticker } from './sections/HowItWorks'
import { Hubs } from './sections/Hubs'
import { Plans } from './sections/Plans'

export type Path = '/' | '/privacy' | '/terms' | '/contact'

export const PAGES: Record<Path, { title: string; description: string }> = {
  '/': {
    title: 'KURA Mobility | A full EV battery in 60 seconds',
    description:
      'Swap an empty EV battery for a full one in about a minute at a KURA hub in Lagos. For okada, keke and boat operators and fleets. Live hubs and prices.',
  },
  '/contact': {
    title: 'Contact KURA Mobility',
    description: 'Talk to KURA about swaps, bookings, fleets, partnerships or your data. WhatsApp and email.',
  },
  '/privacy': {
    title: 'Privacy policy | KURA Mobility',
    description: 'What personal data KURA collects, why, who we share it with and your rights under the NDPA 2023.',
  },
  '/terms': {
    title: 'Terms of service | KURA Mobility',
    description: 'The rules for using KURA battery-swap hubs, bookings, plans and fleet accounts.',
  },
}

export function toPath(pathname: string): Path {
  const p = pathname.replace(/\/+$/, '') || '/'
  return (p in PAGES ? p : '/') as Path
}

function Home() {
  const net = useNetwork()
  // Re-run once live data lands so new rows animate in too.
  useReveal([net.loading])
  return (
    <>
      <Hero net={net} />
      <Ticker />
      <HowItWorks />
      <Features net={net} />
      <Calculator />
      <Plans />
      <PromiseBand />
      <Hubs net={net} />
      <Fleets />
      <Faq />
      <Cta />
    </>
  )
}

export default function App({ path }: { path: Path }) {
  const home = path === '/'
  useSmoothScroll()
  useReveal([path])
  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[60] focus:rounded-full focus:bg-fg focus:px-4 focus:py-2 focus:text-bg"
      >
        Skip to content
      </a>
      <Nav home={home} />
      <main id="main">
        {path === '/' ? <Home /> : null}
        {path === '/contact' ? <Contact /> : null}
        {path === '/privacy' ? <Privacy /> : null}
        {path === '/terms' ? <Terms /> : null}
      </main>
      <Footer home={home} />
    </>
  )
}
