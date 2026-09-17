import dayjs from 'dayjs'

export type DateRangePresetType = 'range' | 'years'

export interface DateRangePreset {
  label: string
  getRange: () => [Date, Date]
}

export const DATE_RANGE_PRESETS: DateRangePreset[] = [
  {
    label: 'Today',
    getRange: () => {
      const today = dayjs()
      return [today.toDate(), today.toDate()]
    },
  },
  {
    label: 'Yesterday',
    getRange: () => {
      const yesterday = dayjs().subtract(1, 'day')
      return [yesterday.toDate(), yesterday.toDate()]
    },
  },
  {
    label: 'This Week',
    getRange: () => {
      const start = dayjs().startOf('week')
      const end = dayjs()
      return [start.toDate(), end.toDate()]
    },
  },
  {
    label: 'Last Week',
    getRange: () => {
      const start = dayjs().subtract(1, 'week').startOf('week')
      const end = dayjs().subtract(1, 'week').endOf('week')
      return [start.toDate(), end.toDate()]
    },
  },
  {
    label: 'This Month',
    getRange: () => {
      const start = dayjs().startOf('month')
      const end = dayjs().endOf('month')
      return [start.toDate(), end.toDate()]
    },
  },
  {
    label: 'Last Month',
    getRange: () => {
      const start = dayjs().subtract(1, 'month').startOf('month')
      const end = dayjs().subtract(1, 'month').endOf('month')
      return [start.toDate(), end.toDate()]
    },
  },
  {
    label: 'This Year',
    getRange: () => {
      const start = dayjs().startOf('year')
      const end = dayjs()
      return [start.toDate(), end.toDate()]
    },
  },
  {
    label: 'Last Year',
    getRange: () => {
      const start = dayjs().subtract(1, 'year').startOf('year')
      const end = dayjs().subtract(1, 'year').endOf('year')
      return [start.toDate(), end.toDate()]
    },
  },
  {
    label: 'All time',
    getRange: () => [new Date(2000, 0, 1), new Date()],
  },
]

export const YEAR_RANGE_PRESETS: DateRangePreset[] = [
  {
    label: 'This Year',
    getRange: () => {
      const start = dayjs().startOf('year')
      const end = dayjs()
      return [start.toDate(), end.toDate()]
    },
  },
  {
    label: 'Last Year',
    getRange: () => {
      const start = dayjs().subtract(1, 'year').startOf('year')
      const end = dayjs().subtract(1, 'year').endOf('year')
      return [start.toDate(), end.toDate()]
    },
  },
  {
    label: 'Last 3 Years',
    getRange: () => {
      const start = dayjs().subtract(2, 'year').startOf('year')
      const end = dayjs()
      return [start.toDate(), end.toDate()]
    },
  },
  {
    label: 'Last 5 Years',
    getRange: () => {
      const start = dayjs().subtract(4, 'year').startOf('year')
      const end = dayjs()
      return [start.toDate(), end.toDate()]
    },
  },
  {
    label: 'Last 10 Years',
    getRange: () => {
      const start = dayjs().subtract(9, 'year').startOf('year')
      const end = dayjs()
      return [start.toDate(), end.toDate()]
    },
  },
  {
    label: 'All Time',
    getRange: () => [new Date(2000, 0, 1), new Date()],
  },
]

export function getPresets(presetType: DateRangePresetType = 'range') {
  return presetType === 'years' ? YEAR_RANGE_PRESETS : DATE_RANGE_PRESETS
}
