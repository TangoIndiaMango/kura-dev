import { parsePct } from './revenueMath'
import type { CohortRecord } from '@shared/mock/adminMockData'

function cellTone(pct: number | null): string {
  if (pct === null) return 'bg-[var(--tn)] text-[var(--mu)]'
  if (pct >= 90) return 'bg-[color-mix(in_srgb,var(--pr)_28%,transparent)] text-[var(--tx)]'
  if (pct >= 80) return 'bg-[color-mix(in_srgb,var(--pr)_18%,transparent)] text-[var(--tx)]'
  if (pct >= 70) return 'bg-[color-mix(in_srgb,#F5A623_22%,transparent)] text-[var(--tx)]'
  return 'bg-[color-mix(in_srgb,#E74C3C_18%,transparent)] text-[var(--tx)]'
}

/** Visual cohort retention matrix — clearer than three bare % columns. */
export function CohortRetentionMatrix({
  cohorts,
  onSelect,
}: {
  cohorts: CohortRecord[]
  onSelect?: (id: string) => void
}) {
  if (cohorts.length === 0) {
    return (
      <div className="rounded-[12px] border border-dashed border-[var(--bd)] px-4 py-8 text-center text-[13px] text-[var(--mu)]">
        No cohorts in this filter. Widen search or clear status filters.
      </div>
    )
  }

  return (
    <div className="kura-table-scroll min-w-0 overflow-x-auto">
      <table className="w-max min-w-full border-collapse text-left">
        <thead>
          <tr className="text-[11px] font-bold uppercase tracking-wide text-[var(--mu)]">
            <th className="px-2 py-2 font-bold">Cohort</th>
            <th className="px-2 py-2 text-center font-bold">M1</th>
            <th className="px-2 py-2 text-center font-bold">M3</th>
            <th className="px-2 py-2 text-center font-bold">M6</th>
          </tr>
        </thead>
        <tbody>
          {cohorts.map((c) => {
            const cells = [
              parsePct(c.m1),
              parsePct(c.m3),
              parsePct(c.m6),
            ]
            return (
              <tr key={c.id} className="border-t border-[var(--bd)]">
                <td className="px-2 py-2">
                  <button
                    type="button"
                    className="text-left text-[12px] font-bold text-[var(--pr)] hover:underline"
                    onClick={() => onSelect?.(c.id)}
                  >
                    {c.name}
                  </button>
                  <div className="text-[11px] text-[var(--mu)]">
                    {c.size} operators
                  </div>
                </td>
                {cells.map((pct, i) => (
                  <td key={i} className="px-1.5 py-2">
                    <div
                      className={`mx-auto flex h-9 w-full max-w-[72px] items-center justify-center rounded-md text-[12px] font-bold tabular-nums ${cellTone(pct)}`}
                    >
                      {pct === null ? '—' : `${Math.round(pct)}%`}
                    </div>
                  </td>
                ))}
              </tr>
            )
          })}
        </tbody>
      </table>
      <p className="mt-3 text-[11px] text-[var(--mu)]">
        Colour intensifies with retention. Immature cohorts show — until the
        milestone is reached (edge case: Jul/Aug M6).
      </p>
    </div>
  )
}
