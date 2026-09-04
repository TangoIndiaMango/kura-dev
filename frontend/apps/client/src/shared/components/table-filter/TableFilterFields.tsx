import { useEffect, useMemo, useState } from 'react'
import {
  Box,
  Checkbox,
  Popover,
  Select,
  Stack,
  Text,
  UnstyledButton,
} from '@mantine/core'
import { DatePicker, type DatesRangeValue } from '@mantine/dates'
import dayjs from 'dayjs'
import { Calendar03Icon, ArrowDown01Icon } from 'hugeicons-react'
import {
  getDateFromRange,
  parseDateRangeInput,
  STORAGE_DATE_FORMAT,
  type DateRangeOutput,
} from '../date-range'
import type {
  TableFilterDateRangeField,
  TableFilterFieldConfig,
  TableFilterMultiCheckboxField,
  TableFilterSelectField,
  TableFilterSortOrderField,
  TableFilterValue,
  TableFilterValues,
} from './types'

const INPUT_BG = '#F3F5F5'
const INPUT_BORDER = '#DEE2E6'

const checkboxStyles = {
  input: {
    borderColor: INPUT_BORDER,
    cursor: 'pointer',
  },
  label: {
    fontSize: 14,
    color: '#344054',
    cursor: 'pointer',
  },
} as const

function FieldLabel({
  label,
  required,
}: {
  label: string
  required?: boolean
}) {
  return (
    <Text fz="sm" fw={500} c="dark.7" mb={6}>
      {label}
      {required ? (
        <Text span c="red.6" fw={600}>
          *
        </Text>
      ) : null}
    </Text>
  )
}

function emptyValueForField(field: TableFilterFieldConfig): TableFilterValue {
  switch (field.type) {
    case 'select':
    case 'sortOrder':
      return null
    case 'multiCheckbox':
      return []
    case 'dateRange':
      return { start_date: '', end_date: '' }
  }
}

export function createEmptyFilterValues(
  fields: TableFilterFieldConfig[],
): TableFilterValues {
  return Object.fromEntries(
    fields.map((field) => [field.key, emptyValueForField(field)]),
  )
}

function SelectFilterField({
  field,
  value,
  onChange,
}: {
  field: TableFilterSelectField
  value: string | null
  onChange: (value: string | null) => void
}) {
  return (
    <Box>
      <FieldLabel label={field.label} required={field.required} />
      <Select
        data={field.options}
        value={value}
        onChange={onChange}
        placeholder={field.placeholder ?? 'Select an Option'}
        rightSection={<ArrowDown01Icon size={16} color="#667085" />}
        allowDeselect
        styles={{
          input: {
            backgroundColor: INPUT_BG,
            borderColor: INPUT_BORDER,
            minHeight: 44,
          },
        }}
      />
    </Box>
  )
}

function MultiCheckboxFilterField({
  field,
  value,
  onChange,
}: {
  field: TableFilterMultiCheckboxField
  value: string[]
  onChange: (value: string[]) => void
}) {
  const presentation = field.presentation ?? 'popover'
  const selected = value ?? []
  const selectedLabels = selected
    .map(
      (item) =>
        field.options.find((option) => option.value === item)?.label ?? item,
    )
    .filter(Boolean)
  const summary =
    selectedLabels.length === 0
      ? (field.placeholder ?? 'Select an Option')
      : selectedLabels.join(', ')

  const checklist = (
    <Stack gap="sm" p={presentation === 'popover' ? 'md' : 0}>
      {presentation === 'popover' ? (
        <Text fz="sm" fw={500} c="gray.6">
          {field.label}
        </Text>
      ) : null}
      <Checkbox.Group value={selected} onChange={onChange}>
        <Stack gap="sm">
          {field.options.map((option) => (
            <Checkbox
              key={option.value}
              value={option.value}
              label={option.label}
              color="brand"
              radius={4}
              styles={checkboxStyles}
            />
          ))}
        </Stack>
      </Checkbox.Group>
    </Stack>
  )

  if (presentation === 'inline') {
    return (
      <Box>
        <FieldLabel label={field.label} required={field.required} />
        {checklist}
      </Box>
    )
  }

  return (
    <Box>
      <FieldLabel label={field.label} required={field.required} />
      <Popover width={280} position="bottom-start" shadow="md" radius="md">
        <Popover.Target>
          <UnstyledButton
            w="100%"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              minHeight: 44,
              padding: '10px 14px',
              borderRadius: 8,
              backgroundColor: INPUT_BG,
              border: `1px solid ${INPUT_BORDER}`,
            }}
          >
            <Text
              fz="sm"
              c={selected.length ? 'dark.7' : 'gray.5'}
              className="min-w-0 flex-1 truncate"
              ta="left"
            >
              {summary}
            </Text>
            <ArrowDown01Icon size={16} color="#667085" />
          </UnstyledButton>
        </Popover.Target>
        <Popover.Dropdown p={0}>{checklist}</Popover.Dropdown>
      </Popover>
    </Box>
  )
}

function DateRangeFilterField({
  field,
  value,
  onChange,
}: {
  field: TableFilterDateRangeField
  value: DateRangeOutput
  onChange: (value: DateRangeOutput) => void
}) {
  const parsed = useMemo(
    () => parseDateRangeInput(value ?? {}, false),
    [value?.end_date, value?.start_date],
  )
  const [draft, setDraft] = useState<DatesRangeValue<string>>(parsed)
  const [opened, setOpened] = useState(false)
  const [calendarDate, setCalendarDate] = useState(
    parsed[0] ?? dayjs().format(STORAGE_DATE_FORMAT),
  )

  useEffect(() => {
    setDraft(parsed)
    if (parsed[0]) setCalendarDate(parsed[0])
  }, [parsed])

  const display =
    parsed[0] && parsed[1]
      ? `${dayjs(parsed[0]).format('DD/MM/YYYY')} - ${dayjs(parsed[1]).format('DD/MM/YYYY')}`
      : null

  const applyRange = (next: DatesRangeValue<string>) => {
    let finalValue = next
    if (finalValue[0] && !finalValue[1]) {
      finalValue = [finalValue[0], finalValue[0]]
    }
    if (finalValue[0] && finalValue[1]) {
      onChange(getDateFromRange(finalValue))
      setOpened(false)
    }
  }

  return (
    <Box>
      <FieldLabel label={field.label} required={field.required} />
      <Popover
        opened={opened}
        onChange={setOpened}
        width={320}
        position="bottom-start"
        shadow="md"
        radius="md"
      >
        <Popover.Target>
          <UnstyledButton
            w="100%"
            onClick={() => setOpened((prev) => !prev)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              minHeight: 44,
              padding: '10px 14px',
              borderRadius: 8,
              backgroundColor: INPUT_BG,
              border: `1px solid ${INPUT_BORDER}`,
            }}
          >
            <Text fz="sm" c={display ? 'dark.7' : 'gray.5'}>
              {display ?? field.placeholder ?? 'DD/MM/YYYY - DD/MM/YYYY'}
            </Text>
            <Calendar03Icon size={16} color="#667085" />
          </UnstyledButton>
        </Popover.Target>
        <Popover.Dropdown p="md">
          <DatePicker
            type="range"
            value={draft}
            date={calendarDate}
            onDateChange={setCalendarDate}
            onChange={(next) => {
              setDraft(next)
              if (next[0] && next[1]) applyRange(next)
            }}
            size="sm"
            classNames={{
              month: '!w-full',
            }}
          />
        </Popover.Dropdown>
      </Popover>
    </Box>
  )
}

function SortOrderFilterField({
  field,
  value,
  onChange,
}: {
  field: TableFilterSortOrderField
  value: 'asc' | 'desc' | null
  onChange: (value: 'asc' | 'desc' | null) => void
}) {
  return (
    <Box>
      <FieldLabel label={field.label} required={field.required} />
      <Stack gap="sm">
        {field.options.map((option) => {
          const checked = value === option.value
          return (
            <Checkbox
              key={option.value}
              checked={checked}
              label={option.label}
              color="brand"
              radius={4}
              styles={checkboxStyles}
              onChange={() =>
                onChange(checked ? null : option.value)
              }
            />
          )
        })}
      </Stack>
    </Box>
  )
}

export function TableFilterField({
  field,
  value,
  onChange,
}: {
  field: TableFilterFieldConfig
  value: TableFilterValue
  onChange: (value: TableFilterValue) => void
}) {
  switch (field.type) {
    case 'select':
      return (
        <SelectFilterField
          field={field}
          value={(value as string | null) ?? null}
          onChange={onChange}
        />
      )
    case 'multiCheckbox':
      return (
        <MultiCheckboxFilterField
          field={field}
          value={Array.isArray(value) ? value : []}
          onChange={onChange}
        />
      )
    case 'dateRange':
      return (
        <DateRangeFilterField
          field={field}
          value={(value as DateRangeOutput) ?? { start_date: '', end_date: '' }}
          onChange={onChange}
        />
      )
    case 'sortOrder':
      return (
        <SortOrderFilterField
          field={field}
          value={(value as 'asc' | 'desc' | null) ?? null}
          onChange={onChange}
        />
      )
  }
}

export const NAME_SORT_OPTIONS: [
  { value: 'asc'; label: string },
  { value: 'desc'; label: string },
] = [
  { value: 'asc', label: 'Ascending Order (A-Z)' },
  { value: 'desc', label: 'Descending Order (Z-A)' },
]

export const VALUE_SORT_OPTIONS: [
  { value: 'asc'; label: string },
  { value: 'desc'; label: string },
] = [
  { value: 'asc', label: 'Smallest to Highest' },
  { value: 'desc', label: 'Highest to Smallest' },
]