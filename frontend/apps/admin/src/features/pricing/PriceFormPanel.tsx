import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  NumberInput,
  TextInput,
  Title,
  Text,
  SimpleGrid,
  Select,
  Skeleton,
} from '@mantine/core'
import { DatePickerInput } from '@mantine/dates'
import { useForm, zodResolver } from '@mantine/form'
import { notifications } from '@mantine/notifications'
import { z } from 'zod'
import {
  AdminFormSuccessModal,
  FormFooterActions,
  SidebarFormLayout,
} from '@shared/components'
import { apiErrorMessage } from '@lib/api/auth'
import {
  useCreatePriceMatrix,
  usePriceMatrix,
} from './hooks/use-pricing'
import { matrixApiToRecord, nairaToKobo, vehicleTypeApi } from './matrixLiveMap'

const CREATE_TIPS = [
  'Queues a PENDING matrix for dual-control activation.',
  'Live rates stay until an approver activates.',
  'Fields marked * are required.',
]

const EDIT_TIPS = [
  'Propose change creates a new PENDING matrix for this vehicle type.',
  'Live rates stay until the new row is activated.',
]

const VEHICLE_OPTIONS = [
  { value: 'MOTORCYCLE', label: 'Motorcycle' },
  { value: 'TRICYCLE', label: 'Tricycle' },
  { value: 'BOAT', label: 'Boat' },
]

const schema = z.object({
  vehicle_type: z.string().min(1),
  daily: z.number().positive(),
  weekly: z.number().positive(),
  monthly: z.number().positive(),
  payPerSwap: z.number().positive(),
  effectiveFrom: z.date(),
})

type FormValues = z.infer<typeof schema>

/**
 * Add / propose tariff — POST /mobility/pricing/matrices/ (PENDING).
 * Edit path = new proposal for the same vehicle type.
 */
export function PriceFormPanel({ priceId }: { priceId?: string }) {
  const navigate = useNavigate()
  const isEdit = Boolean(priceId)
  const { matrix, isPending: loadingExisting } = usePriceMatrix(priceId, {
    enabled: isEdit,
  })
  const create = useCreatePriceMatrix()
  const [saved, setSaved] = useState(false)
  const [createdId, setCreatedId] = useState<string | null>(null)

  const existing = useMemo(
    () => (matrix ? matrixApiToRecord(matrix) : null),
    [matrix],
  )

  const form = useForm<FormValues>({
    validate: zodResolver(schema),
    initialValues: {
      vehicle_type: 'MOTORCYCLE',
      daily: 1200,
      weekly: 6500,
      monthly: 24000,
      payPerSwap: 450,
      effectiveFrom: new Date(),
    },
  })

  useEffect(() => {
    if (!matrix) return
    form.setValues({
      vehicle_type: matrix.vehicle_type,
      daily: Math.round(matrix.daily_kobo / 100),
      weekly: Math.round(matrix.weekly_kobo / 100),
      monthly: Math.round(matrix.monthly_kobo / 100),
      payPerSwap: Math.round(matrix.pay_per_swap_kobo / 100),
      effectiveFrom: new Date(matrix.effective_from),
    })
  }, [matrix])

  const back = () =>
    navigate(isEdit && priceId ? `/pricing/${priceId}` : '/pricing')

  const title = isEdit ? 'Propose change' : 'Add New Price'

  if (isEdit && loadingExisting) {
    return (
      <div className="p-6">
        <Skeleton height={320} />
      </div>
    )
  }

  return (
    <>
      <SidebarFormLayout
        sidebarTitle={title}
        sidebarSubtitle="Pricing · rate matrix"
        sidebarTips={isEdit ? EDIT_TIPS : CREATE_TIPS}
        steps={[{ label: 'Rates' }]}
        activeStep={0}
        onClose={back}
        headerActionLabel="Close ×"
        footer={
          <FormFooterActions
            onBack={back}
            submitLabel={isEdit ? 'Queue for Approvals' : 'Submit'}
            submitType="button"
            loading={create.isPending}
            onSubmitClick={() => {
              const result = form.validate()
              if (result.hasErrors) return
              const v = form.values
              create
                .mutateAsync({
                  vehicle_type: vehicleTypeApi(v.vehicle_type),
                  daily_kobo: nairaToKobo(v.daily),
                  weekly_kobo: nairaToKobo(v.weekly),
                  monthly_kobo: nairaToKobo(v.monthly),
                  pay_per_swap_kobo: nairaToKobo(v.payPerSwap),
                  effective_from: v.effectiveFrom.toISOString().slice(0, 10),
                })
                .then((row) => {
                  setCreatedId(row.id)
                  setSaved(true)
                })
                .catch((err) => {
                  notifications.show({
                    color: 'red',
                    message: apiErrorMessage(err, 'Could not queue tariff'),
                  })
                })
            }}
          />
        }
      >
        <div>
          <Title order={2} className="text-[var(--tx)]">
            {title}
          </Title>
          <Text size="sm" c="dimmed" mt={6}>
            {isEdit
              ? 'Creates a new PENDING matrix. Live rates stay until activated.'
              : 'Submit queues a PENDING matrix for dual-control activation.'}
          </Text>
        </div>

        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
          <Select
            className="sm:col-span-2"
            label="Vehicle type"
            required
            data={VEHICLE_OPTIONS}
            disabled={isEdit}
            {...form.getInputProps('vehicle_type')}
          />
          <NumberInput
            label="Daily"
            required
            thousandSeparator
            min={1}
            leftSection={<span className="pl-1 text-sm text-[var(--mu)]">₦</span>}
            {...form.getInputProps('daily')}
          />
          <NumberInput
            label="Weekly"
            required
            thousandSeparator
            min={1}
            leftSection={<span className="pl-1 text-sm text-[var(--mu)]">₦</span>}
            {...form.getInputProps('weekly')}
          />
          <NumberInput
            label="Monthly"
            required
            thousandSeparator
            min={1}
            leftSection={<span className="pl-1 text-sm text-[var(--mu)]">₦</span>}
            {...form.getInputProps('monthly')}
          />
          <NumberInput
            label="Pay-per-swap"
            required
            thousandSeparator
            min={1}
            leftSection={<span className="pl-1 text-sm text-[var(--mu)]">₦</span>}
            {...form.getInputProps('payPerSwap')}
          />
          <DatePickerInput
            className="sm:col-span-2"
            label="Effective from"
            required
            {...form.getInputProps('effectiveFrom')}
          />
          {isEdit && existing ? (
            <TextInput
              className="sm:col-span-2"
              label="Current live row"
              value={`${existing.vehicleType} · ${existing.status}`}
              disabled
            />
          ) : null}
        </SimpleGrid>
      </SidebarFormLayout>

      <AdminFormSuccessModal
        opened={saved}
        onClose={() => {
          setSaved(false)
          if (createdId) navigate(`/pricing/${createdId}`)
          else navigate('/pricing')
        }}
        title="Tariff queued"
        description="Pending dual-control. Activate from the detail page when approved."
      />
    </>
  )
}
