import React, { useEffect, useMemo, useState } from 'react'
import { Tick01Icon } from 'hugeicons-react'
import { formatNaira } from '../../../shared/utils/currency'
import { OperatorSheet } from './OperatorSheet'
import { PLAN_CATALOG, type PlanCatalogItem } from '../planCatalog'
import { OperatorPrimaryButton } from '../../../shared/components/operator/OperatorPrimaryButton'

interface ComparePlansSheetProps {
  opened: boolean
  currentOptionId: string | null
  onClose: () => void
  onChoose: (optionId: string) => void
  /** Vehicle-aware catalog (PRD 4.4). Defaults to motorcycle. */
  catalog?: PlanCatalogItem[]
}

export const ComparePlansSheet: React.FC<ComparePlansSheetProps> = ({
  opened,
  currentOptionId,
  onClose,
  onChoose,
  catalog = PLAN_CATALOG,
}) => {
  const defaultIds = useMemo(() => {
    const ids = ['weekly', 'monthly']
    if (currentOptionId && !ids.includes(currentOptionId)) {
      return [currentOptionId, 'monthly'].slice(0, 2)
    }
    return ids
  }, [currentOptionId])

  const [selected, setSelected] = useState<string[]>(defaultIds)
  const [focusId, setFocusId] = useState<string | null>(null)

  const cols = catalog.filter((p) => selected.includes(p.id)).sort(
    (a, b) => a.rank - b.rank,
  )

  const defaultFocus = useMemo(() => {
    const preferred = [...cols]
      .reverse()
      .find((c) => c.id !== currentOptionId)
    return preferred?.id ?? cols[0]?.id ?? null
  }, [cols, currentOptionId])

  useEffect(() => {
    if (!opened) return
    setSelected(defaultIds)
  }, [opened, defaultIds])

  useEffect(() => {
    if (!opened) return
    setFocusId((prev) =>
      prev && selected.includes(prev) ? prev : defaultFocus,
    )
  }, [opened, selected, defaultFocus])

  const toggle = (id: string) => {
    setSelected((prev) => {
      if (prev.includes(id)) {
        if (prev.length <= 2) return prev
        return prev.filter((x) => x !== id)
      }
      if (prev.length >= 3) return [...prev.slice(1), id]
      return [...prev, id]
    })
  }

  const focused = cols.find((c) => c.id === focusId) ?? cols[0]
  const focusedIsCurrent = focused?.id === currentOptionId

  const rows: Array<{ label: string; value: (id: string) => string }> = [
    {
      label: 'Price',
      value: (id) => {
        const p = catalog.find((x) => x.id === id)!
        return `${formatNaira(p.priceNaira)}${p.unit}`
      },
    },
    {
      label: 'Swaps',
      value: (id) => catalog.find((x) => x.id === id)!.swapsLabel,
    },
    {
      label: 'Duration',
      value: (id) => catalog.find((x) => x.id === id)!.durationLabel,
    },
  ]

  return (
    <OperatorSheet opened={opened} title="Compare plans" onClose={onClose}>
      <p className="mb-3 text-[12px] text-[var(--kura-muted)]">
        Pick 2–3 plans to compare, then tap a column to choose one.
      </p>

      <div className="mb-4 flex flex-wrap gap-2">
        {catalog.map((p) => {
          const on = selected.includes(p.id)
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => toggle(p.id)}
              className={`rounded-lg border px-2.5 py-1.5 text-[12px] font-bold transition ${
                on
                  ? 'border-[var(--kura-teal)] bg-[var(--kura-teal)]/15 text-[var(--kura-teal-bright)]'
                  : 'border-[var(--kura-border)] text-[var(--kura-muted)]'
              }`}
            >
              {p.name}
            </button>
          )
        })}
      </div>

      <div className="overflow-x-auto rounded-xl border border-[var(--kura-border)]">
        <table className="w-full min-w-[280px] border-collapse text-left text-[12px]">
          <thead>
            <tr className="border-b border-[var(--kura-border-subtle)] bg-[var(--kura-bg-elevated)]">
              <th className="px-3 py-2.5 font-semibold text-[var(--kura-muted)]">
                Feature
              </th>
              {cols.map((c) => {
                const isFocus = c.id === focused?.id
                return (
                  <th key={c.id} className="p-0">
                    <button
                      type="button"
                      onClick={() => setFocusId(c.id)}
                      className={`w-full px-3 py-2.5 text-left font-bold transition ${
                        isFocus
                          ? 'bg-[var(--kura-teal)]/15 text-[var(--kura-teal-bright)]'
                          : 'text-[var(--kura-text)]'
                      }`}
                    >
                      {c.name}
                      {c.id === currentOptionId ? (
                        <span className="mt-0.5 block text-[10px] font-semibold opacity-80">
                          Current
                        </span>
                      ) : isFocus ? (
                        <span className="mt-0.5 block text-[10px] font-semibold opacity-80">
                          Selected
                        </span>
                      ) : (
                        <span className="mt-0.5 block text-[10px] font-medium text-[var(--kura-muted)]">
                          Tap to select
                        </span>
                      )}
                    </button>
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.label}
                className="border-b border-[var(--kura-border-subtle)]"
              >
                <td className="px-3 py-2.5 font-medium text-[var(--kura-muted)]">
                  {row.label}
                </td>
                {cols.map((c) => (
                  <td
                    key={c.id}
                    className={`px-3 py-2.5 font-semibold ${
                      c.id === focused?.id
                        ? 'bg-[var(--kura-teal)]/5 text-[var(--kura-text)]'
                        : 'text-[var(--kura-text)]'
                    }`}
                  >
                    {row.value(c.id)}
                  </td>
                ))}
              </tr>
            ))}
            <tr>
              <td className="px-3 py-2.5 font-medium text-[var(--kura-muted)]">
                Includes
              </td>
              {cols.map((c) => (
                <td
                  key={c.id}
                  className={`px-3 py-2.5 align-top ${
                    c.id === focused?.id ? 'bg-[var(--kura-teal)]/5' : ''
                  }`}
                >
                  <ul className="flex flex-col gap-1">
                    {c.highlights.map((h) => (
                      <li
                        key={h}
                        className="flex items-start gap-1 text-[11px] text-[var(--kura-text)]"
                      >
                        <Tick01Icon
                          size={12}
                          className="mt-0.5 shrink-0 text-[var(--kura-teal-bright)]"
                        />
                        {h}
                      </li>
                    ))}
                  </ul>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      {focused ? (
        <div className="mt-4">
          <OperatorPrimaryButton
            disabled={focusedIsCurrent}
            onClick={() => {
              onChoose(focused.id)
              onClose()
            }}
          >
            {focusedIsCurrent
              ? `${focused.name} is current`
              : `Choose ${focused.name}`}
          </OperatorPrimaryButton>
        </div>
      ) : null}
    </OperatorSheet>
  )
}
