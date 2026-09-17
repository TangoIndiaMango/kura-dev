import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import dayjs, { type Dayjs } from 'dayjs'
import { Calendar03Icon, ArrowDown01Icon } from 'hugeicons-react'
import {
  getPresets,
  type DateRangePresetType,
} from './date-range.constants'
import {
  DISPLAY_DATE_FORMAT,
  findMatchingPreset,
  formatDateRangeDisplay,
  getDateFromRange,
  parseDateRangeInput,
  datesToRangeValue,
  type DateRangeInput,
  type DateRangeOutput,
} from './date-range.utils'

export interface DateRangePickerProps {
  date?: DateRangeInput
  onChange?: (value: DateRangeOutput) => void
  onPresetSelect?: (preset: string) => void
  format?: string
  label?: ReactNode
  placeholder?: string
  presetType?: DateRangePresetType
  selectedPreset?: string
  fullWidth?: boolean
  className?: string
  /** Optional upper bound (inclusive). Omit to allow future dates (KURA overview). */
  maxDate?: Date
}

const DOW = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'] as const

function startOfWeekMonday(d: Dayjs) {
  const day = d.day() // 0 Sun … 6 Sat
  const diff = day === 0 ? 6 : day - 1
  return d.subtract(diff, 'day').startOf('day')
}

function monthGrid(month: Dayjs) {
  const start = startOfWeekMonday(month.startOf('month'))
  return Array.from({ length: 42 }, (_, i) => start.add(i, 'day'))
}

function inRange(day: Dayjs, start: Dayjs | null, end: Dayjs | null) {
  if (!start || !end) return false
  const t = day.startOf('day').valueOf()
  const a = start.startOf('day').valueOf()
  const b = end.startOf('day').valueOf()
  return t > Math.min(a, b) && t < Math.max(a, b)
}

function isSameDay(a: Dayjs | null, b: Dayjs | null) {
  if (!a || !b) return false
  return a.startOf('day').valueOf() === b.startOf('day').valueOf()
}

/**
 * KURA Admin date range — anchored popover (not Nexus centered modal):
 * presets | dual calendars | Reset · range chips · Close · Apply
 */
export function DateRangePicker({
  date = {},
  onChange,
  onPresetSelect,
  format,
  label,
  placeholder = 'Select date',
  presetType = 'range',
  selectedPreset,
  fullWidth = false,
  className,
  maxDate,
}: DateRangePickerProps) {
  const presets = useMemo(() => getPresets(presetType), [presetType])
  const rootRef = useRef<HTMLDivElement>(null)

  const parsedDate = useMemo(
    () => parseDateRangeInput(date, false),
    [date.end_date, date.start_date],
  )

  const [opened, setOpened] = useState(false)
  const [value, setValue] = useState<[string | null, string | null]>(parsedDate)
  const [activePreset, setActivePreset] = useState<string | null>(
    selectedPreset ?? findMatchingPreset(parsedDate, presets),
  )
  const [leftMonth, setLeftMonth] = useState(() =>
    dayjs(parsedDate[0] ?? undefined).startOf('month'),
  )
  const [pickingEnd, setPickingEnd] = useState(false)

  useEffect(() => {
    setValue(parsedDate)
    setActivePreset(selectedPreset ?? findMatchingPreset(parsedDate, presets))
    if (parsedDate[0]) setLeftMonth(dayjs(parsedDate[0]).startOf('month'))
  }, [parsedDate, presets, selectedPreset])

  useEffect(() => {
    if (!opened) return
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpened(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpened(false)
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [opened])

  const hasSelection = Boolean(parsedDate[0] && parsedDate[1])
  const displayValue = hasSelection
    ? formatDateRangeDisplay(parsedDate)
    : placeholder

  const draftStart = value[0] ? dayjs(value[0]) : null
  const draftEnd = value[1] ? dayjs(value[1]) : null
  const rightMonth = leftMonth.add(1, 'month')

  const applyPreset = (preset: (typeof presets)[number]) => {
    const range = datesToRangeValue(preset.getRange())
    setValue(range)
    setActivePreset(preset.label)
    setPickingEnd(false)
    if (range[0]) setLeftMonth(dayjs(range[0]).startOf('month'))
  }

  const handleOpen = () => {
    setValue(parsedDate)
    setActivePreset(selectedPreset ?? findMatchingPreset(parsedDate, presets))
    setPickingEnd(false)
    if (parsedDate[0]) setLeftMonth(dayjs(parsedDate[0]).startOf('month'))
    setOpened(true)
  }

  const handleDayClick = (day: Dayjs) => {
    if (maxDate && day.isAfter(dayjs(maxDate), 'day')) return

    if (!pickingEnd || !draftStart) {
      setValue([day.format('YYYY-MM-DD'), null])
      setActivePreset(null)
      setPickingEnd(true)
      return
    }

    let start = draftStart
    let end = day
    if (end.isBefore(start, 'day')) {
      ;[start, end] = [end, start]
    }
    setValue([start.format('YYYY-MM-DD'), end.format('YYYY-MM-DD')])
    setActivePreset(
      findMatchingPreset(
        [start.format('YYYY-MM-DD'), end.format('YYYY-MM-DD')],
        presets,
      ),
    )
    setPickingEnd(false)
  }

  const handleReset = () => {
    const month = presets.find((p) => p.label === 'This Month')
    if (month) {
      applyPreset(month)
    } else {
      setValue([null, null])
      setActivePreset(null)
    }
    setPickingEnd(false)
  }

  const handleApply = () => {
    let final = value
    if (final[0] && !final[1]) {
      final = [final[0], final[0]]
      setValue(final)
    }
    if (!final[0] || !final[1]) return

    setOpened(false)
    onPresetSelect?.(activePreset ?? '')
    onChange?.(getDateFromRange(final, format))
  }

  const renderMonth = (month: Dayjs) => {
    const days = monthGrid(month)
    return (
      <div className="flex min-w-0 flex-1 flex-col gap-2.5">
        <div className="flex items-center justify-between rounded-[8px] bg-[var(--in)] px-2.5 py-1.5">
          <button
            type="button"
            aria-label="Previous month"
            className="px-1 text-sm text-[var(--mu)] hover:text-[var(--tx)]"
            onClick={() => setLeftMonth((m) => m.subtract(1, 'month'))}
          >
            ‹
          </button>
          <span className="text-[15px] font-bold text-[var(--tx)]">
            {month.format('MMMM YYYY')}
          </span>
          <button
            type="button"
            aria-label="Next month"
            className="px-1 text-sm text-[var(--mu)] hover:text-[var(--tx)]"
            onClick={() => setLeftMonth((m) => m.add(1, 'month'))}
          >
            ›
          </button>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center">
          {DOW.map((d) => (
            <div
              key={d}
              className="py-1 text-[11.5px] font-medium text-[var(--su)]"
            >
              {d}
            </div>
          ))}
          {days.map((day) => {
            const inMonth = day.month() === month.month()
            const isStart = isSameDay(day, draftStart)
            const isEnd = isSameDay(day, draftEnd)
            const isEdge = isStart || isEnd
            const mid = inRange(day, draftStart, draftEnd)
            const disabled =
              !inMonth || (maxDate ? day.isAfter(dayjs(maxDate), 'day') : false)

            return (
              <button
                key={day.format('YYYY-MM-DD')}
                type="button"
                disabled={disabled}
                onClick={() => handleDayClick(day)}
                style={{
                  background: !inMonth
                    ? 'transparent'
                    : isEdge
                      ? 'var(--pr)'
                      : mid
                        ? 'var(--prs)'
                        : 'var(--in)',
                  color: !inMonth
                    ? 'transparent'
                    : isEdge
                      ? '#fff'
                      : 'var(--tx)',
                  fontWeight: isEdge ? 700 : 400,
                  opacity: disabled && inMonth ? 0.35 : 1,
                }}
                className="h-[34px] cursor-pointer rounded-[6px] border-0 text-[13px] transition-colors hover:opacity-90 disabled:cursor-default"
              >
                {inMonth ? day.date() : ''}
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div
      ref={rootRef}
      className={`relative ${opened ? 'z-[999]' : 'z-20'} ${fullWidth ? 'w-full' : ''} ${className ?? ''}`}
    >
      {label ? (
        <div className="mb-1.5 text-sm font-medium text-[var(--mu)]">{label}</div>
      ) : null}

      <button
        type="button"
        onClick={() => (opened ? setOpened(false) : handleOpen())}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: fullWidth ? 'space-between' : 'flex-start',
          gap: 9,
          minHeight: 37,
          padding: '9px 13px',
          borderRadius: 8,
          backgroundColor: 'var(--in)',
          border: '1px solid var(--bd)',
          color: 'var(--tx)',
          width: fullWidth ? '100%' : 'auto',
          fontSize: 13,
          fontWeight: 500,
          cursor: 'pointer',
          fontFamily: 'inherit',
        }}
      >
        <Calendar03Icon size={15} color="var(--mu)" className="shrink-0" />
        <span className="truncate">{displayValue}</span>
        <ArrowDown01Icon size={12} color="var(--mu)" className="shrink-0" />
      </button>

      {opened ? (
        <div
          className="absolute right-0 top-[calc(100%+8px)] z-[999] flex max-h-[min(90vh,640px)] w-[min(95vw,880px)] flex-col gap-4 overflow-y-auto rounded-[14px] border border-[var(--bd)] bg-[var(--sf)] p-4 shadow-[0_30px_60px_-20px_rgba(0,0,0,0.5)] sm:flex-row sm:gap-6 sm:p-[22px]"
          role="dialog"
          aria-label="Select date range"
        >
          <div className="flex w-full shrink-0 flex-row flex-wrap gap-[2px] sm:w-[120px] sm:flex-col">
            {presets.map((preset) => {
              const isActive = activePreset === preset.label
              return (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => applyPreset(preset)}
                  style={{
                    background: isActive ? 'var(--prs)' : 'transparent',
                    color: isActive ? 'var(--pr)' : 'var(--tx)',
                    fontWeight: isActive ? 700 : 400,
                  }}
                  className="cursor-pointer whitespace-nowrap rounded-[6px] border-0 px-2.5 py-2 text-left text-[13.5px] font-sans transition-colors hover:bg-[var(--hv)]"
                >
                  {preset.label}
                </button>
              )
            })}
          </div>

          <div className="flex min-w-0 flex-1 flex-col gap-4">
            <div className="flex flex-col gap-6 md:flex-row md:gap-7">
              {renderMonth(leftMonth)}
              {renderMonth(rightMonth)}
            </div>

            <div className="flex flex-col items-center justify-between gap-2.5 border-t border-[var(--bd)] pt-3.5 sm:flex-row">
              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  onClick={handleReset}
                  className="cursor-pointer rounded-[8px] border border-[var(--bd)] bg-transparent px-3.5 py-2 text-[13px] font-bold text-[var(--tx)] transition-colors hover:bg-[var(--hv)]"
                >
                  Reset
                </button>
                <div className="rounded-[8px] border border-[var(--bd)] bg-[var(--sf)] px-3.5 py-2 text-[13px] font-bold text-[var(--tx)]">
                  {draftStart
                    ? draftStart.format(DISPLAY_DATE_FORMAT)
                    : 'Start date'}
                </div>
                <span className="font-medium text-[var(--mu)]">—</span>
                <div className="rounded-[8px] border border-[var(--bd)] bg-[var(--sf)] px-3.5 py-2 text-[13px] font-bold text-[var(--tx)]">
                  {draftEnd
                    ? draftEnd.format(DISPLAY_DATE_FORMAT)
                    : 'End date'}
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-auto">
                <button
                  type="button"
                  onClick={() => setOpened(false)}
                  className="cursor-pointer rounded-[8px] border border-[var(--bd)] bg-transparent px-3.5 py-2 text-[13px] font-bold text-[var(--tx)] transition-colors hover:bg-[var(--hv)]"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={handleApply}
                  disabled={!draftStart}
                  className="cursor-pointer rounded-[8px] border-0 bg-[var(--pr)] px-[18px] py-2 text-[13px] font-bold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Apply
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
