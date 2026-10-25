import { useEffect, useRef, useState } from 'react'
import type Lenis from 'lenis'

export function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

let lenis: Lenis | null = null

/** Smooth scrolling (Lenis) — off for reduced motion. Anchor links go through it. */
export function useSmoothScroll() {
  useEffect(() => {
    if (prefersReducedMotion()) return
    let raf = 0
    let alive = true
    import('lenis').then(({ default: L }) => {
      if (!alive) return
      lenis = new L({ duration: 1.1, easing: (t) => 1 - Math.pow(1 - t, 4) })
      const loop = (time: number) => {
        lenis?.raf(time)
        raf = requestAnimationFrame(loop)
      }
      raf = requestAnimationFrame(loop)
    })
    return () => {
      alive = false
      cancelAnimationFrame(raf)
      lenis?.destroy()
      lenis = null
    }
  }, [])
}

/** In-page links: smooth with Lenis, honouring the fixed nav. */
export function scrollToHash(hash: string) {
  const el = document.querySelector(hash)
  if (!el) return false
  if (lenis) lenis.scrollTo(el as HTMLElement, { offset: -88 })
  else el.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth' })
  history.replaceState(null, '', hash)
  return true
}

/** Fades `.reveal` elements in as they enter the viewport (once each). */
export function useReveal(deps: unknown[] = []) {
  useEffect(() => {
    const els = document.querySelectorAll<HTMLElement>('.reveal:not(.is-in)')
    if (!('IntersectionObserver' in window)) {
      els.forEach((el) => el.classList.add('is-in'))
      return
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue
          e.target.classList.add('is-in')
          io.unobserve(e.target)
        }
      },
      { rootMargin: '0px 0px -8% 0px' },
    )
    els.forEach((el) => io.observe(el))
    return () => io.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
}

/** Counts up to `to` once visible (instant with reduced motion). */
export function useCountUp(to: number | null, ms = 1200) {
  const ref = useRef<HTMLElement | null>(null)
  const [value, setValue] = useState(0)
  useEffect(() => {
    if (to === null) return
    const el = ref.current
    if (!el || prefersReducedMotion() || !('IntersectionObserver' in window)) {
      setValue(to)
      return
    }
    let raf = 0
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return
      io.disconnect()
      const start = performance.now()
      const tick = (now: number) => {
        const p = Math.min(1, (now - start) / ms)
        setValue(Math.round(to * (1 - Math.pow(1 - p, 3))))
        if (p < 1) raf = requestAnimationFrame(tick)
      }
      raf = requestAnimationFrame(tick)
    })
    io.observe(el)
    return () => {
      io.disconnect()
      cancelAnimationFrame(raf)
    }
  }, [to, ms])
  return { ref, value }
}

/** Gentle vertical parallax for a media element (translate only, GPU-cheap). */
export function useParallax<T extends HTMLElement>(strength = 0.08) {
  const ref = useRef<T | null>(null)
  useEffect(() => {
    const el = ref.current
    if (!el || prefersReducedMotion()) return
    let raf = 0
    const update = () => {
      const r = el.parentElement?.getBoundingClientRect() ?? el.getBoundingClientRect()
      const offset = (r.top + r.height / 2 - window.innerHeight / 2) * -strength
      el.style.transform = `translate3d(0, ${offset.toFixed(1)}px, 0) scale(1.08)`
      raf = 0
    }
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update)
    }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      cancelAnimationFrame(raf)
    }
  }, [strength])
  return ref
}
