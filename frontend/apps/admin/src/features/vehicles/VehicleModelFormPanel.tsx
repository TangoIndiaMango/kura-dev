import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { NumberInput, Select, TextInput, Title, Text } from '@mantine/core'
import { useForm } from '@mantine/form'
import { notifications } from '@mantine/notifications'
import { zodResolver } from 'mantine-form-zod-resolver'
import { z } from 'zod'
import {
  AdminFormSuccessModal,
  FormFooterActions,
  SidebarFormLayout,
} from '@shared/components'
import { apiErrorMessage } from '@lib/api/auth'
import { useBatteryTypes } from '@features/batteries'
import { useCapabilities } from '../auth/useCapabilities'
import {
  useCreateVehicleModel,
  useUpdateVehicleModel,
  useVehicleModel,
} from './hooks/use-vehicle-models'

const schema = z.object({
  make: z.string().trim().min(1).max(100),
  model: z.string().trim().min(1).max(100),
  vehicle_type: z.enum(['MOTORCYCLE', 'TRICYCLE', 'BOAT']),
  battery_type: z.string().uuid('Select a battery type'),
  service_interval_km: z.number().int().positive().nullable().optional(),
  service_interval_days: z.number().int().positive().nullable().optional(),
})

type FormValues = z.infer<typeof schema>

const TIPS = [
  'Make + model must be unique in the catalogue.',
  'Battery type is copied onto each registered vehicle for hub matching.',
  'Service intervals are optional until maintenance reminders go live.',
]

const TYPE_DATA = [
  { value: 'MOTORCYCLE', label: 'Motorcycle' },
  { value: 'TRICYCLE', label: 'Tricycle' },
  { value: 'BOAT', label: 'Boat' },
]

export function VehicleModelFormPanel({ modelId }: { modelId?: string }) {
  const navigate = useNavigate()
  const { can } = useCapabilities()
  const editing = Boolean(modelId)
  const leave = () => navigate('/vehicles/models')
  const [savedId, setSavedId] = useState<string | null>(null)

  const { model } = useVehicleModel(modelId, {
    enabled: editing && can('vehicles:read'),
  })
  const { data: batteryTypes } = useBatteryTypes({
    enabled: can('batteries:read') || can('vehicles:manage'),
  })
  const createModel = useCreateVehicleModel()
  const updateModel = useUpdateVehicleModel(modelId ?? '')

  const form = useForm<FormValues>({
    validate: zodResolver(schema),
    initialValues: {
      make: '',
      model: '',
      vehicle_type: 'MOTORCYCLE',
      battery_type: '',
      service_interval_km: null,
      service_interval_days: null,
    },
  })

  useEffect(() => {
    if (!model) return
    form.setValues({
      make: model.make,
      model: model.model,
      vehicle_type: model.vehicle_type as FormValues['vehicle_type'],
      battery_type: model.battery_type_id || model.battery_type || '',
      service_interval_km: model.service_interval_km ?? null,
      service_interval_days: model.service_interval_days ?? null,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [model?.id])

  const batteryData = useMemo(
    () =>
      (batteryTypes ?? []).map((b) => ({
        value: b.id,
        label: `${b.name}${b.manufacturer ? ` · ${b.manufacturer}` : ''}`,
      })),
    [batteryTypes],
  )

  if (!can('vehicles:manage') && !editing) {
    return (
      <SidebarFormLayout
        sidebarTitle="New vehicle model"
        sidebarSubtitle="Vehicles · Catalogue"
        sidebarTips={TIPS}
        onClose={leave}
        headerActionLabel="Close ×"
      >
        <Text size="sm">You need vehicles:manage to create catalogue models.</Text>
      </SidebarFormLayout>
    )
  }

  const pending = createModel.isPending || updateModel.isPending

  async function onSubmit() {
    if (!can('vehicles:manage')) {
      notifications.show({
        color: 'red',
        message: 'Need vehicles:manage to save.',
      })
      return
    }
    const result = form.validate()
    if (result.hasErrors) return
    const values = form.values
    const payload = {
      make: values.make.trim(),
      model: values.model.trim(),
      vehicle_type: values.vehicle_type,
      battery_type: values.battery_type,
      service_interval_km: values.service_interval_km ?? null,
      service_interval_days: values.service_interval_days ?? null,
    }
    try {
      const row = editing
        ? await updateModel.mutateAsync(payload)
        : await createModel.mutateAsync(payload)
      setSavedId(row.id)
    } catch (err) {
      notifications.show({
        color: 'red',
        message: apiErrorMessage(err, 'Could not save model'),
      })
    }
  }

  return (
    <>
      <SidebarFormLayout
        sidebarTitle={editing ? 'Edit vehicle model' : 'New vehicle model'}
        sidebarSubtitle="Vehicles · Catalogue"
        sidebarTips={TIPS}
        onClose={leave}
        headerActionLabel="Close ×"
        footer={
          <FormFooterActions
            onBack={leave}
            submitLabel={editing ? 'Save changes' : 'Create model'}
            loading={pending}
            disabled={pending || !can('vehicles:manage')}
            submitType="button"
            onSubmitClick={onSubmit}
          />
        }
      >
        <div>
          <Title order={2} className="text-[var(--tx)]">
            Details
          </Title>
          <Text size="sm" c="dimmed" mt={6} mb="md">
            Required fields are marked with an asterisk.
          </Text>
        </div>
        <div className="flex flex-col gap-3">
          <TextInput
            label="Make"
            placeholder="Asobo"
            required
            {...form.getInputProps('make')}
          />
          <TextInput
            label="Model"
            placeholder="E-Boarder 15"
            required
            {...form.getInputProps('model')}
          />
          <Select
            label="Vehicle type"
            data={TYPE_DATA}
            searchable
            required
            allowDeselect={false}
            nothingFoundMessage="No types"
            maxDropdownHeight={280}
            comboboxProps={{
              withinPortal: true,
              transitionProps: { transition: 'pop', duration: 200 },
            }}
            {...form.getInputProps('vehicle_type')}
          />
          <Select
            label="Battery type"
            placeholder="Select pack family"
            data={batteryData}
            searchable
            required
            allowDeselect={false}
            nothingFoundMessage="No battery types"
            maxDropdownHeight={280}
            comboboxProps={{
              withinPortal: true,
              transitionProps: { transition: 'pop', duration: 200 },
            }}
            value={form.values.battery_type || null}
            onChange={(value) =>
              form.setFieldValue('battery_type', value ?? '')
            }
            error={form.errors.battery_type}
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <NumberInput
              label="Service interval (km)"
              placeholder="Optional"
              min={1}
              hideControls
              {...form.getInputProps('service_interval_km')}
            />
            <NumberInput
              label="Service interval (days)"
              placeholder="Optional"
              min={1}
              hideControls
              {...form.getInputProps('service_interval_days')}
            />
          </div>
        </div>
      </SidebarFormLayout>
      <AdminFormSuccessModal
        opened={Boolean(savedId)}
        onClose={leave}
        title={editing ? 'Model updated' : 'Model created'}
        description="It will appear in the Add Vehicle catalogue dropdown."
        actionLabel="Back to models"
        onAction={leave}
      />
    </>
  )
}
