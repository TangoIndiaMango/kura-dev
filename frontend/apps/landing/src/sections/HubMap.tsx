import { useEffect, useRef, useState } from 'react'
import type { Map as LeafletMap } from 'leaflet'
import type { PublicHub } from '../lib/network'

const TONE: Record<PublicHub['status'], string> = {
  ready: 'var(--accent)',
  low: 'var(--gold)',
  offline: 'var(--fg-subtle)',
}

/**
 * OpenStreetMap of the live hubs. Leaflet (and its CSS) load only when the
 * map scrolls near the viewport, so it costs nothing on first paint.
 */
export function HubMap({ hubs, focus }: { hubs: PublicHub[]; focus: string | null }) {
  const box = useRef<HTMLDivElement>(null)
  const map = useRef<LeafletMap | null>(null)
  const [near, setNear] = useState(false)

  useEffect(() => {
    const el = box.current
    if (!el || !('IntersectionObserver' in window)) return setNear(true)
    const io = new IntersectionObserver(([e]) => e.isIntersecting && (setNear(true), io.disconnect()), {
      rootMargin: '400px',
    })
    io.observe(el)
    return () => io.disconnect()
  }, [])

  useEffect(() => {
    if (!near || !box.current || hubs.length === 0) return
    let alive = true
    Promise.all([import('leaflet'), import('leaflet/dist/leaflet.css')]).then(([L]) => {
      if (!alive || !box.current) return
      map.current?.remove()
      const m = L.map(box.current, { scrollWheelZoom: false, zoomControl: true, attributionControl: true })
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 18,
        attribution: '© OpenStreetMap contributors',
      }).addTo(m)
      const points = hubs.map((h) => {
        const icon = L.divIcon({
          className: '',
          iconSize: [22, 22],
          iconAnchor: [11, 11],
          html: `<span style="display:block;width:22px;height:22px;border-radius:999px;background:${TONE[h.status]};border:3px solid var(--surface);box-shadow:0 2px 8px rgb(0 0 0/.35)"></span>`,
        })
        L.marker([h.lat, h.lng], { icon, title: h.name, alt: h.name })
          .addTo(m)
          .bindPopup(`<strong>${escapeHtml(h.name)}</strong><br>${h.ready_count} packs ready`)
        return [h.lat, h.lng] as [number, number]
      })
      const open = hubs.filter((h) => h.status !== 'offline').map((h) => [h.lat, h.lng] as [number, number])
      m.fitBounds(L.latLngBounds(open.length ? open : points).pad(0.2), { maxZoom: 13 })
      map.current = m
    })
    return () => {
      alive = false
      map.current?.remove()
      map.current = null
    }
  }, [near, hubs])

  useEffect(() => {
    const h = hubs.find((x) => x.name === focus)
    if (h && map.current) map.current.flyTo([h.lat, h.lng], 14, { duration: 0.8 })
  }, [focus, hubs])

  return (
    <div
      ref={box}
      data-lenis-prevent
      role="region"
      aria-label="Map of KURA hubs"
      className="h-[360px] w-full overflow-hidden rounded-3xl bg-surface-2 sm:h-[460px] lg:h-full lg:min-h-[520px]"
    />
  )
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)
}
