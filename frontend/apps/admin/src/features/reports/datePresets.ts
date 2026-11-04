import dayjs, { type Dayjs } from 'dayjs'

export type DateRange = { start_date: string; end_date: string }

export type DatePreset = { id: string; label: string; range: () => DateRange }

const ymd = (d: Dayjs) => d.format('YYYY-MM-DD')
const span = (from: Dayjs, to: Dayjs): DateRange => ({ start_date: ymd(from), end_date: ymd(to) })
const today = () => dayjs()
const lastDays = (n: number) => () => span(today().subtract(n - 1, 'day'), today())
const lastMonths = (n: number) => () => span(today().subtract(n, 'month').add(1, 'day'), today())

function lastQuarter(): DateRange {
  const thisQuarterStart = today().month(Math.floor(today().month() / 3) * 3).startOf('month')
  const start = thisQuarterStart.subtract(3, 'month')
  return span(start, thisQuarterStart.subtract(1, 'day'))
}

/** Builder date presets; every one is a whole Lagos-day range. */
export const DATE_PRESETS: DatePreset[] = [
  { id: 'today', label: 'Today', range: () => span(today(), today()) },
  { id: 'yesterday', label: 'Yesterday', range: () => span(today().subtract(1, 'day'), today().subtract(1, 'day')) },
  { id: 'last3', label: 'Last 3 days', range: lastDays(3) },
  { id: 'last7', label: 'Last 7 days', range: lastDays(7) },
  { id: 'last14', label: 'Last 14 days', range: lastDays(14) },
  { id: 'last30', label: 'Last 30 days', range: lastDays(30) },
  { id: 'thisMonth', label: 'This month', range: () => span(today().startOf('month'), today()) },
  {
    id: 'lastMonth',
    label: 'Last month',
    range: () => span(today().subtract(1, 'month').startOf('month'), today().subtract(1, 'month').endOf('month')),
  },
  { id: 'lastQuarter', label: 'Last quarter', range: lastQuarter },
  { id: 'last3m', label: 'Last 3 months', range: lastMonths(3) },
  { id: 'last6m', label: 'Last 6 months', range: lastMonths(6) },
  { id: 'last12m', label: 'Last 12 months', range: lastMonths(12) },
  { id: 'thisYear', label: 'This year', range: () => span(today().startOf('year'), today()) },
  {
    id: 'lastYear',
    label: 'Last year',
    range: () => span(today().subtract(1, 'year').startOf('year'), today().subtract(1, 'year').endOf('year')),
  },
  { id: 'all', label: 'All time', range: () => span(dayjs('2020-01-01'), today()) },
]
