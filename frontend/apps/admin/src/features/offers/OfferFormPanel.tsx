import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  NumberInput,
  Select,
  SimpleGrid,
  TextInput,
  Textarea,
  Title,
  Text,
  MultiSelect,
} from '@mantine/core'
import { notifications } from '@mantine/notifications'
import {
  AdminFormSuccessModal,
  FormFooterActions,
  FormPageLoadingSkeleton,
  SidebarFormLayout,
} from '@shared/components'
import { useSegments } from '@features/segments'
import { useCreateOffer, useOffer, useUpdateOffer } from './hooks/use-offers'
import type { OfferType } from './types'

const STEPS = [{ label: 'Product' }, { label: 'Terms' }, { label: 'Audience' }] as const

const TIPS = ['Product Offers are credit, insurance, or financing — not discount codes.', 'Operators only see Active offers in Wallet (and USSD when live).', 'New offers save as Draft. Publish from the detail page when ready.']

export function OfferFormPanel({ offerId }: { offerId?: string }) {
  const navigate = useNavigate()
  const isEdit = Boolean(offerId)
  const { offer, isPending } = useOffer(offerId, { enabled: isEdit })
  const { segments, isPending: segmentsPending } = useSegments({ page: 1, page_size: 100, status: 'ACTIVE' }, { enabled: true })
  const create = useCreateOffer()
  const update = useUpdateOffer(offerId ?? '')
  const [saved, setSaved] = useState(false)
  const [savedId, setSavedId] = useState<string | null>(null)
  const [step, setStep] = useState(0)
  const [name, setName] = useState('')
  const [type, setType] = useState<OfferType>('CREDIT')
  const [summary, setSummary] = useState('')
  const [segmentId, setSegmentId] = useState('')
  const [minAmount, setMinAmount] = useState<number | string>(5000)
  const [maxAmount, setMaxAmount] = useState<number | string>(50000)
  const [tenors, setTenors] = useState<string[]>(['7', '14', '30'])
  const [interestPct, setInterestPct] = useState<number | string>(5)
  const [partnerName, setPartnerName] = useState('')
  const [premiumLabel, setPremiumLabel] = useState('')

  useEffect(() => {
    if (!offer) return
    setName(offer.name)
    setType((offer.offer_type as OfferType) || 'CREDIT')
    setSummary(offer.summary ?? '')
    const terms = offer.terms ?? {}
    if (typeof terms.min_amount_kobo === 'number') {
      setMinAmount(Math.round(terms.min_amount_kobo / 100))
    }
    if (typeof terms.max_amount_kobo === 'number') {
      setMaxAmount(Math.round(terms.max_amount_kobo / 100))
    }
    if (Array.isArray(terms.tenor_days)) {
      setTenors(terms.tenor_days.map(String))
    }
    if (typeof terms.interest_rate_bps === 'number') {
      setInterestPct(terms.interest_rate_bps / 100)
    }
    if (typeof terms.partner_name === 'string') setPartnerName(terms.partner_name)
    if (typeof terms.premium_label === 'string') setPremiumLabel(terms.premium_label)
    const seg = offer.segment_criteria?.segment_id
    if (typeof seg === 'string') setSegmentId(seg)
  }, [offer])

  if (isEdit && isPending) return <FormPageLoadingSkeleton />

  const leave = () => navigate(isEdit && offerId ? `/offers/${offerId}` : '/offers')

  const buildTerms = (): Record<string, unknown> => {
    if (type === 'CREDIT') {
      return {
        min_amount_kobo: Math.round(Number(minAmount) * 100),
        max_amount_kobo: Math.round(Number(maxAmount) * 100),
        tenor_days: tenors.map(Number).filter((n) => Number.isFinite(n)),
        interest_rate_bps: Math.round(Number(interestPct) * 100),
        disbursement: 'SWAP_CREDIT',
      }
    }
    return {
      partner_name: partnerName,
      premium_label: type === 'INSURANCE' ? premiumLabel : undefined,
      disbursement: type === 'INSURANCE' ? 'PARTNER_POLICY' : 'PARTNER_REFERRAL',
    }
  }

  const persist = () => {
    const payload = {
      name: name.trim(),
      offer_type: type,
      summary: summary.trim(),
      terms: buildTerms(),
      segment_criteria: segmentId.trim()
        ? { segment_id: segmentId.trim() }
        : {},
      status: 'DRAFT' as const,
    }
    if (!payload.name) {
      notifications.show({ color: 'red', message: 'Name is required.' })
      return
    }
    if (isEdit && offerId) {
      update.mutate(
        {
          name: payload.name,
          summary: payload.summary,
          terms: payload.terms,
          segment_criteria: payload.segment_criteria,
        },
        {
          onSuccess: (row) => {
            setSavedId(row.id)
            setSaved(true)
          },
          onError: () =>
            notifications.show({
              color: 'red',
              title: 'Save failed',
              message: 'Check offers:manage and that Offers is enabled.',
            }),
        },
      )
      return
    }
    create.mutate(payload, {
      onSuccess: (row) => {
        setSavedId(row.id)
        setSaved(true)
      },
      onError: () =>
        notifications.show({
          color: 'red',
          title: 'Create failed',
          message: 'Enable Offers master switch, then retry.',
        }),
    })
  }

  const busy = create.isPending || update.isPending
  const lastStep = STEPS.length - 1

  return (
    <>
      <SidebarFormLayout
        sidebarTitle={isEdit ? 'Edit offer' : 'Create offer'}
        sidebarSubtitle="Commercial · Product Offers"
        sidebarTips={TIPS}
        steps={[...STEPS]}
        activeStep={step}
        onClose={leave}
        headerActionLabel="Close ×"
        footer={
          <FormFooterActions
            onBack={() => (step > 0 ? setStep((s) => s - 1) : leave())}
            submitLabel={
              step < lastStep ? 'Continue' : isEdit ? 'Save changes' : 'Save as draft'
            }
            submitType="button"
            onSubmitClick={() => {
              if (step < lastStep) {
                setStep((s) => s + 1)
                return
              }
              persist()
            }}
            loading={busy}
          />
        }
      >
        <div>
          <Title order={2} className="text-[var(--tx)]">
            {step === 0 ? 'What product is this?' : step === 1 ? 'Commercial terms' : 'Who sees it?'}
          </Title>
          <Text size="sm" c="dimmed" mt={6}>
            {step === 0
              ? 'Pick one product type. Discount codes live under Discounts.'
              : step === 1
                ? 'Terms operators will see when they apply.'
                : 'Optional segment target. Publish from detail when ready.'}
          </Text>
        </div>

        {step === 0 ? (
          <>
            <TextInput
              label="Offer name"
              required
              value={name}
              onChange={(e) => setName(e.currentTarget.value)}
            />
            <Select
              label="Product type"
              data={[
                { value: 'CREDIT', label: 'Credit — working capital' },
                { value: 'INSURANCE', label: 'Insurance — partner cover' },
                { value: 'FINANCING', label: 'Financing — partner referral' },
              ]}
              value={type}
              onChange={(v) => setType((v as OfferType) ?? 'CREDIT')}
            />
            <Textarea
              label="Operator summary"
              minRows={2}
              value={summary}
              onChange={(e) => setSummary(e.currentTarget.value)}
              required
            />
          </>
        ) : null}

        {step === 1 && type === 'CREDIT' ? (
          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
            <NumberInput
              label="Min amount (₦)"
              min={1000}
              thousandSeparator
              value={minAmount}
              onChange={setMinAmount}
            />
            <NumberInput
              label="Max amount (₦)"
              min={1000}
              thousandSeparator
              value={maxAmount}
              onChange={setMaxAmount}
            />
            <MultiSelect
              label="Tenor options (days)"
              data={['7', '14', '30']}
              value={tenors}
              onChange={setTenors}
            />
            <NumberInput
              label="Interest over tenor (%)"
              min={0}
              max={40}
              decimalScale={1}
              value={interestPct}
              onChange={setInterestPct}
            />
          </SimpleGrid>
        ) : null}

        {step === 1 && type !== 'CREDIT' ? (
          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
            <TextInput
              label="Partner name"
              value={partnerName}
              onChange={(e) => setPartnerName(e.currentTarget.value)}
            />
            {type === 'INSURANCE' ? (
              <TextInput
                label="Premium label"
                value={premiumLabel}
                onChange={(e) => setPremiumLabel(e.currentTarget.value)}
              />
            ) : null}
          </SimpleGrid>
        ) : null}

        {step === 2 ? (
          <Select
            label="Segment (optional)"
            description="Only ACTIVE segment members can see this offer."
            placeholder={segmentsPending ? 'Loading active segments…' : 'Select segment'}
            data={segments.map((s) => ({ value: s.id, label: `${s.name} · ${s.last_count.toLocaleString()}` }))}
            value={segmentId || null}
            onChange={(v) => setSegmentId(v ?? '')}
            clearable
            searchable
          />
        ) : null}
      </SidebarFormLayout>

      <AdminFormSuccessModal
        opened={saved}
        onClose={() => {
          setSaved(false)
          if (savedId) navigate(`/offers/${savedId}`)
          else leave()
        }}
        title={isEdit ? 'Offer saved' : 'Offer drafted'}
        description={
          isEdit
            ? `${name} updated.`
            : `${name || 'Offer'} saved as Draft. Open it and set Active when ready.`
        }
        actionLabel="View offer"
      />
    </>
  )
}
