import { useEffect, useRef, useState, type MouseEvent } from 'react'
import { APP_URL } from '../lib/config'
import { scrollToHash } from '../lib/motion'
import { useTheme } from '../lib/theme'
import { IconMoon, IconSun } from './Icons'

export const NAV_LINKS = [
  { id: 'how-it-works', label: 'How it works' },
  { id: 'pricing', label: 'Plans' },
  { id: 'hubs', label: 'Hubs' },
  { id: 'fleets', label: 'Fleets' },
  { id: 'faq', label: 'FAQ' },
]

export function Logo({ invert = false }: { invert?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <img src="/brand/kura-mark-circle.png" alt="" width={34} height={34} className="rounded-full" />
      <span className={`text-[1.35rem] font-extrabold tracking-tight ${invert ? 'text-on-inverse' : ''}`} style={{ fontStretch: '80%' }}>
        KURA<span className="text-gold">.</span>
      </span>
    </span>
  )
}

/** In-page anchors scroll smoothly on the home page; elsewhere they go home. */
export function hashLink(home: boolean, id: string) {
  return {
    href: home ? `#${id}` : `/#${id}`,
    onClick: (e: MouseEvent) => {
      if (home && scrollToHash(`#${id}`)) e.preventDefault()
    },
  }
}

export function Nav({ home = true }: { home?: boolean }) {
  const { theme, toggle } = useTheme()
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [active, setActive] = useState('')
  const sheet = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Highlight the section in view.
  useEffect(() => {
    if (!home || !('IntersectionObserver' in window)) return
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && setActive(e.target.id)),
      { rootMargin: '-45% 0px -50% 0px' },
    )
    NAV_LINKS.forEach((l) => {
      const el = document.getElementById(l.id)
      if (el) io.observe(el)
    })
    return () => io.disconnect()
  }, [home])

  // Mobile sheet: lock scroll, Esc closes, focus stays inside.
  useEffect(() => {
    if (!open) return
    document.body.style.overflow = 'hidden'
    const first = sheet.current?.querySelector<HTMLElement>('a,button')
    first?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
      if (e.key !== 'Tab' || !sheet.current) return
      const items = sheet.current.querySelectorAll<HTMLElement>('a,button')
      const [a, b] = [items[0], items[items.length - 1]]
      if (e.shiftKey && document.activeElement === a) (e.preventDefault(), b.focus())
      else if (!e.shiftKey && document.activeElement === b) (e.preventDefault(), a.focus())
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  const themeLabel = theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'

  return (
    <header className="fixed inset-x-0 top-0 z-50 px-3 pt-3 sm:px-5">
      <nav
        aria-label="Main"
        className={`mx-auto flex max-w-[1240px] items-center justify-between rounded-full border px-3 transition-all duration-500 sm:px-4 ${
          scrolled || open
            ? 'h-14 border-line bg-surface/85 shadow-card backdrop-blur-xl'
            : 'h-16 border-transparent bg-transparent'
        }`}
      >
        <a href="/" aria-label="KURA Mobility home" className="pl-1">
          <Logo />
        </a>

        <ul className="hidden items-center gap-1 lg:flex">
          {NAV_LINKS.map((l) => (
            <li key={l.id}>
              <a
                {...hashLink(home, l.id)}
                aria-current={active === l.id ? 'true' : undefined}
                className={`relative rounded-full px-3.5 py-2 text-[0.95rem] font-medium transition-colors ${
                  active === l.id ? 'text-fg' : 'text-fg-muted hover:text-fg'
                }`}
              >
                {l.label}
                <span
                  className={`absolute inset-x-3.5 -bottom-0.5 h-0.5 rounded-full bg-accent transition-transform duration-300 ${
                    active === l.id ? 'scale-x-100' : 'scale-x-0'
                  }`}
                />
              </a>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={toggle}
            aria-label={themeLabel}
            title={themeLabel}
            className="flex h-11 w-11 items-center justify-center rounded-full text-fg-muted transition-colors hover:bg-surface-2 hover:text-fg"
          >
            {theme === 'dark' ? <IconSun /> : <IconMoon />}
          </button>
          <a href={APP_URL} className="hidden px-3 text-[0.95rem] font-medium text-fg-muted hover:text-fg sm:block">
            Sign in
          </a>
          <a href={APP_URL} className="btn btn-primary hidden min-h-10 px-5 text-[0.95rem] sm:inline-flex">
            Get started
          </a>
          <button
            type="button"
            className="flex h-11 w-11 items-center justify-center rounded-full lg:hidden"
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
            aria-controls="mobile-menu"
            onClick={() => setOpen((v) => !v)}
          >
            <span className="relative block h-3.5 w-5">
              <span className={`absolute left-0 h-0.5 w-5 rounded bg-fg transition-all duration-300 ${open ? 'top-1.5 rotate-45' : 'top-0'}`} />
              <span className={`absolute left-0 h-0.5 w-5 rounded bg-fg transition-all duration-300 ${open ? 'top-1.5 -rotate-45' : 'top-3'}`} />
            </span>
          </button>
        </div>
      </nav>

      <div
        id="mobile-menu"
        ref={sheet}
        hidden={!open}
        className="fixed inset-x-3 top-[4.5rem] bottom-3 overflow-y-auto rounded-[1.75rem] border border-line bg-surface p-6 shadow-card lg:hidden"
      >
        <ul>
          {NAV_LINKS.map((l) => (
            <li key={l.id}>
              <a
                {...hashLink(home, l.id)}
                onClick={(e) => {
                  setOpen(false)
                  hashLink(home, l.id).onClick(e)
                }}
                className="flex min-h-14 items-center border-b border-line text-2xl font-semibold"
              >
                {l.label}
              </a>
            </li>
          ))}
        </ul>
        <div className="mt-8 grid gap-3">
          <a href={APP_URL} className="btn btn-primary">Get started</a>
          <a href={APP_URL} className="btn btn-secondary">Sign in</a>
        </div>
      </div>
    </header>
  )
}
