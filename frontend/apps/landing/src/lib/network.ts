import { useEffect, useState } from 'react'
import { API_BASE_URL, type VehicleType } from './config'

/** GET /public/network/ — the live hubs, plans and pay-per-swap prices. */
export type PublicHub = {
  name: string
  address: string
  status: 'ready' | 'low' | 'offline'
  ready_count: number
  hours_label: string
  lat: number
  lng: number
}

export type PublicPlan = {
  vehicle_type: VehicleType
  name: string
  period: 'swap' | 'day' | 'week' | 'month'
  price_kobo: number
  swap_allowance: number | null
  duration_days: number | null
}

export type Network = {
  hubs: PublicHub[]
  plans: PublicPlan[]
  pay_per_swap_kobo: Partial<Record<VehicleType, number>>
}

export type NetworkState = { data: Network | null; loading: boolean }

export function useNetwork(): NetworkState {
  const [state, setState] = useState<NetworkState>({ data: null, loading: Boolean(API_BASE_URL) })
  useEffect(() => {
    if (!API_BASE_URL) return
    const ctrl = new AbortController()
    fetch(`${API_BASE_URL}/public/network/`, { signal: ctrl.signal })
      .then((r) => (r.ok ? (r.json() as Promise<Network>) : null))
      .then((data) => setState({ data, loading: false }))
      .catch(() => {
        if (!ctrl.signal.aborted) setState({ data: null, loading: false })
      })
    return () => ctrl.abort()
  }, [])
  return state
}

export function naira(kobo: number): string {
  return `₦${Math.round(kobo / 100).toLocaleString('en-NG')}`
}

/** Area and state for a hub, from "Street, Area, State". */
export function hubArea(address: string): { area: string; state: string } {
  const parts = address.split(',').map((p) => p.trim()).filter(Boolean)
  return {
    area: parts.length > 1 ? parts[parts.length - 2] : (parts[0] ?? ''),
    state: parts[parts.length - 1] ?? '',
  }
}

export function openHubs(net: Network | null): PublicHub[] {
  return (net?.hubs ?? []).filter((h) => h.status !== 'offline')
}

export function plansFor(net: Network | null, type: VehicleType): PublicPlan[] {
  return (net?.plans ?? []).filter((p) => p.vehicle_type === type)
}

/** Cheapest daily plan, else the pay-per-swap price — "from ₦…" on cards. */
export function fromPrice(net: Network | null, type: VehicleType): { kobo: number; per: string } | null {
  const daily = plansFor(net, type).find((p) => p.period === 'day')
  if (daily) return { kobo: daily.price_kobo, per: 'day' }
  const swap = net?.pay_per_swap_kobo[type]
  return swap ? { kobo: swap, per: 'swap' } : null
}

export function liveStates(net: Network | null): string[] {
  return [...new Set(openHubs(net).map((h) => hubArea(h.address).state).filter(Boolean))]
}

/** Hubs with real coordinates (test/unfinished hubs sit at 0,0). */
export function mappable(hubs: PublicHub[]): PublicHub[] {
  return hubs.filter((h) => Number.isFinite(h.lat) && Number.isFinite(h.lng) && !(Math.abs(h.lat) < 0.01 && Math.abs(h.lng) < 0.01))
}

export function directionsUrl(h: PublicHub): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${h.lat},${h.lng}`
}
