import React, { useMemo } from 'react'
import { formatNaira } from '../../../shared/utils/currency'
import {
  changeKindLabel,
  getChangeKind,
  type PlanCatalogItem,
  type PlanChangeKind,
} from '../planCatalog'

interface PlanOptionsListProps {
  options: PlanCatalogItem[]
  currentOptionId: string | null
  status?: 'Active' | 'Expiring' | 'Expired'
  onSelect: (id: string, kind: PlanChangeKind) => void
}

export const PlanOptionsList: React.FC<PlanOptionsListProps> = ({
  options,
  currentOptionId,
  status,
  onSelect,
}) => {
  const rows = useMemo(() => {
    return options
      .map((opt) => ({
        opt,
        kind: getChangeKind({
          currentOptionId,
          targetOptionId: opt.id,
          status,
        }),
      }))
      .filter(({ kind }) => kind !== 'current')
  }, [options, currentOptionId, status])

  const onPps =
    !currentOptionId || currentOptionId === 'pps'
  const title = onPps ? 'Upgrade coverage' : 'Change plan'

  if (rows.length === 0) return null

  return (
    <section className="flex flex-col gap-2.5">
      <h3 className="px-0.5 text-[13px] font-bold text-[var(--kura-muted)]">
        {title}
      </h3>
      <div className="flex flex-col gap-2">
        {rows.map(({ opt, kind }) => (
          <button
            key={opt.id}
            type="button"
            onClick={() => onSelect(opt.id, kind)}
            className="flex items-center justify-between rounded-xl border border-[var(--kura-border)] bg-[var(--kura-bg-elevated)] px-4 py-3.5 text-left transition active:scale-[0.99]"
          >
            <span className="flex min-w-0 flex-col gap-0.5">
              <span className="flex flex-wrap items-center gap-2">
                <span className="text-[14px] font-bold text-[var(--kura-text)]">
                  {opt.name}
                </span>
                <span
                  className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                    kind === 'upgrade' || kind === 'subscribe'
                      ? 'bg-[var(--kura-teal)]/15 text-[var(--kura-teal-bright)]'
                      : kind === 'downgrade'
                        ? 'bg-[var(--kura-amber)]/15 text-[var(--kura-amber)]'
                        : 'bg-[var(--kura-amber)]/15 text-[var(--kura-amber)]'
                  }`}
                >
                  {changeKindLabel(kind)}
                </span>
              </span>
              <span className="text-[12px] text-[var(--kura-muted)]">
                {opt.detail}
              </span>
            </span>
            <span className="shrink-0 text-[14px] font-bold text-[var(--kura-text)]">
              {formatNaira(opt.priceNaira)}
              <span className="text-[11px] font-medium text-[var(--kura-muted)]">
                {opt.unit}
              </span>
            </span>
          </button>
        ))}
      </div>
    </section>
  )
}
