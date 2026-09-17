import { useEffect, useState } from 'react'

export type GeoPosition = { lat: number; lng: number }

/** Browser Geolocation — no extra package. Denied → null (hubs still list). */
export function useOperatorGeolocation(enabled = true) {
  const [position, setPosition] = useState<GeoPosition | null>(null)
  const [denied, setDenied] = useState(false)

  useEffect(() => {
    if (!enabled || typeof navigator === 'undefined' || !navigator.geolocation) {
      return
    }
    const id = navigator.geolocation.watchPosition(
      (pos) => {
        setPosition({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        })
        setDenied(false)
      },
      () => setDenied(true),
      { enableHighAccuracy: false, maximumAge: 60_000, timeout: 12_000 },
    )
    return () => navigator.geolocation.clearWatch(id)
  }, [enabled])

  return { position, denied }
}

export function haversineKm(
  a: GeoPosition,
  b: { lat: number; lng: number },
): number {
  const toRad = (d: number) => (d * Math.PI) / 180
  const R = 6371
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const lat1 = toRad(a.lat)
  const lat2 = toRad(b.lat)
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h))
}

export function formatDistanceKm(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`
  if (km < 10) return `${km.toFixed(1)} km`
  return `${Math.round(km)} km`
}
