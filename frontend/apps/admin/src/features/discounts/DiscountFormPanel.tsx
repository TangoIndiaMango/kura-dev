import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Title, Text } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import {
  AdminFormSuccessModal,
  FormFooterActions,
  FormPageLoadingSkeleton,
  SidebarFormLayout,
} from '@shared/components'
import { apiErrorMessage } from '@lib/api/auth'
import { useSegments } from '@features/segments'
import {
  DiscountFormRuleStep,
  DiscountFormScopeStep,
} from './components/DiscountFormSteps'
import { buildDiscountWritePayload, toDateInput } from './discountFormPayload'
import { parseChannels } from './constants'
import {
  useCreateDiscount,
  useDiscount,
  useUpdateDiscount,
} from './hooks/use-discounts'
import type { DiscountAudience, DiscountValueType } from './types'

const STEPS = [{ label: 'Rule' }, { label: 'Scope' }] as const

const CREATE_TIPS = [
  'Discounts modify renewals/swap charges — they are not Product Offers.',
  'Save as DRAFT, then activate via dual control (price:approve).',
  'Rider or agent must enter the code at checkout — never auto-applied.',
]

const EDIT_TIPS = [
  'Edits to live discounts should be reviewed before activate.',
  'AMOUNT values are stored as integer kobo.',
  'SEGMENT audience uses a live Segment id from Commercial → Segments.',
]

export function DiscountFormPanel({ discountId }: { discountId?: string }) {
  const navigate = useNavigate()
  const isEdit = Boolean(discountId)
  const { discount, isPending } = useDiscount(discountId, { enabled: isEdit })
  const create = useCreateDiscount()
  const update = useUpdateDiscount(discountId ?? '')
  const { segments } = useSegments(
    { page: 1, page_size: 100, status: 'ACTIVE' },
    { enabled: true },
  )

  const [saved, setSaved] = useState(false)
  const [savedId, setSavedId] = useState<string | null>(null)
  const [step, setStep] = useState(0)
  const lastStep = STEPS.length - 1

  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [valueType, setValueType] = useState<DiscountValueType>('PERCENT')
  const [percent, setPercent] = useState<number | string>(10)
  const [amountNaira, setAmountNaira] = useState<number | string>(500)
  const [starts, setStarts] = useState('')
  const [ends, setEnds] = useState('')
  const [allPlans, setAllPlans] = useState(true)
  const [planOptions, setPlanOptions] = useState<string[]>([])
  const [periods, setPeriods] = useState<string[]>(['weekly', 'monthly'])
  const [audience, setAudience] = useState<DiscountAudience>('ALL')
  const [segmentId, setSegmentId] = useState<string | null>(null)
  const [fleetMin, setFleetMin] = useState<number | string>(5)
  const [channels, setChannels] = useState<string[]>(['App', 'USSD', 'Hub'])
  const [summary, setSummary] = useState('')

  useEffect(() => {
    if (!discount) return
    setName(discount.name)
    setCode(discount.code)
    setValueType(discount.value_type === 'AMOUNT' ? 'AMOUNT' : 'PERCENT')
    if (discount.value_type === 'AMOUNT') {
      setAmountNaira(Math.round(discount.value / 100))
    } else {
      setPercent(discount.value)
    }
    setStarts(toDateInput(discount.starts_at))
    setEnds(toDateInput(discount.ends_at))
    setAllPlans(discount.applies_to_all_plans)
    setPlanOptions(discount.plan_option_ids ?? [])
    setPeriods(discount.periods?.length ? discount.periods : ['weekly', 'monthly'])
    setAudience((discount.audience as DiscountAudience) || 'ALL')
    setSegmentId(discount.segment_id || null)
    setFleetMin(discount.fleet_min_vehicles ?? 5)
    setChannels(parseChannels(discount.channels))
    setSummary(discount.summary || '')
  }, [discount])

  if (isEdit && isPending) return <FormPageLoadingSkeleton />

  const leave = () =>
    navigate(isEdit && discountId ? `/discounts/${discountId}` : '/discounts')

  const submit = () => {
    const built = buildDiscountWritePayload({
      isEdit,
      name,
      code,
      valueType,
      percent,
      amountNaira,
      periods,
      allPlans,
      planOptions,
      audience,
      segmentId,
      fleetMin,
      channels,
      summary,
      starts,
      ends,
    })
    if (!built.ok) {
      notifications.show({ color: 'red', message: built.message })
      return
    }
    if (isEdit && discountId) {
      const { status: _ignored, ...patch } = built.payload
      update.mutate(patch, {
        onSuccess: (row) => {
          setSavedId(row.id)
          setSaved(true)
        },
        onError: (err) =>
          notifications.show({
            color: 'red',
            message: apiErrorMessage(err, 'Save failed'),
          }),
      })
      return
    }
    create.mutate(built.payload, {
      onSuccess: (row) => {
        setSavedId(row.id)
        setSaved(true)
      },
      onError: (err) =>
        notifications.show({
          color: 'red',
          message: apiErrorMessage(err, 'Create failed'),
        }),
    })
  }

  const handleBack = () => {
    if (step > 0) {
      setStep((s) => s - 1)
      return
    }
    leave()
  }

  const handleContinue = () => {
    if (step < lastStep) {
      setStep((s) => s + 1)
      return
    }
    submit()
  }

  const title = isEdit ? 'Edit discount' : 'Add New Discount'
  const stepLabel = STEPS[step]?.label ?? 'Rule'
  const pending = create.isPending || update.isPending

  return (
    <>
      <SidebarFormLayout
        sidebarTitle={title}
        sidebarSubtitle="Commercial · Discounts"
        sidebarTips={isEdit ? EDIT_TIPS : CREATE_TIPS}
        steps={[...STEPS]}
        activeStep={step}
        onStepChange={setStep}
        onClose={leave}
        headerActionLabel="Close ×"
        footer={
          <FormFooterActions
            onBack={handleBack}
            submitLabel={
              step < lastStep
                ? 'Continue'
                : isEdit
                  ? 'Save changes'
                  : 'Save draft'
            }
            submitType="button"
            onSubmitClick={handleContinue}
            disabled={pending}
            loading={pending}
          />
        }
      >
        <div>
          <Title order={2} className="text-[var(--tx)]">
            {stepLabel}
          </Title>
          <Text size="sm" c="dimmed" mt={6}>
            {step === 0
              ? 'Name the discount, set value and the live window.'
              : 'Choose periods, plans, and who qualifies.'}
          </Text>
        </div>

        {step === 0 ? (
          <DiscountFormRuleStep
            name={name}
            setName={setName}
            code={code}
            setCode={setCode}
            valueType={valueType}
            setValueType={setValueType}
            percent={percent}
            setPercent={setPercent}
            amountNaira={amountNaira}
            setAmountNaira={setAmountNaira}
            starts={starts}
            setStarts={setStarts}
            ends={ends}
            setEnds={setEnds}
          />
        ) : (
          <DiscountFormScopeStep
            periods={periods}
            setPeriods={setPeriods}
            allPlans={allPlans}
            setAllPlans={setAllPlans}
            planOptions={planOptions}
            setPlanOptions={setPlanOptions}
            audience={audience}
            setAudience={setAudience}
            segmentId={segmentId}
            setSegmentId={setSegmentId}
            segments={segments}
            fleetMin={fleetMin}
            setFleetMin={setFleetMin}
            channels={channels}
            setChannels={setChannels}
            summary={summary}
            setSummary={setSummary}
          />
        )}
      </SidebarFormLayout>

      <AdminFormSuccessModal
        opened={saved}
        onClose={() => {
          setSaved(false)
          if (savedId) navigate(`/discounts/${savedId}`)
          else leave()
        }}
        mode="saved"
        title={isEdit ? 'Discount updated' : 'Discount draft saved'}
        description={
          isEdit
            ? 'Changes are live on the campaign record.'
            : 'Activate via dual control (price:approve) when ready.'
        }
        actionLabel="Open discount"
        onAction={() => {
          if (savedId) navigate(`/discounts/${savedId}`)
          else leave()
        }}
      />
    </>
  )
}
