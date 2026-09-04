import { useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  Box,
  Button,
  Divider,
  Group,
  Modal,
  Stack,
  Text,
  UnstyledButton,
} from '@mantine/core'
import { useMediaQuery } from '@mantine/hooks'
import { DatePicker, type DatesRangeValue } from '@mantine/dates'
import dayjs from 'dayjs'
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
  maxDate?: Date
}

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
  maxDate = new Date(),
}: DateRangePickerProps) {
  const presets = useMemo(() => getPresets(presetType), [presetType])
  const isCompact = useMediaQuery('(max-width: 1023px)')
  const maxDateValue = dayjs(maxDate).format('YYYY-MM-DD')

  const parsedDate = useMemo(
    () => parseDateRangeInput(date, false),
    [date.end_date, date.start_date],
  )

  const [value, setValue] = useState<DatesRangeValue<string>>(parsedDate)
  const [opened, setOpened] = useState(false)
  const [activePreset, setActivePreset] = useState<string | null>(
    selectedPreset ?? findMatchingPreset(parsedDate, presets),
  )
  const [calendarDate, setCalendarDate] = useState(
    parsedDate[0] ?? dayjs().format('YYYY-MM-DD'),
  )

  useEffect(() => {
    setValue(parsedDate)
    setActivePreset(
      selectedPreset ?? findMatchingPreset(parsedDate, presets),
    )
  }, [parsedDate, presets, selectedPreset])

  const [startDate, endDate] = value
  const hasSelection = Boolean(parsedDate[0] && parsedDate[1])

  const displayValue = hasSelection
    ? selectedPreset ??
      findMatchingPreset(parsedDate, presets) ??
      formatDateRangeDisplay(parsedDate)
    : placeholder

  const applyPreset = (preset: (typeof presets)[number]) => {
    const range = datesToRangeValue(preset.getRange())
    setValue(range)
    setActivePreset(preset.label)
    if (range[0]) setCalendarDate(range[0])
  }

  const handleOpenPicker = () => {
    setValue(parsedDate)
    setActivePreset(
      selectedPreset ?? findMatchingPreset(parsedDate, presets),
    )
    if (parsedDate[0]) setCalendarDate(parsedDate[0])
    setOpened(true)
  }

  const handleCancel = () => {
    setOpened(false)
  }

  const handleApply = () => {
    let finalValue = value

    if (finalValue[0] && !finalValue[1]) {
      finalValue = [finalValue[0], finalValue[0]]
      setValue(finalValue)
    }

    setOpened(false)

    if (activePreset && onPresetSelect) {
      onPresetSelect(activePreset)
      return
    }

    if (onChange && finalValue[0] && finalValue[1]) {
      onChange(getDateFromRange(finalValue, format))
    }
  }

  const handleReset = () => {
    setValue([null, null])
    setActivePreset(null)
    setOpened(false)
    onChange?.({ start_date: '', end_date: '' })
  }

  return (
    <>
      <Stack gap={6} className={fullWidth ? 'w-full' : undefined}>
        {label ? (
          <Text fz="sm" fw={500} c="gray.7">
            {label}
          </Text>
        ) : null}

        <UnstyledButton
          onClick={handleOpenPicker}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: fullWidth ? 'space-between' : 'flex-start',
            gap: 8,
            minHeight: 40,
            padding: '10px 16px',
            borderRadius: 6,
            backgroundColor: hasSelection ? '#F3F5F5' : '#FFFFFF',
            border: '1px solid #D0D5DD',
            width: fullWidth ? '100%' : 'auto',
          }}
          className={className}
        >
          <Group gap={8} wrap="nowrap" className="min-w-0">
            <Calendar03Icon
              size={18}
              className="shrink-0"
              color={hasSelection ? '#667085' : '#344054'}
            />
            <Text
              fz="sm"
              c={hasSelection ? 'gray.7' : 'gray.6'}
              className="truncate"
            >
              {displayValue}
            </Text>
          </Group>

          {hasSelection ? (
            <ArrowDown01Icon size={16} className="shrink-0 text-[#667085]" />
          ) : null}
        </UnstyledButton>
      </Stack>

      <Modal
        opened={opened}
        onClose={handleCancel}
        size={isCompact ? 'auto' : 1000}
        centered
        withCloseButton={false}
        padding="lg"
        radius="lg"
      >
        <div
          className={
            isCompact ? 'flex flex-col gap-4' : 'flex flex-row gap-4'
          }
        >
          {!isCompact ? (
            <Stack gap={8} className="shrink-0">
              {presets.map((preset) => {
                const isActive = activePreset === preset.label

                return (
                  <UnstyledButton
                    key={preset.label}
                    onClick={() => applyPreset(preset)}
                    className={[
                      'h-10 rounded-md px-4 text-left text-sm transition-colors',
                      isActive
                        ? 'bg-[var(--mantine-color-brand-9)] text-white'
                        : 'text-[#344054] hover:bg-brand-0',
                    ].join(' ')}
                  >
                    {preset.label}
                  </UnstyledButton>
                )
              })}
            </Stack>
          ) : null}

          <Box className="min-w-0 flex-1">
            <DatePicker
              type="range"
              maxDate={maxDateValue}
              numberOfColumns={isCompact ? 1 : 2}
              value={value}
              date={calendarDate}
              onDateChange={setCalendarDate}
              size={isCompact ? 'sm' : 'md'}
              classNames={{
                levelsGroup: '!justify-between',
                month: '!w-full',
                calendarHeader: '!w-full !max-w-full',
              }}
              onChange={(nextValue) => {
                if (!nextValue) {
                  setValue([null, null])
                  setActivePreset(null)
                  return
                }

                setValue(nextValue)
                setActivePreset(findMatchingPreset(nextValue, presets))
              }}
            />

            <Divider my="md" />

            <Group justify="space-between" align="center" wrap="wrap" gap="md">
              <Group gap="sm" wrap="wrap">
                <Button variant="default" onClick={handleReset}>
                  Reset
                </Button>

                {!isCompact ? (
                  <Group gap="sm" wrap="nowrap">
                    <Button variant="default" className="pointer-events-none">
                      {startDate
                        ? dayjs(startDate).format(DISPLAY_DATE_FORMAT)
                        : 'Start Date'}
                    </Button>
                    <Box className="h-0.5 w-3 bg-[#667085]" />
                    <Button variant="default" className="pointer-events-none">
                      {endDate
                        ? dayjs(endDate).format(DISPLAY_DATE_FORMAT)
                        : 'End Date'}
                    </Button>
                  </Group>
                ) : null}
              </Group>

              <Group gap="sm" wrap="nowrap">
                <Button variant="default" onClick={handleCancel}>
                  Close
                </Button>
                <Button color="brand" onClick={handleApply} disabled={!startDate}>
                  Apply
                </Button>
              </Group>
            </Group>
          </Box>
        </div>
      </Modal>
    </>
  )
}
