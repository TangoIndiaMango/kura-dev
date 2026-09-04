import dayjs from 'dayjs'
import type { DatesRangeValue } from '@mantine/dates'
import {
  getPresets,
  type DateRangePreset,
  type DateRangePresetType,
} from './date-range.constants'

export const DISPLAY_DATE_FORMAT = 'MMM D, YYYY'
export const STORAGE_DATE_FORMAT = 'YYYY-MM-DD'

export interface DateRangeInput {
  start_date?: string
  end_date?: string
}

export interface DateRangeOutput {
  start_date: string
  end_date: string
}

export function parseDateRangeInput(
  date: DateRangeInput,
  withDefault = false,
): DatesRangeValue<string> {
  if (!withDefault && (!date.start_date || !date.end_date)) {
    return [null, null]
  }

  return [
    date.start_date ? dayjs(date.start_date).format(STORAGE_DATE_FORMAT) : null,
    date.end_date ? dayjs(date.end_date).format(STORAGE_DATE_FORMAT) : null,
  ]
}

export function getDateFromRange(
  range: DatesRangeValue<string>,
  dateFormat = STORAGE_DATE_FORMAT,
): DateRangeOutput {
  const [startDate, endDate] = range

  return {
    start_date: startDate ? dayjs(startDate).format(dateFormat) : '',
    end_date: endDate ? dayjs(endDate).format(dateFormat) : '',
  }
}

export function formatDateRangeDisplay(range: DatesRangeValue<string>) {
  const [startDate, endDate] = range
  if (!startDate || !endDate) return ''

  return `${dayjs(startDate).format(DISPLAY_DATE_FORMAT)} - ${dayjs(endDate).format(DISPLAY_DATE_FORMAT)}`
}

export function datesToRangeValue(range: [Date, Date]): DatesRangeValue<string> {
  return [
    dayjs(range[0]).format(STORAGE_DATE_FORMAT),
    dayjs(range[1]).format(STORAGE_DATE_FORMAT),
  ]
}

export function findMatchingPreset(
  range: DatesRangeValue<string>,
  presets: DateRangePreset[],
) {
  const [startDate, endDate] = range
  if (!startDate || !endDate) return null

  const startTime = dayjs(startDate).startOf('day').valueOf()
  const endTime = dayjs(endDate).startOf('day').valueOf()

  return (
    presets.find((preset) => {
      const presetRange = preset.getRange()
      return (
        dayjs(presetRange[0]).startOf('day').valueOf() === startTime &&
        dayjs(presetRange[1]).startOf('day').valueOf() === endTime
      )
    })?.label ?? null
  )
}

export function getDateFromPresets(
  _range: 'all time',
  presetType: DateRangePresetType,
) {
  const presets = getPresets(presetType)
  const allTimePreset = presets[presets.length - 1]

  return getDateFromRange(datesToRangeValue(allTimePreset.getRange()))
}
