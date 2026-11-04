import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  Alert,
  Button,
  Checkbox,
  Menu,
  SegmentedControl,
  Select,
  Skeleton,
  TextInput,
  Title,
  useMantineColorScheme,
} from '@mantine/core'
import { DatePickerInput } from '@mantine/dates'
import { useDebouncedValue } from '@mantine/hooks'
import { notifications } from '@mantine/notifications'
import dayjs from 'dayjs'
import { FilterIcon, Search01Icon } from 'hugeicons-react'
import { apiErrorMessage } from '@lib/api/auth'
import {
  FormFooterActions,
  IllustratedFormModal,
  SidebarFormLayout,
} from '@shared/components'
import { illustrationSrc } from '@shared/illustrations/catalog'
import { downloadExportFromApi } from '@shared/utils/downloadCsvFromApi'
import { useHubs } from '../hubs/hooks/use-hubs'
import { useCooperatives } from '../operators/hooks/use-cooperatives'
import {
  downloadEndpoint,
  useCreateExport,
  useDatasets,
  usePreview,
  type BuildRequest,
  type Dataset,
  type FieldType,
} from './api'
import { DATE_PRESETS, type DateRange } from './datePresets'
import { naira, rangeLabel, words } from './format'

const STEPS = [
  { label: 'Choose dataset' },
  { label: 'Choose fields' },
  { label: 'Set date range' },
  { label: 'Preview and generate' },
]

const TYPE_WORD: Record<FieldType, string> = {
  text: 'text',
  number: 'number',
  money: 'naira',
  datetime: 'date',
}

function cell(type: FieldType, v: string | number | null) {
  if (v == null || v === '') return '—'
  if (type === 'money') return naira(Number(v))
  if (type === 'datetime') return dayjs(String(v)).format('D MMM YYYY, HH:mm')
  if (type === 'number') return Number(v).toLocaleString('en-NG')
  return String(v)
}

function ymd(v: string | Date | null): string {
  if (!v) return ''
  return typeof v === 'string' ? v.slice(0, 10) : dayjs(v).format('YYYY-MM-DD')
}

/** Choose a module, its fields and dates, preview, then download. */
export function ReportBuilder({ datasetCode }: { datasetCode: string }) {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const { colorScheme } = useMantineColorScheme()
  const theme = colorScheme === 'dark' ? 'dark' : 'light'
  const datasets = useDatasets()
  const [code, setCode] = useState(datasetCode)
  const ds: Dataset | undefined = datasets.data?.find((d) => d.code === code)

  const [step, setStep] = useState(0)
  const [fields, setFields] = useState<string[]>([])
  // Drill-downs from the summary arrive with dates and filters already set.
  const linked = params.get('start_date') && params.get('end_date')
  const [range, setRange] = useState<DateRange | null>(
    linked ? { start_date: params.get('start_date')!, end_date: params.get('end_date')! } : null,
  )
  const [presetId, setPresetId] = useState<string | null>(linked ? 'custom' : null)
  const [customOpen, setCustomOpen] = useState(false)
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')
  const [filters, setFilters] = useState<Record<string, string>>(() => {
    const out: Record<string, string> = {}
    for (const k of ['hub', 'cooperative', 'status', 'purpose', 'channel']) {
      const v = params.get(k)
      if (v) out[k] = v
    }
    return out
  })
  const [search, setSearch] = useState('')
  const [debouncedSearch] = useDebouncedValue(search, 400)
  const [page, setPage] = useState(1)
  const [hidden, setHidden] = useState<string[]>([])
  const [format, setFormat] = useState<'csv' | 'pdf'>('csv')

  // Every field starts picked; a new dataset resets the picks and filters
  // that do not belong to it.
  useEffect(() => {
    if (!ds) return
    setFields(ds.fields.map((f) => f.key))
    setHidden([])
    setFilters((cur) =>
      Object.fromEntries(Object.entries(cur).filter(([k]) => ds.filters.some((f) => f.key === k))),
    )
    // Only a different dataset resets; refetches of the same one keep the picks.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ds?.code])

  const groups = useMemo(() => {
    const out = new Map<string, Dataset['fields']>()
    for (const f of ds?.fields ?? []) {
      out.set(f.group, [...(out.get(f.group) ?? []), f])
    }
    return [...out.entries()]
  }, [ds])

  const shown = fields.filter((k) => !hidden.includes(k))
  const request: BuildRequest | null =
    ds && range && shown.length
      ? {
          dataset: ds.code,
          fields: shown,
          start_date: range.start_date,
          end_date: range.end_date,
          filters,
          search: debouncedSearch,
          page,
        }
      : null
  const preview = usePreview(step === 3 ? request : null)
  const create = useCreateExport()
  const hubs = useHubs({ page_size: 100 }, { enabled: Boolean(ds?.filters.some((f) => f.kind === 'hub')) })
  const coops = useCooperatives({ enabled: Boolean(ds?.filters.some((f) => f.kind === 'cooperative')) })

  const canContinue =
    (step === 0 && Boolean(ds)) || (step === 1 && fields.length > 0) || (step === 2 && Boolean(range))

  const download = async () => {
    if (!request) return
    try {
      const { page: _page, ...rest } = request
      const job = await create.mutateAsync({ kind: 'DATASET', params: { ...rest, format } })
      if (job.status !== 'READY') {
        throw new Error(job.raw.error || 'The export did not finish.')
      }
      await downloadExportFromApi(downloadEndpoint(job), job.raw.filename ?? `kura-${request.dataset}.${format}`)
      notifications.show({ color: 'teal', message: 'Report downloaded. It stays in History for 24 hours.' })
    } catch (err) {
      notifications.show({ color: 'red', message: apiErrorMessage(err, 'Could not build the report') })
    }
  }

  const activeFilters = Object.values(filters).filter(Boolean).length

  return (
    <>
      <SidebarFormLayout
        sidebarTitle="Build report"
        sidebarDescription="Pick a module, the fields you want, the dates, then preview and download."
        steps={STEPS}
        activeStep={step}
        onStepChange={(i) => {
          if (i < step) setStep(i)
        }}
        onClose={() => navigate('/reports?tab=explore')}
        contentWidth={step === 3 ? 1100 : 800}
        footer={
          <FormFooterActions
            onBack={() => (step === 0 ? navigate('/reports?tab=explore') : setStep(step - 1))}
            submitType="button"
            submitLabel={step === 3 ? 'Download report' : 'Continue'}
            disabled={step === 3 ? !request || create.isPending : !canContinue}
            loading={create.isPending}
            onSubmitClick={() => (step === 3 ? download() : setStep(step + 1))}
          />
        }
      >
        <div>
          <p className="text-[13px] text-[var(--mu)]">{step + 1}/4 Build report</p>
          <Title order={3} className="text-[var(--tx)]">
            {STEPS[step].label}
          </Title>
        </div>

        {datasets.isPending ? (
          <Skeleton height={240} />
        ) : !datasets.data?.length ? (
          <Alert color="yellow">You do not have access to any module exports.</Alert>
        ) : null}

        {step === 0 && datasets.data ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {datasets.data.map((d) => (
              <button
                type="button"
                key={d.code}
                onClick={() => setCode(d.code)}
                className={`rounded-[12px] border p-4 text-left transition-colors ${
                  d.code === code
                    ? 'border-[var(--pr)] bg-[var(--prs)]'
                    : 'border-[var(--bd)] bg-[var(--sf)] hover:bg-[var(--hv)]'
                }`}
              >
                <div className="text-[15px] font-bold text-[var(--tx)]">{d.label}</div>
                <div className="mt-1 text-[12.5px] leading-relaxed text-[var(--mu)]">{d.description}</div>
              </button>
            ))}
          </div>
        ) : null}

        {step === 1 && ds ? (
          <div className="flex flex-col gap-5">
            <div className="flex items-center justify-between rounded-[12px] border border-[var(--bd)] bg-[var(--in)] px-4 py-3">
              <div>
                <div className="text-[14px] font-semibold text-[var(--tx)]">Available fields</div>
                <div className="text-[12px] text-[var(--mu)]">
                  {fields.length} of {ds.fields.length} picked
                </div>
              </div>
              <Checkbox
                label="Select all"
                checked={fields.length === ds.fields.length}
                indeterminate={fields.length > 0 && fields.length < ds.fields.length}
                onChange={(e) => setFields(e.currentTarget.checked ? ds.fields.map((f) => f.key) : [])}
              />
            </div>
            {groups.map(([group, list]) => (
              <div key={group}>
                <div className="mb-2 text-[11.5px] font-bold tracking-[0.08em] text-[var(--mu)]">
                  {group.toUpperCase()}
                </div>
                <div className="grid gap-2.5 sm:grid-cols-2">
                  {list.map((f) => (
                    <label
                      key={f.key}
                      className="flex cursor-pointer items-center justify-between gap-3 rounded-[10px] border border-[var(--bd)] bg-[var(--sf)] px-3.5 py-3 hover:bg-[var(--hv)]"
                    >
                      <span className="flex items-center gap-3">
                        <Checkbox
                          checked={fields.includes(f.key)}
                          onChange={(e) => {
                            const on = e.currentTarget.checked
                            // Keep the dataset's column order whatever the click order.
                            setFields(
                              ds.fields
                                .map((x) => x.key)
                                .filter((k) => (k === f.key ? on : fields.includes(k))),
                            )
                          }}
                        />
                        <span className="text-[13.5px] text-[var(--tx)]">{f.label}</span>
                      </span>
                      <span className="text-[12px] text-[var(--su)]">{TYPE_WORD[f.type]}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : null}

        {step === 2 && ds ? (
          <div className="flex flex-col gap-3">
            <div className="text-[11.5px] font-bold tracking-[0.08em] text-[var(--mu)]">
              {ds.date_label.toUpperCase()} BETWEEN
            </div>
            <div className="grid gap-2.5 sm:grid-cols-2">
              {DATE_PRESETS.map((p) => (
                <button
                  type="button"
                  key={p.id}
                  onClick={() => {
                    setPresetId(p.id)
                    setRange(p.range())
                    setPage(1)
                  }}
                  className={`rounded-[10px] border px-4 py-3.5 text-[14px] ${
                    presetId === p.id
                      ? 'border-[var(--pr)] bg-[var(--prs)] font-semibold text-[var(--tx)]'
                      : 'border-[var(--bd)] bg-[var(--sf)] text-[var(--tx)] hover:bg-[var(--hv)]'
                  }`}
                >
                  {p.label}
                </button>
              ))}
              <button
                type="button"
                onClick={() => {
                  setCustomFrom(range?.start_date ?? '')
                  setCustomTo(range?.end_date ?? '')
                  setCustomOpen(true)
                }}
                className={`rounded-[10px] border px-4 py-3.5 text-[14px] ${
                  presetId === 'custom'
                    ? 'border-[var(--pr)] bg-[var(--prs)] font-semibold text-[var(--tx)]'
                    : 'border-[var(--bd)] bg-[var(--sf)] text-[var(--tx)] hover:bg-[var(--hv)]'
                }`}
              >
                {presetId === 'custom' && range ? `Custom date (${rangeLabel(range)})` : 'Custom date'}
              </button>
            </div>
          </div>
        ) : null}

        {step === 3 && ds && range ? (
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-2.5">
              <div className="text-[13px] text-[var(--mu)]">
                {ds.label} · {rangeLabel(range)}
                {preview.data?.count != null ? ` · ${preview.data.count.toLocaleString('en-NG')} rows` : ''}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <TextInput
                  aria-label="Search"
                  leftSection={<Search01Icon size={15} />}
                  placeholder="Search"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.currentTarget.value)
                    setPage(1)
                  }}
                  w={220}
                />
                {ds.filters.length ? (
                  <Menu position="bottom-end" closeOnItemClick={false} width={280}>
                    <Menu.Target>
                      <Button variant="default" leftSection={<FilterIcon size={15} />}>
                        Filter{activeFilters ? ` · ${activeFilters}` : ''}
                      </Button>
                    </Menu.Target>
                    <Menu.Dropdown p="sm">
                      <div className="flex flex-col gap-2.5">
                        {ds.filters.map((f) => {
                          const data =
                            f.kind === 'hub'
                              ? hubs.hubs.map((h) => ({ value: h.id, label: h.name }))
                              : f.kind === 'cooperative'
                                ? coops.options
                                : (f.choices ?? []).map((c) => ({ value: c, label: words(c) }))
                          return (
                            <Select
                              key={f.key}
                              label={f.label}
                              placeholder="Any"
                              clearable
                              searchable
                              comboboxProps={{ withinPortal: false }}
                              data={data}
                              value={filters[f.key] ?? null}
                              onChange={(v) => {
                                setFilters((cur) => {
                                  const next = { ...cur }
                                  if (v) next[f.key] = v
                                  else delete next[f.key]
                                  return next
                                })
                                setPage(1)
                              }}
                            />
                          )
                        })}
                      </div>
                    </Menu.Dropdown>
                  </Menu>
                ) : null}
                <Menu position="bottom-end" closeOnItemClick={false} width={240}>
                  <Menu.Target>
                    <Button variant="default">Table data</Button>
                  </Menu.Target>
                  <Menu.Dropdown p="sm">
                    <div className="flex max-h-[320px] flex-col gap-2 overflow-y-auto">
                      {ds.fields
                        .filter((f) => fields.includes(f.key))
                        .map((f) => (
                          <Checkbox
                            key={f.key}
                            label={f.label}
                            checked={!hidden.includes(f.key)}
                            disabled={!hidden.includes(f.key) && shown.length === 1}
                            onChange={(e) => {
                              const on = e.currentTarget.checked
                              setHidden((h) => (on ? h.filter((k) => k !== f.key) : [...h, f.key]))
                            }}
                          />
                        ))}
                    </div>
                  </Menu.Dropdown>
                </Menu>
                <SegmentedControl
                  aria-label="Download as"
                  value={format}
                  onChange={(v) => setFormat(v as 'csv' | 'pdf')}
                  data={[
                    { value: 'csv', label: 'CSV' },
                    { value: 'pdf', label: 'PDF' },
                  ]}
                />
              </div>
            </div>
            {preview.isError ? (
              <Alert color="red">{apiErrorMessage(preview.error, 'Preview failed')}</Alert>
            ) : null}
            <div className="overflow-x-auto rounded-[12px] border border-[var(--bd)]">
              <table className="w-full min-w-[640px] border-collapse text-[13px]">
                <thead>
                  <tr className="bg-[var(--in)] text-left text-[12px] text-[var(--mu)]">
                    {(preview.data?.columns ?? []).map((c) => (
                      <th key={c.key} scope="col" className="whitespace-nowrap px-3.5 py-2.5 font-semibold">
                        {c.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {preview.isPending
                    ? Array.from({ length: 6 }, (_, i) => (
                        <tr key={i}>
                          <td className="px-3.5 py-2" colSpan={shown.length}>
                            <Skeleton height={14} />
                          </td>
                        </tr>
                      ))
                    : (preview.data?.rows ?? []).map((row, i) => (
                        <tr key={i} className="border-t border-[var(--bd)]">
                          {row.map((v, j) => (
                            <td key={j} className="whitespace-nowrap px-3.5 py-2.5 text-[var(--tx)]">
                              {cell(preview.data!.columns[j].type, v)}
                            </td>
                          ))}
                        </tr>
                      ))}
                  {preview.data && preview.data.rows.length === 0 ? (
                    <tr>
                      <td colSpan={shown.length} className="px-3.5 py-10 text-center text-[var(--mu)]">
                        Nothing matches these dates and filters.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between text-[12px] text-[var(--mu)]">
              <span>
                Page {page}
                {preview.data?.count != null
                  ? ` of ${Math.max(1, Math.ceil(preview.data.count / preview.data.page_size))}`
                  : ''}
                {format === 'pdf' ? ' · PDF holds the first 2,000 rows' : ' · CSV holds up to 100,000 rows'}
              </span>
              <span className="flex gap-2">
                <Button size="xs" variant="default" disabled={page === 1} onClick={() => setPage(page - 1)}>
                  Previous
                </Button>
                <Button
                  size="xs"
                  variant="default"
                  disabled={!preview.data?.has_more}
                  onClick={() => setPage(page + 1)}
                >
                  Next
                </Button>
              </span>
            </div>
          </div>
        ) : null}
      </SidebarFormLayout>

      <IllustratedFormModal
        opened={customOpen}
        onClose={() => setCustomOpen(false)}
        illustration={illustrationSrc('scheduled', theme)}
        title="Custom date"
        description="Pick the first and last day to include."
      >
        <DatePickerInput
          w="100%"
          label="Start date"
          placeholder="DD/MM/YYYY"
          valueFormat="DD/MM/YYYY"
          required
          maxDate={new Date()}
          value={customFrom || null}
          onChange={(v) => setCustomFrom(ymd(v))}
        />
        <DatePickerInput
          w="100%"
          label="End date"
          placeholder="DD/MM/YYYY"
          valueFormat="DD/MM/YYYY"
          required
          minDate={customFrom ? dayjs(customFrom).toDate() : undefined}
          maxDate={new Date()}
          value={customTo || null}
          onChange={(v) => setCustomTo(ymd(v))}
        />
        <Button
          fullWidth
          color="brand"
          disabled={!customFrom || !customTo || customTo < customFrom}
          onClick={() => {
            setRange({ start_date: customFrom, end_date: customTo })
            setPresetId('custom')
            setPage(1)
            setCustomOpen(false)
          }}
        >
          Set date
        </Button>
      </IllustratedFormModal>
    </>
  )
}
