import { useState, type ReactNode } from 'react'
import { Modal } from '@mantine/core'
import type { HubStationExtras } from './hubDetailHelpers'
import type { HubStationAgent } from './HubStationAgents'

function initials(name: string) {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0] ?? ''}${parts[parts.length - 1][0] ?? ''}`.toUpperCase()
}

function Field({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="text-[12px] font-medium text-[var(--mu)]">{label}</p>
      <div className="mt-1 text-[14px] font-semibold text-[var(--tx)]">{value}</div>
    </div>
  )
}

function MapEmbed({
  name,
  lat,
  lng,
}: {
  name: string
  lat: number
  lng: number
}) {
  const delta = 0.012
  const bbox = `${lng - delta}%2C${lat - delta}%2C${lng + delta}%2C${lat + delta}`
  const embed = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat}%2C${lng}`
  return (
    <div className="relative aspect-[16/10] w-full overflow-hidden rounded-[10px] bg-[var(--in)]">
      <iframe
        title={`Map — ${name}`}
        src={embed}
        className="absolute inset-0 h-full w-full border-0"
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
      />
    </div>
  )
}

export function HubStationOverview({
  stationId,
  name,
  address,
  lastSync,
  extras,
  agents,
  leadPhone,
  onLeadClick,
}: {
  stationId: string
  name: string
  address: string
  lastSync: string
  extras: HubStationExtras
  agents: HubStationAgent[]
  leadPhone: string
  onLeadClick?: () => void
}) {
  const [mapOpen, setMapOpen] = useState(false)
  const onDuty = agents.filter((a) => a.onDuty)
  const lead = onDuty[0] ?? agents[0]
  const extraCount = Math.max(0, agents.length - 1)
  const agentsOnDuty = onDuty.length
  const agentsTotal = agents.length

  return (
    <>
      <section className="rounded-[16px] border border-[var(--bd)] bg-[var(--sf)] p-5 shadow-[var(--sh)] sm:p-6">
        <h2 className="text-[16px] font-bold text-[var(--tx)]">Station overview</h2>

        {lead ? (
          <div className="mt-4 flex items-center gap-3">
            {extraCount > 0 ? (
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--tn)] text-[12px] font-bold text-[var(--mu)]">
                +{extraCount}
              </span>
            ) : null}
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--prs)] text-[13px] font-bold text-[var(--pr)]">
              {initials(lead.name)}
            </div>
            <div className="min-w-0">
              <button
                type="button"
                onClick={onLeadClick}
                className="truncate text-[14px] font-bold text-[var(--tx)] hover:text-[var(--pr)]"
              >
                {lead.name}
              </button>
              <p className="text-[12.5px] text-[var(--mu)]">
                {lead.onDuty ? 'On duty' : 'Assigned'} · {leadPhone || lead.phone}
              </p>
            </div>
          </div>
        ) : null}

        <div className="mt-5 grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2">
          <Field label="Hub operators on duty" value={`${agentsOnDuty}/${agentsTotal}`} />
          <Field label="Last sync" value={lastSync} />
          <Field label="Status" value={extras.healthLabel} />
          <Field label="Hours" value={extras.hours} />
          <Field
            label="Battery types in stock"
            value={extras.batteryTypes.length ? extras.batteryTypes.join(' · ') : 'None in stock'}
          />
          <Field
            label="Solar"
            value={extras.solarCapacityKw ? `${extras.solarCapacityKw.toFixed(1)} kW rated` : 'Not configured'}
          />
          <Field label="Station ID" value={stationId} />
          <div className="min-w-0 sm:col-span-2">
            <p className="text-[12px] font-medium text-[var(--mu)]">Address</p>
            <div className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <p className="text-[14px] font-semibold text-[var(--tx)]">{address}</p>
              <button
                type="button"
                onClick={() => setMapOpen(true)}
                className="text-[13px] font-semibold text-[var(--pr)] hover:underline"
              >
                View map
              </button>
            </div>
            <p className="mt-1 text-[11.5px] tabular-nums text-[var(--su)]">
              GPS {extras.lat.toFixed(4)}, {extras.lng.toFixed(4)}
            </p>
          </div>
        </div>
      </section>

      <Modal
        opened={mapOpen}
        onClose={() => setMapOpen(false)}
        title={name}
        size="lg"
        centered
        radius="md"
        styles={{
          header: { background: 'var(--sf)', borderBottom: '1px solid var(--bd)' },
          title: { fontWeight: 700, color: 'var(--tx)' },
          body: { background: 'var(--sf)', paddingTop: 16 },
          content: { background: 'var(--sf)' },
        }}
      >
        <p className="mb-3 text-[13px] text-[var(--mu)]">{address}</p>
        <MapEmbed name={name} lat={extras.lat} lng={extras.lng} />
        <a
          href={`https://www.openstreetmap.org/?mlat=${extras.lat}&mlon=${extras.lng}#map=16/${extras.lat}/${extras.lng}`}
          target="_blank"
          rel="noreferrer"
          className="mt-3 inline-block text-[13px] font-semibold text-[var(--pr)] hover:underline"
        >
          Open in OpenStreetMap
        </a>
      </Modal>
    </>
  )
}

export function HubStatusBanner({
  status,
  lastSync,
}: {
  status: 'ONLINE' | 'OFFLINE' | 'MAINTENANCE' | 'CLOSED'
  lastSync: string
}) {
  if (status === 'ONLINE') return null
  const isOffline = status === 'OFFLINE' || status === 'CLOSED'
  return (
    <div
      className={`rounded-[12px] border px-4 py-3 text-[13.5px] ${
        isOffline
          ? 'border-[#C0392B]/35 bg-[var(--tr)] text-[#C0392B]'
          : 'border-[#C47D0E]/35 bg-[var(--ta)] text-[#C47D0E]'
      }`}
    >
      <span className="font-bold">
        {status === 'CLOSED'
          ? 'Station closed'
          : isOffline
            ? 'Station offline'
            : 'Under maintenance'}
      </span>
      <span className="mx-2 opacity-60">·</span>
      <span>
        {isOffline
          ? `Last sync ${lastSync}. Operators are rerouted; bay telemetry may be stale.`
          : `Operators are rerouted. Hub operators can still see bay telemetry. Last sync ${lastSync}.`}
      </span>
    </div>
  )
}
