import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  NumberInput,
  Select,
  SimpleGrid,
  Switch,
  TextInput,
  Title,
  Text,
  Skeleton,
} from '@mantine/core'
import { useForm, zodResolver } from '@mantine/form'
import { notifications } from '@mantine/notifications'
import { z } from 'zod'
import {
  VehicleTypeField,
  AdminFormSuccessModal,
  FormFooterActions,
  SidebarFormLayout,
} from '@shared/components'
import { usePlan } from '@features/mobility'
import { apiErrorMessage } from '@lib/api/auth'
import { useCreatePlan, useUpdatePlan } from './hooks/use-pricing'
import { nairaToKobo, vehicleTypeApi } from './matrixLiveMap'

const PERIODS = [
  { value: 'day', label: 'Daily' },
  { value: 'week', label: 'Weekly' },
  { value: 'month', label: 'Monthly' },
  { value: 'swap', label: 'Pay-per-swap' },
]

const schema = z.object({
  code: z.string().min(2).max(50),
  name: z.string().min(2).max(100),
  vehicle_type: z.string().min(1),
  period: z.enum(['day', 'week', 'month', 'swap']),
  duration_days: z.number().int().positive().nullable(),
  swap_allowance: z.number().int().positive().nullable(),
  priceNaira: z.number().min(0),
  description: z.string(),
  auto_renew_default: z.boolean(),
})

type FormValues = z.infer<typeof schema>

export function PlanFormPanel({ planId }: { planId?: string }) {
  const navigate = useNavigate()
  const isEdit = Boolean(planId)
  const { plan, isPending: loading } = usePlan(planId, { enabled: isEdit })
  const create = useCreatePlan()
  const update = useUpdatePlan(planId ?? '')
  const [saved, setSaved] = useState(false)
  const [savedId, setSavedId] = useState<string | null>(null)

  const form = useForm<FormValues>({
    validate: zodResolver(schema),
    initialValues: {
      code: '',
      name: '',
      vehicle_type: 'MOTORCYCLE',
      period: 'day',
      duration_days: 1,
      swap_allowance: 2,
      priceNaira: 1200,
      description: '',
      auto_renew_default: false,
    },
  })

  useEffect(() => {
    if (!plan) return
    form.setValues({
      code: plan.code,
      name: plan.name,
      vehicle_type: plan.vehicle_type,
      period: (plan.period as FormValues['period']) || 'day',
      duration_days: plan.duration_days,
      swap_allowance: plan.swap_allowance,
      priceNaira: Math.round(plan.price_kobo / 100),
      description: plan.description || '',
      auto_renew_default: plan.auto_renew_default,
    })
  }, [plan])

  const back = () =>
    navigate(isEdit && planId ? `/pricing/plans/${planId}` : '/pricing/plans')

  if (isEdit && loading) {
    return (
      <div className="p-6">
        <Skeleton height={320} />
      </div>
    )
  }

  const busy = create.isPending || update.isPending

  return (
    <>
      <SidebarFormLayout
        sidebarTitle={isEdit ? 'Edit Plan' : 'Add New Plan'}
        sidebarSubtitle="Plan definitions"
        sidebarTips={[
          'Vehicle type scopes which riders see this plan.',
          'List price is display; live settle still uses the price matrix.',
        ]}
        steps={[{ label: 'Details' }]}
        activeStep={0}
        onClose={back}
        headerActionLabel="Close ×"
        footer={
          <FormFooterActions
            onBack={back}
            submitLabel={isEdit ? 'Save' : 'Create plan'}
            submitType="button"
            loading={busy}
            disabled={busy}
            onSubmitClick={() => {
              const result = form.validate()
              if (result.hasErrors) return
              const v = form.values
              const payload = {
                name: v.name,
                description: v.description,
                duration_days: v.period === 'swap' ? null : v.duration_days,
                swap_allowance: v.period === 'swap' ? null : v.swap_allowance,
                price_kobo: nairaToKobo(v.priceNaira),
                auto_renew_default: v.auto_renew_default,
              }
              const run = isEdit
                ? update.mutateAsync(payload)
                : create.mutateAsync({
                    ...payload,
                    code: v.code,
                    vehicle_type: vehicleTypeApi(v.vehicle_type),
                    period: v.period,
                  })
              run
                .then((row) => {
                  setSavedId(row.id)
                  setSaved(true)
                })
                .catch((err) => {
                  notifications.show({
                    color: 'red',
                    message: apiErrorMessage(err, 'Could not save plan'),
                  })
                })
            }}
          />
        }
      >
        <div>
          <Title order={2} className="text-[var(--tx)]">
            {isEdit ? 'Edit Plan' : 'Add New Plan'}
          </Title>
          <Text size="sm" c="dimmed" mt={6}>
            Catalogue definition for operators. Required fields marked *.
          </Text>
        </div>

        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
          <TextInput
            label="Code"
            required
            disabled={isEdit}
            {...form.getInputProps('code')}
          />
          <TextInput label="Name" required {...form.getInputProps('name')} />
          <VehicleTypeField
            value={form.values.vehicle_type}
            onChange={(v) => form.setFieldValue('vehicle_type', v)}
            error={form.errors.vehicle_type as string | undefined}
            disabled={isEdit}
          />
          <Select
            label="Period"
            required
            data={PERIODS}
            disabled={isEdit}
            {...form.getInputProps('period')}
          />
          <NumberInput
            label="Duration (days)"
            min={1}
            disabled={form.values.period === 'swap'}
            {...form.getInputProps('duration_days')}
          />
          <NumberInput
            label="Swap allowance"
            description="Leave empty for unlimited"
            min={1}
            disabled={form.values.period === 'swap'}
            {...form.getInputProps('swap_allowance')}
          />
          <NumberInput
            label="List price"
            required
            min={0}
            thousandSeparator
            leftSection={<span className="pl-1 text-sm text-[var(--mu)]">₦</span>}
            {...form.getInputProps('priceNaira')}
          />
          <Switch
            label="Auto-renew by default"
            mt="xl"
            {...form.getInputProps('auto_renew_default', { type: 'checkbox' })}
          />
          <TextInput
            className="sm:col-span-2"
            label="Description"
            {...form.getInputProps('description')}
          />
        </SimpleGrid>
      </SidebarFormLayout>

      <AdminFormSuccessModal
        opened={saved}
        mode={isEdit ? 'saved' : 'created'}
        title={isEdit ? 'Plan saved' : 'Plan created'}
        description="Operators see this catalogue on the Plans screen when active."
        onClose={() => setSaved(false)}
        onAction={() => {
          if (savedId) navigate(`/pricing/plans/${savedId}`)
          else back()
        }}
      />
    </>
  )
}
