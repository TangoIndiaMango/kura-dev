import React from 'react'
import { OperatorBackHeader } from '../../../shared/components/operator/OperatorBackHeader'
import { OperatorPrimaryButton } from '../../../shared/components/operator/OperatorPrimaryButton'
import { HubMap } from '../../../shared/maps/HubMap'

export interface HubDetailData {
  id: string
  name: string
  distance: string
  status: 'open' | 'offline'
  address: string
  eta: string
  hours: string
  chargingSlots: string
  agent: string
  acceptsCash: boolean
  lat: number
  lng: number
  batteries: Array<{
    label: string
    ready: number | null
    tone: 'ready' | 'low' | 'none'
  }>
}

interface HubDetailStepProps {
  hub: HubDetailData
  userPosition: { lat: number; lng: number } | null
  onBack: () => void
  onReserve: () => void
  onDirections?: () => void
}

export const HubDetailStep: React.FC<HubDetailStepProps> = ({
  hub,
  userPosition,
  onBack,
  onReserve,
  onDirections,
}) => {
  return (
    <div className="flex flex-col gap-4">
      <OperatorBackHeader
        title={hub.name}
        subtitle={`${hub.id} · ${hub.distance} · ${hub.status}`}
        onBack={onBack}
      />

      <div className="relative">
        <HubMap
          hubs={[
            {
              id: hub.id,
              name: hub.name,
              lat: hub.lat,
              lng: hub.lng,
              status: hub.status === 'offline' ? 'offline' : 'ready',
            },
          ]}
          selectedId={hub.id}
          focusHubId={hub.id}
          userPosition={userPosition}
          heightClassName="h-40"
        />
        <div className="pointer-events-none absolute bottom-3 left-3 right-3 rounded-xl border border-[var(--kura-border)] bg-[var(--kura-map-scrim)] px-3 py-2 backdrop-blur-sm">
          <p className="text-[12px] font-semibold text-[var(--kura-text)]">
            {hub.address}
          </p>
          <p className="text-[11px] text-[var(--kura-muted)]">{hub.eta}</p>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {hub.batteries.map((b) => (
          <div
            key={b.label}
            className={`min-w-[120px] rounded-xl border px-3 py-2.5 ${
              b.tone === 'ready'
                ? 'border-[var(--kura-green)]/30 bg-[var(--kura-green)]/10'
                : b.tone === 'low'
                  ? 'border-[var(--kura-amber)]/30 bg-[var(--kura-amber)]/10'
                  : 'border-[var(--kura-border)] bg-[var(--kura-bg-elevated)]'
            }`}
          >
            <p className="text-[11px] font-semibold text-[var(--kura-text)]">
              {b.label}
            </p>
            <p
              className={`mt-1 text-[11px] font-bold ${
                b.tone === 'ready'
                  ? 'text-[var(--kura-green)]'
                  : b.tone === 'low'
                    ? 'text-[var(--kura-amber)]'
                    : 'text-[var(--kura-muted)]'
              }`}
            >
              {b.ready == null ? 'not stocked' : `${b.ready} ready`}
            </p>
          </div>
        ))}
      </div>

      <div className="divide-y divide-[var(--kura-border-subtle)] rounded-2xl border border-[var(--kura-border)] bg-[var(--kura-bg-elevated)] px-4">
        <InfoRow label="Opening hours" value={hub.hours} />
        <InfoRow label="Charging slots" value={hub.chargingSlots} />
        <InfoRow label="Agent on duty" value={hub.agent} />
        <InfoRow
          label="Cash deposit"
          value={hub.acceptsCash ? 'Accepted' : 'Not accepted'}
        />
      </div>

      <div className="flex gap-2.5">
        <button
          type="button"
          onClick={onDirections}
          className="flex-1 rounded-xl border border-[var(--kura-border)] py-3.5 text-[14px] font-bold text-[var(--kura-text)]"
        >
          Directions
        </button>
        <div className="flex-[1.4]">
          <OperatorPrimaryButton onClick={onReserve}>
            Reserve here
          </OperatorPrimaryButton>
        </div>
      </div>
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 py-3">
      <span className="text-[12px] text-[var(--kura-muted)]">{label}</span>
      <span className="text-right text-[12px] font-semibold text-[var(--kura-text)]">
        {value}
      </span>
    </div>
  )
}
