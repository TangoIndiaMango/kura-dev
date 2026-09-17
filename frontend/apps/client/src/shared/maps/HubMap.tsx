import React, { useEffect, useMemo } from 'react'
import { useMantineColorScheme } from '@mantine/core'
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Tooltip,
  useMap,
} from 'react-leaflet'
import { Location01Icon } from 'hugeicons-react'
import type { LatLngBoundsExpression, LatLngExpression } from 'leaflet'
import 'leaflet/dist/leaflet.css'

export interface HubMapPoint {
  id: string
  name: string
  lat: number
  lng: number
  status: 'ready' | 'low' | 'offline' | 'open'
}

interface HubMapProps {
  hubs: HubMapPoint[]
  selectedId?: string | null
  userPosition?: { lat: number; lng: number } | null
  heightClassName?: string
  onSelectHub?: (id: string) => void
  banner?: string
  focusHubId?: string | null
  showRecenter?: boolean
}

function pinColor(status: HubMapPoint['status']) {
  if (status === 'offline') return '#E74C3C'
  if (status === 'low') return '#F5A623'
  return '#27AE60'
}

function FitBounds({
  points,
  userPosition,
}: {
  points: LatLngExpression[]
  userPosition: LatLngExpression | null
}) {
  const map = useMap()

  useEffect(() => {
    if (!points.length) {
      if (userPosition) map.setView(userPosition, 13)
      return
    }
    const bounds = (
      userPosition ? [...points, userPosition] : points
    ) as LatLngBoundsExpression
    map.fitBounds(bounds, { padding: [36, 36], maxZoom: 14 })
  }, [map, points, userPosition])

  return null
}

function RecenterControl({ onRecenter }: { onRecenter: () => void }) {
  return (
    <button
      type="button"
      onClick={onRecenter}
      className="absolute bottom-3 right-3 z-[1000] rounded-full border border-[var(--kura-border)] bg-[var(--kura-bg-elevated)] p-2.5 text-[var(--kura-teal-bright)] shadow-md"
      aria-label="Recenter map"
    >
      <Location01Icon size={16} />
    </button>
  )
}

function RecenterButton({
  hubs,
  userPosition,
}: {
  hubs: HubMapPoint[]
  userPosition: { lat: number; lng: number } | null
}) {
  const map = useMap()

  return (
    <RecenterControl
      onRecenter={() => {
        if (!hubs.length) {
          if (userPosition) {
            map.setView([userPosition.lat, userPosition.lng], 13)
          }
          return
        }
        const active = hubs.filter((h) => h.status !== 'offline')
        const source = active.length ? active : hubs
        const hubPts = source.map((h) => [h.lat, h.lng] as LatLngExpression)
        const bounds = (
          userPosition
            ? [...hubPts, [userPosition.lat, userPosition.lng]]
            : hubPts
        ) as LatLngBoundsExpression
        map.fitBounds(bounds, { padding: [36, 36], maxZoom: 14 })
      }}
    />
  )
}

/** OpenStreetMap hub map — no API key required. */
export const HubMap: React.FC<HubMapProps> = ({
  hubs,
  selectedId,
  userPosition = null,
  heightClassName = 'h-44',
  onSelectHub,
  banner,
  focusHubId,
  showRecenter = false,
}) => {
  const { colorScheme } = useMantineColorScheme()
  const isDark = colorScheme !== 'light'

  const focus = useMemo(() => {
    const hub = hubs.find((h) => h.id === (focusHubId || selectedId))
    if (hub) return { lat: hub.lat, lng: hub.lng }
    if (userPosition) return userPosition
    if (hubs[0]) return { lat: hubs[0].lat, lng: hubs[0].lng }
    return { lat: 6.5244, lng: 3.3792 }
  }, [focusHubId, hubs, selectedId, userPosition])

  const hubPoints = useMemo(
    () =>
      hubs
        .filter((h) => h.status !== 'offline')
        .map((h) => [h.lat, h.lng] as LatLngExpression),
    [hubs],
  )

  const tileUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
  const attribution =
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-[var(--kura-border)] bg-[var(--kura-bg-elevated)] ${heightClassName}`}
    >
      <MapContainer
        center={[focus.lat, focus.lng]}
        zoom={13}
        className={`h-full w-full [&_.leaflet-control-attribution]:text-[9px] ${
          isDark ? 'kura-map-dark' : ''
        }`}
        zoomControl={false}
        attributionControl
        scrollWheelZoom={false}
      >
        <TileLayer url={tileUrl} attribution={attribution} />
        <FitBounds
          points={hubPoints}
          userPosition={
            userPosition
              ? [userPosition.lat, userPosition.lng]
              : null
          }
        />

        {userPosition ? (
          <CircleMarker
            center={[userPosition.lat, userPosition.lng]}
            radius={8}
            pathOptions={{
              color: '#ffffff',
              weight: 2,
              fillColor: '#2FBECF',
              fillOpacity: 1,
            }}
          >
            <Tooltip direction="top" offset={[0, -6]}>
              You
            </Tooltip>
          </CircleMarker>
        ) : null}

        {hubs.map((hub) => (
          <CircleMarker
            key={hub.id}
            center={[hub.lat, hub.lng]}
            radius={hub.id === selectedId ? 11 : 8}
            pathOptions={{
              color: '#ffffff',
              weight: 2,
              fillColor: pinColor(hub.status),
              fillOpacity: hub.status === 'offline' ? 0.55 : 1,
            }}
            eventHandlers={{
              click: () => onSelectHub?.(hub.id),
            }}
          >
            <Tooltip direction="top" offset={[0, -6]}>
              {hub.name}
            </Tooltip>
          </CircleMarker>
        ))}

        {showRecenter ? (
          <RecenterButton hubs={hubs} userPosition={userPosition} />
        ) : null}
      </MapContainer>

      {banner ? (
        <div className="pointer-events-none absolute left-3 right-3 top-3 z-[1000] rounded-xl border border-[var(--kura-border)] bg-[var(--kura-map-scrim)] px-3 py-2 text-[11px] font-medium text-[var(--kura-text)] backdrop-blur-sm">
          {banner}
        </div>
      ) : null}
    </div>
  )
}

/** @deprecated Use HubMap — kept as alias during swap. */
export const GoogleHubMap = HubMap
