import { BatteryFillIllustration } from '@shared/components/BatteryFillIllustration'
import type { BayBoardCard, BayBoardKind } from './hubBayBoardModel'

const ACCENT: Record<BayBoardKind, string> = {
  ready: '#1E8E4E',
  charging: '#E67E22',
  empty: '#93A7B0',
  reserved: '#C47D0E',
  fault: '#C0392B',
}

export function HubBayStatusCard({
  card,
  onClick,
}: {
  card: BayBoardCard
  onClick?: () => void
}) {
  const accent = ACCENT[card.kind]
  const empty = card.kind === 'empty'
  const reserved = card.kind === 'reserved'
  const pct = card.chargePct

  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex h-full min-h-[178px] w-full flex-col rounded-[12px] border p-3 text-left transition-shadow hover:shadow-[var(--sh)] ${
        reserved
          ? 'border-[#C47D0E]/45 bg-[color-mix(in_srgb,#C47D0E_6%,var(--sf))]'
          : 'border-[var(--bd)] bg-[var(--sf)]'
      } ${empty ? 'opacity-75' : ''}`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-semibold tracking-wide text-[var(--mu)]">
          BAY #{String(card.bay).padStart(2, '0')}
        </span>
        <span
          className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
          style={{
            color: reserved || empty ? accent : 'var(--tx)',
            background: reserved
              ? 'color-mix(in srgb, #C47D0E 18%, transparent)'
              : 'var(--tn)',
          }}
        >
          {card.typeTag}
        </span>
      </div>

      <div className="mt-3 flex flex-1 items-center gap-3">
        <BatteryFillIllustration pct={pct} color={accent} empty={empty} />
        <div className="min-w-0 flex-1">
          <div
            className="text-[11px] font-bold uppercase tracking-wide"
            style={{ color: empty ? 'var(--su)' : accent }}
          >
            {card.statusLabel}
          </div>
          {reserved && card.reserved ? (
            <div className="mt-2 space-y-1.5">
              <p className="truncate text-[12.5px] font-semibold text-[var(--tx)]">
                {card.sohLabel}
              </p>
              <span className="inline-block rounded-[6px] bg-[var(--ta)] px-2 py-0.5 text-[10px] font-bold text-[#C47D0E]">
                PIN {card.reserved.code}
              </span>
            </div>
          ) : (
            <div className="mt-2 space-y-1 text-[12px] text-[var(--mu)]">
              {card.sohLabel ? <div className="truncate">{card.sohLabel}</div> : null}
              {card.tempLabel ? <div className="tabular-nums">{card.tempLabel}</div> : null}
            </div>
          )}
        </div>
      </div>

      <div className="mt-3 truncate border-t border-[var(--bd)] pt-2 text-[11px] font-semibold tabular-nums text-[var(--su)]">
        {card.serial}
      </div>
    </button>
  )
}
