import { useEffect, useMemo, useState } from 'react'
import { Button, NumberInput, Select, Text } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import {
  DEFAULT_REVENUE_ANALYTICS_SETTINGS,
  type RevenueAnalyticsSettings,
  type RevenueArpuBasis,
} from '@shared/mock/adminMockData'
import { sharePartnersOk } from './revenueMath'

const STORAGE_KEY = 'kura.admin.revenueAnalyticsSettings'

function loadSettings(): RevenueAnalyticsSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...DEFAULT_REVENUE_ANALYTICS_SETTINGS }
    const parsed = JSON.parse(raw) as Partial<RevenueAnalyticsSettings>
    return { ...DEFAULT_REVENUE_ANALYTICS_SETTINGS, ...parsed }
  } catch {
    return { ...DEFAULT_REVENUE_ANALYTICS_SETTINGS }
  }
}

function persistSettings(next: RevenueAnalyticsSettings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
}

export function useRevenueAnalyticsSettings() {
  const [settings, setSettings] = useState<RevenueAnalyticsSettings>(loadSettings)
  const [draft, setDraft] = useState<RevenueAnalyticsSettings>(loadSettings)

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY) return
      const next = loadSettings()
      setSettings(next)
      setDraft(next)
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const dirty = useMemo(
    () => JSON.stringify(draft) !== JSON.stringify(settings),
    [draft, settings],
  )
  const partnersOk = sharePartnersOk(draft)

  const save = () => {
    if (!partnersOk) {
      notifications.show({
        color: 'red',
        title: 'Partner shares must total 100%',
        message: `Latila ${draft.latilaSharePct}% + Emicraft ${draft.emicraftSharePct}% = ${draft.latilaSharePct + draft.emicraftSharePct}%.`,
      })
      return
    }
    if (draft.vatPct < 0 || draft.vatPct > 100) {
      notifications.show({
        color: 'red',
        title: 'VAT must be between 0 and 100%',
        message: 'Default VAT is 7.5%.',
      })
      return
    }
    if (draft.ltvHorizonMonths < 1) {
      notifications.show({
        color: 'red',
        title: 'LTV horizon must be at least 1 month',
        message: 'Adjust the horizon before saving.',
      })
      return
    }
    persistSettings(draft)
    setSettings(draft)
    notifications.show({
      color: 'teal',
      title: 'Revenue analytics settings saved',
      message: 'KPIs, LTV, and share split now use these assumptions.',
    })
  }

  const reset = () => setDraft({ ...settings })

  const restoreDefaults = () => {
    setDraft({ ...DEFAULT_REVENUE_ANALYTICS_SETTINGS })
  }

  return { settings, draft, setDraft, dirty, partnersOk, save, reset, restoreDefaults }
}

export function RevenueSettingsTab({
  draft,
  setDraft,
  dirty,
  partnersOk,
  onSave,
  onReset,
  onRestoreDefaults,
}: {
  draft: RevenueAnalyticsSettings
  setDraft: (next: RevenueAnalyticsSettings) => void
  dirty: boolean
  partnersOk: boolean
  onSave: () => void
  onReset: () => void
  onRestoreDefaults: () => void
}) {
  const patch = (partial: Partial<RevenueAnalyticsSettings>) =>
    setDraft({ ...draft, ...partial })

  return (
    <div className="flex flex-col gap-5 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="max-w-xl">
          <h3 className="text-[15px] font-bold text-[var(--tx)]">
            Analytics assumptions
          </h3>
          <p className="mt-0.5 text-[12px] text-[var(--mu)]">
            Partner split defaults to 60/40. VAT, LTV horizon, and alert
            thresholds can be tuned here without a deploy. Changes apply
            instantly to KPIs and the Share tab.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Text
            size="xs"
            fw={700}
            c={partnersOk ? 'teal' : 'red'}
            className="tabular-nums"
          >
            Partners {draft.latilaSharePct + draft.emicraftSharePct}%
          </Text>
          <Button variant="default" size="xs" onClick={onRestoreDefaults}>
            Restore defaults
          </Button>
          <Button variant="default" size="xs" disabled={!dirty} onClick={onReset}>
            Reset
          </Button>
          <Button size="xs" disabled={!dirty} onClick={onSave}>
            Save
          </Button>
        </div>
      </div>

      <section className="rounded-[12px] border border-[var(--bd)] p-4">
        <h4 className="text-[13px] font-bold text-[var(--tx)]">
          Revenue share
        </h4>
        <p className="mt-0.5 mb-3 text-[12px] text-[var(--mu)]">
          Applies only to shareable platform transaction revenue — subscriptions,
          pay-per-swap, and credit margins. Data licensing and partner commissions
          stay excluded.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <NumberInput
            label="Latila share"
            suffix="%"
            min={0}
            max={100}
            decimalScale={1}
            value={draft.latilaSharePct}
            onChange={(v) =>
              patch({ latilaSharePct: typeof v === 'number' ? v : 0 })
            }
          />
          <NumberInput
            label="Emicraft share"
            suffix="%"
            min={0}
            max={100}
            decimalScale={1}
            value={draft.emicraftSharePct}
            onChange={(v) =>
              patch({ emicraftSharePct: typeof v === 'number' ? v : 0 })
            }
          />
        </div>
        {!partnersOk ? (
          <p className="mt-2 text-[12px] font-semibold text-[var(--danger,#E74C3C)]">
            Shares must total exactly 100% before save.
          </p>
        ) : null}
      </section>

      <section className="rounded-[12px] border border-[var(--bd)] p-4">
        <h4 className="text-[13px] font-bold text-[var(--tx)]">Unit economics</h4>
        <p className="mt-0.5 mb-3 text-[12px] text-[var(--mu)]">
          ARPU is Average Revenue Per Operator — never total gross ÷ headcount.
          LTV = ARPU × horizon months × retention factor. VAT here is analytics
          rollup only; receipts stay itemised.
        </p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Select
            label="ARPU basis"
            data={[
              { value: 'mrr', label: 'MRR only (default)' },
              { value: 'energy', label: 'Energy (plans + PPS)' },
            ]}
            value={draft.arpuBasis}
            onChange={(v) =>
              patch({ arpuBasis: (v as RevenueArpuBasis) || 'mrr' })
            }
          />
          <NumberInput
            label="VAT rate"
            suffix="%"
            min={0}
            max={100}
            decimalScale={1}
            value={draft.vatPct}
            onChange={(v) => patch({ vatPct: typeof v === 'number' ? v : 0 })}
          />
          <NumberInput
            label="LTV horizon"
            suffix=" mo"
            min={1}
            max={60}
            allowDecimal={false}
            value={draft.ltvHorizonMonths}
            onChange={(v) =>
              patch({ ltvHorizonMonths: typeof v === 'number' ? v : 1 })
            }
          />
          <NumberInput
            label="LTV retention factor"
            suffix="%"
            min={0}
            max={100}
            decimalScale={1}
            value={draft.ltvRetentionFactorPct}
            onChange={(v) =>
              patch({
                ltvRetentionFactorPct: typeof v === 'number' ? v : 0,
              })
            }
          />
        </div>
      </section>

      <section className="rounded-[12px] border border-[var(--bd)] p-4">
        <h4 className="text-[13px] font-bold text-[var(--tx)]">Health thresholds</h4>
        <p className="mt-0.5 mb-3 text-[12px] text-[var(--mu)]">
          KPI tones flip when churn rises above the warn level or renewal falls
          below target — so the Overview reads as a control surface, not a static
          report.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <NumberInput
            label="Churn warning (≥)"
            suffix="%"
            min={0}
            max={100}
            decimalScale={1}
            value={draft.churnWarnPct}
            onChange={(v) =>
              patch({ churnWarnPct: typeof v === 'number' ? v : 0 })
            }
          />
          <NumberInput
            label="Renewal target (≥)"
            suffix="%"
            min={0}
            max={100}
            decimalScale={1}
            value={draft.renewalTargetPct}
            onChange={(v) =>
              patch({ renewalTargetPct: typeof v === 'number' ? v : 0 })
            }
          />
        </div>
      </section>
    </div>
  )
}
