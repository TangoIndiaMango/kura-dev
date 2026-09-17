import React, { useMemo, useState } from 'react'
import {
  ArrowLeft01Icon,
  InformationCircleIcon,
} from 'hugeicons-react'
import { HubMap } from '../../../shared/maps/HubMap'

export interface SwapHub {
  id: string
  name: string
  distance: string
  hours: string
  ready: number
  status: 'ready' | 'low' | 'offline'
  stockLabel?: string
  lat: number
  lng: number
}

interface FindHubStepProps {
  hubs: SwapHub[]
  /** Offline / empty / wrong type — shown separately, not selectable */
  unavailableHubs?: SwapHub[]
  selectedId: string | null
  vehicleLabel: string
  userPosition: { lat: number; lng: number } | null
  onSelect: (id: string) => void
  onOpenDetail: (id: string) => void
  onBack: () => void
  loading?: boolean
}

function unavailableReason(hub: SwapHub) {
  if (hub.status === 'offline') return 'Offline'
  if (hub.ready <= 0) return 'No packs ready'
  return 'Not stocking this type'
}

export const FindHubStep: React.FC<FindHubStepProps> = ({
  hubs,
  unavailableHubs = [],
  selectedId,
  vehicleLabel,
  userPosition,
  onSelect,
  onOpenDetail,
  onBack,
  loading = false,
}) => {
  const [showUnavailable, setShowUnavailable] = useState(false)
  const nearest = hubs[0]
  const mapHubs = useMemo(
    () =>
      hubs.map((h) => ({
        id: h.id,
        name: h.name,
        lat: h.lat,
        lng: h.lng,
        status: h.status,
      })),
    [hubs],
  )

  return (
    <div className="flex flex-col gap-4">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-1 self-start text-sm text-[var(--kura-muted)]"
      >
        <ArrowLeft01Icon size={16} />
        Back
      </button>

      <div>
        <h2 className="text-lg font-bold text-[var(--kura-text)]">Find a hub</h2>
        <p className="mt-1 text-xs text-[var(--kura-muted)]">
          Step 2 of 3 · online hubs with {vehicleLabel} ready
          {!userPosition
            ? ' · enable location for nearest-first'
            : ''}
        </p>
      </div>

      {loading ? (
        <div className="flex flex-col gap-2">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-[64px] animate-pulse rounded-2xl bg-[var(--kura-border)]/40"
            />
          ))}
        </div>
      ) : null}

      {!loading ? (
      <>
      <div className="flex gap-2">
        <input
          type="search"
          placeholder="Search hubs"
          className="flex-1 rounded-xl border border-[var(--kura-border)] bg-[var(--kura-bg-elevated)] px-3 py-2.5 text-[13px] text-[var(--kura-text)] outline-none placeholder:text-[var(--kura-muted)] focus:border-[var(--kura-teal)]"
        />
        <button
          type="button"
          className="rounded-xl border border-[var(--kura-border)] bg-[var(--kura-bg-elevated)] px-3 text-[12px] font-bold text-[var(--kura-muted)]"
        >
          Nearest
        </button>
      </div>

      <div className="relative">
        <HubMap
          hubs={mapHubs}
          selectedId={selectedId}
          userPosition={userPosition}
          onSelectHub={onOpenDetail}
          showRecenter
          banner={
            hubs.length === 0
              ? `No hubs with ${vehicleLabel} ready nearby`
              : `Hubs stocking ${vehicleLabel}${
                  nearest ? ` · nearest ${nearest.distance}` : ''
                }`
          }
        />
      </div>

      {hubs.length === 0 ? (
        <p className="rounded-xl border border-dashed border-[var(--kura-border)] px-4 py-6 text-center text-[13px] text-[var(--kura-muted)]">
          No bookable hubs right now. Try another vehicle type or check again
          later.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {hubs.map((hub) => {
            const active = hub.id === selectedId
            return (
              <div
                key={hub.id}
                className={`flex items-center gap-2 rounded-xl border px-3 py-3 transition ${
                  active
                    ? 'border-[var(--kura-teal)] bg-[var(--kura-teal)]/10'
                    : 'border-[var(--kura-border)] bg-[var(--kura-bg-elevated)]'
                }`}
              >
                <button
                  type="button"
                  onClick={() => onSelect(hub.id)}
                  className="flex min-w-0 flex-1 items-start justify-between gap-3 text-left"
                >
                  <span className="flex min-w-0 flex-col gap-0.5">
                    <span className="truncate text-[14px] font-bold text-[var(--kura-text)]">
                      {hub.name}
                    </span>
                    <span className="text-[11px] text-[var(--kura-muted)]">
                      {hub.distance} · {hub.hours}
                    </span>
                  </span>
                  <span
                    className={`shrink-0 rounded-md px-2 py-1 text-[11px] font-bold ${
                      hub.status === 'low'
                        ? 'bg-[var(--kura-amber)]/15 text-[var(--kura-amber)]'
                        : 'bg-[var(--kura-green)]/15 text-[var(--kura-green)]'
                    }`}
                  >
                    {hub.stockLabel ?? `${hub.ready} ready`}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => onOpenDetail(hub.id)}
                  className="rounded-lg p-2 text-[var(--kura-muted)] hover:bg-[var(--kura-border-subtle)] hover:text-[var(--kura-text)]"
                  aria-label={`Hub details for ${hub.name}`}
                >
                  <InformationCircleIcon size={18} />
                </button>
              </div>
            )
          })}
        </div>
      )}

      {unavailableHubs.length > 0 ? (
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => setShowUnavailable((v) => !v)}
            className="self-start text-[12px] font-bold text-[var(--kura-muted)]"
          >
            {showUnavailable ? 'Hide' : 'Show'} {unavailableHubs.length}{' '}
            unavailable
            {showUnavailable ? '' : ' →'}
          </button>
          {showUnavailable
            ? unavailableHubs.map((hub) => (
                <div
                  key={hub.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-[var(--kura-border)] bg-[var(--kura-bg-elevated)] px-3 py-3 opacity-55"
                >
                  <span className="flex min-w-0 flex-col gap-0.5">
                    <span className="truncate text-[14px] font-bold text-[var(--kura-text)]">
                      {hub.name}
                    </span>
                    <span className="text-[11px] text-[var(--kura-muted)]">
                      {unavailableReason(hub)}
                      {hub.distance !== '—' ? ` · ${hub.distance}` : ''}
                    </span>
                  </span>
                  <span className="shrink-0 rounded-md bg-[var(--kura-coral)]/15 px-2 py-1 text-[11px] font-bold text-[var(--kura-coral)]">
                    {unavailableReason(hub)}
                  </span>
                </div>
              ))
            : null}
        </div>
      ) : null}
      </>
      ) : null}
    </div>
  )
}
