import {
  Checkbox,
  MultiSelect,
  NumberInput,
  Radio,
  Select,
  SimpleGrid,
  TextInput,
  Textarea,
  Text,
} from '@mantine/core'
import { DatePickerInput } from '@mantine/dates'
import { PERIOD_CHOICES, PLAN_OPTION_CHOICES, CHANNEL_CHOICES } from '../constants'
import { localTodayYmd } from '../discountFormPayload'
import type { DiscountAudience, DiscountValueType } from '../types'

type SegmentOption = { id: string; name: string; last_count: number }

function toYmd(value: string | Date | null): string {
  if (!value) return ''
  if (typeof value === 'string') return value.slice(0, 10)
  if (Number.isNaN(value.getTime())) return ''
  const y = value.getFullYear()
  const m = String(value.getMonth() + 1).padStart(2, '0')
  const d = String(value.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function DiscountFormRuleStep({
  name,
  setName,
  code,
  setCode,
  valueType,
  setValueType,
  percent,
  setPercent,
  amountNaira,
  setAmountNaira,
  starts,
  setStarts,
  ends,
  setEnds,
}: {
  name: string
  setName: (v: string) => void
  code: string
  setCode: (v: string) => void
  valueType: DiscountValueType
  setValueType: (v: DiscountValueType) => void
  percent: number | string
  setPercent: (v: number | string) => void
  amountNaira: number | string
  setAmountNaira: (v: number | string) => void
  starts: string
  setStarts: (v: string) => void
  ends: string
  setEnds: (v: string) => void
}) {
  const today = localTodayYmd()
  const endMin = starts && starts > today ? starts : today

  const onStartChange = (value: string | Date | null) => {
    const next = toYmd(value)
    setStarts(next)
    if (ends && next && ends < next) setEnds(next)
  }

  return (
    <>
      <Text size="sm" fw={700} className="text-[var(--tx)]">
        Identity
      </Text>
      <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
        <TextInput
          label="Name"
          placeholder="e.g. Fleet volume · 5+"
          required
          value={name}
          onChange={(e) => setName(e.currentTarget.value)}
          maxLength={120}
        />
        <TextInput
          label="Code"
          placeholder="e.g. FLEET-8"
          required
          value={code}
          onChange={(e) => setCode(e.currentTarget.value.toUpperCase())}
        />
      </SimpleGrid>

      <Text size="sm" fw={700} className="text-[var(--tx)]">
        Value & window
      </Text>
      <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
        <Select
          label="Discount type"
          data={[
            { value: 'PERCENT', label: 'Percentage' },
            { value: 'AMOUNT', label: 'Amount (₦)' },
          ]}
          value={valueType}
          onChange={(v) => setValueType((v as DiscountValueType) ?? 'PERCENT')}
          allowDeselect={false}
          required
        />
        {valueType === 'PERCENT' ? (
          <NumberInput
            label="Percentage"
            required
            min={1}
            max={100}
            value={percent}
            onChange={setPercent}
            rightSection={
              <span className="pr-2 text-sm text-[var(--mu)]">%</span>
            }
          />
        ) : (
          <NumberInput
            label="Amount"
            required
            thousandSeparator
            min={1}
            value={amountNaira}
            onChange={setAmountNaira}
            leftSection={
              <span className="pl-1 text-sm text-[var(--mu)]">₦</span>
            }
          />
        )}
        <DatePickerInput
          label="Start date"
          placeholder="DD/MM/YYYY"
          valueFormat="DD/MM/YYYY"
          value={starts || null}
          minDate={today}
          clearable
          onChange={onStartChange}
          description="Earliest day is today."
        />
        <DatePickerInput
          label="End date"
          placeholder="DD/MM/YYYY"
          valueFormat="DD/MM/YYYY"
          value={ends || null}
          minDate={endMin}
          clearable
          onChange={(value) => setEnds(toYmd(value))}
          description="Today or later, and on/after start."
        />
      </SimpleGrid>
    </>
  )
}

export function DiscountFormScopeStep({
  periods,
  setPeriods,
  allPlans,
  setAllPlans,
  planOptions,
  setPlanOptions,
  audience,
  setAudience,
  segmentId,
  setSegmentId,
  segments,
  fleetMin,
  setFleetMin,
  channels,
  setChannels,
  summary,
  setSummary,
}: {
  periods: string[]
  setPeriods: (v: string[]) => void
  allPlans: boolean
  setAllPlans: (v: boolean) => void
  planOptions: string[]
  setPlanOptions: (v: string[]) => void
  audience: DiscountAudience
  setAudience: (v: DiscountAudience) => void
  segmentId: string | null
  setSegmentId: (v: string | null) => void
  segments: SegmentOption[]
  fleetMin: number | string
  setFleetMin: (v: number | string) => void
  channels: string[]
  setChannels: (v: string[]) => void
  summary: string
  setSummary: (v: string) => void
}) {
  return (
    <>
      <Checkbox.Group
        label="Applies to periods"
        description="Only selected periods accept this code at checkout."
        value={periods}
        onChange={setPeriods}
        required
      >
        <SimpleGrid cols={{ base: 2, sm: 4 }} mt="xs">
          {PERIOD_CHOICES.map((p) => (
            <Checkbox key={p.value} value={p.value} label={p.label} />
          ))}
        </SimpleGrid>
      </Checkbox.Group>

      <Radio.Group
        label="Applies to all plans?"
        value={allPlans ? 'yes' : 'no'}
        onChange={(v) => setAllPlans(v === 'yes')}
      >
        <SimpleGrid cols={2} mt="xs" maw={280}>
          <Radio value="yes" label="Yes" />
          <Radio value="no" label="No — pick options" />
        </SimpleGrid>
      </Radio.Group>

      {!allPlans ? (
        <MultiSelect
          label="Plan options"
          placeholder="Select plan options"
          data={[...PLAN_OPTION_CHOICES]}
          value={planOptions}
          onChange={setPlanOptions}
          searchable
        />
      ) : null}

      <Select
        label="Audience"
        data={[
          { value: 'ALL', label: 'All operators' },
          { value: 'SEGMENT', label: 'Segment' },
          { value: 'FLEET', label: 'Fleet threshold' },
        ]}
        value={audience}
        onChange={(v) => setAudience((v as DiscountAudience) ?? 'ALL')}
        allowDeselect={false}
      />

      {audience === 'SEGMENT' ? (
        <Select
          label="Segment"
          placeholder="Select active segment"
          data={segments.map((s) => ({
            value: s.id,
            label: `${s.name} · ${s.last_count}`,
          }))}
          value={segmentId}
          onChange={setSegmentId}
          searchable
        />
      ) : null}

      {audience === 'FLEET' ? (
        <NumberInput
          label="Minimum vehicles"
          description="Active vehicles on the account."
          min={2}
          value={fleetMin}
          onChange={setFleetMin}
        />
      ) : null}

      <MultiSelect
        label="Channels"
        placeholder="Select channels"
        data={[...CHANNEL_CHOICES]}
        value={channels}
        onChange={setChannels}
        searchable
        required
        description="Code entry is rejected on channels not listed."
      />

      <Textarea
        label="Summary"
        placeholder="Short ops description"
        minRows={2}
        value={summary}
        onChange={(e) => setSummary(e.currentTarget.value)}
      />
    </>
  )
}
