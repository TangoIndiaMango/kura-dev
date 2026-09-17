import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Select, TextInput, Title } from '@mantine/core'
import { useDebouncedValue } from '@mantine/hooks'
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
import { useOperators } from '@features/operators'
import { useCapabilities } from '../auth/useCapabilities'
import {
  useCreateVehicle,
  useUpdateVehicle,
  useVehicle,
  useVehicleModels,
} from './hooks/use-vehicles'

const schema = z.object({
  account_id: z.string().uuid('Select an owner account'),
  vehicle_model_id: z.string().uuid('Select a vehicle model'),
  registration_plate: z.string().trim().min(3).max(30),
  hardware_id: z.string().trim().max(64).optional(),
  vin: z.string().trim().max(32).optional(),
  status: z.enum(['ACTIVE', 'PENDING', 'SUSPENDED', 'RETIRED']).optional(),
})

type FormValues = z.infer<typeof schema>

const TIPS = [
  'Vehicle models are the shared catalogue — create those under Vehicle models.',
  'This form registers a real bike: catalogue model + unique plate + owner account.',
  'Search the owner by name, phone, or Kura ID.',
  'Duplicate plates are rejected.',
]

export function VehicleFormPanel({ vehicleId }: { vehicleId?: string }) {
  const navigate = useNavigate()
  const { can } = useCapabilities()
  const editing = Boolean(vehicleId)
  const backTo =
    editing && vehicleId ? `/vehicles/${vehicleId}` : '/vehicles'
  const [savedId, setSavedId] = useState<string | null>(null)
  const [ownerSearch, setOwnerSearch] = useState('')
  const [debouncedOwnerSearch] = useDebouncedValue(ownerSearch, 300)

  const { vehicle } = useVehicle(vehicleId, {
    enabled: editing && can('vehicles:read'),
  })
  const { data: models } = useVehicleModels({ enabled: can('vehicles:read') })
  const { operators, isFetching: ownersFetching } = useOperators({
    search: debouncedOwnerSearch || undefined,
    page: 1,
    page_size: 50,
  })
  const createVehicle = useCreateVehicle()
  const updateVehicle = useUpdateVehicle(vehicleId ?? '')

  const form = useForm<FormValues>({
    validate: zodResolver(schema),
    initialValues: {
      account_id: '',
      vehicle_model_id: '',
      registration_plate: '',
      hardware_id: '',
      vin: '',
      status: 'ACTIVE',
    },
  })

  useEffect(() => {
    if (!vehicle) return
    form.setValues({
      account_id: vehicle.account_id,
      vehicle_model_id: vehicle.vehicle_model_id,
      registration_plate: vehicle.registration_plate,
      hardware_id: vehicle.hardware_id ?? '',
      vin: vehicle.vin ?? '',
      status: vehicle.status,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vehicle?.id])

  const modelData = useMemo(
    () =>
      (models ?? []).map((m) => ({
        value: m.id,
        label: `${m.make} ${m.model} · ${m.vehicle_type}${
          m.battery_type_name ? ` · ${m.battery_type_name}` : ''
        }`,
      })),
    [models],
  )

  const ownerData = useMemo(() => {
    const rows = operators.map((o) => ({
      value: o.id,
      label: `${o.name} · ${o.kuraId}${o.phone ? ` · ${o.phone}` : ''}`,
    }))
    if (
      vehicle &&
      form.values.account_id === vehicle.account_id &&
      !rows.some((r) => r.value === vehicle.account_id)
    ) {
      rows.unshift({
        value: vehicle.account_id,
        label: `${vehicle.owner_name} · ${vehicle.owner_kura_id}`,
      })
    }
    return rows
  }, [operators, vehicle, form.values.account_id])

  const canManage = can('vehicles:manage')
  const submitting = createVehicle.isPending || updateVehicle.isPending

  async function onSubmit() {
    if (!canManage) {
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
      ...values,
      registration_plate: values.registration_plate.trim().toUpperCase(),
      hardware_id: values.hardware_id?.trim() || null,
      vin: values.vin?.trim() || '',
    }
    try {
      if (editing && vehicleId) {
        const row = await updateVehicle.mutateAsync(payload)
        setSavedId(row.id)
      } else {
        const row = await createVehicle.mutateAsync(payload)
        setSavedId(row.id)
      }
    } catch (err) {
      notifications.show({
        color: 'red',
        message: apiErrorMessage(err, 'Could not save vehicle'),
      })
    }
  }

  return (
    <>
      <SidebarFormLayout
        sidebarTitle={editing ? 'Edit Vehicle' : 'Add New Vehicle'}
        sidebarSubtitle="Registered vehicles"
        sidebarTips={TIPS}
        steps={[{ label: 'Details' }]}
        activeStep={0}
        onClose={() => navigate(backTo)}
        footer={
          <FormFooterActions
            onBack={() => navigate(backTo)}
            submitLabel={editing ? 'Save changes' : 'Add Vehicle'}
            submitType="button"
            onSubmitClick={onSubmit}
            loading={submitting}
            disabled={!canManage || submitting}
          />
        }
      >
        <div>
          <Title order={3} className="text-[var(--tx)]">
            Details
          </Title>
          <p className="mt-1 text-[13px] leading-relaxed text-[var(--mu)]">
            Pick the catalogue model and the operator who owns this bike. Plate must
            be unique.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Select
            className="sm:col-span-2"
            label="Owner (Operator)"
            placeholder="Search name, phone, or Kura ID"
            description="Required — the account this plate belongs to."
            data={ownerData}
            searchable
            searchValue={ownerSearch}
            onSearchChange={setOwnerSearch}
            required
            allowDeselect={false}
            nothingFoundMessage={
              ownersFetching ? 'Searching…' : 'No matching operators'
            }
            maxDropdownHeight={280}
            comboboxProps={{
              withinPortal: true,
              transitionProps: { transition: 'pop', duration: 200 },
            }}
            value={form.values.account_id || null}
            onChange={(value) => form.setFieldValue('account_id', value ?? '')}
            error={form.errors.account_id}
            disabled={editing}
          />
          <Select
            className="sm:col-span-2"
            label="Vehicle model"
            placeholder="Select catalogue model"
            description="From Vehicle models — not other operators’ bikes."
            data={modelData}
            searchable
            required
            allowDeselect={false}
            nothingFoundMessage="No models — add under Vehicles → Vehicle models"
            maxDropdownHeight={280}
            comboboxProps={{
              withinPortal: true,
              transitionProps: { transition: 'pop', duration: 200 },
            }}
            value={form.values.vehicle_model_id || null}
            onChange={(value) =>
              form.setFieldValue('vehicle_model_id', value ?? '')
            }
            error={form.errors.vehicle_model_id}
          />
          <TextInput
            className="sm:col-span-2"
            label="Registration / Hull Tag"
            placeholder="LSR-482-XA"
            required
            {...form.getInputProps('registration_plate')}
            onChange={(e) =>
              form.setFieldValue(
                'registration_plate',
                e.currentTarget.value.toUpperCase(),
              )
            }
          />
          <TextInput
            label="Hardware ID"
            placeholder="Optional OEM / telematics id"
            {...form.getInputProps('hardware_id')}
          />
          <TextInput
            label="VIN"
            placeholder="Optional"
            {...form.getInputProps('vin')}
          />
          {editing ? (
            <Select
              label="Status"
              data={[
                { value: 'ACTIVE', label: 'Active' },
                { value: 'PENDING', label: 'Pending' },
                { value: 'SUSPENDED', label: 'Suspended' },
                { value: 'RETIRED', label: 'Retired' },
              ]}
              {...form.getInputProps('status')}
            />
          ) : null}
        </div>
      </SidebarFormLayout>

      <AdminFormSuccessModal
        opened={Boolean(savedId)}
        onClose={() => {
          const id = savedId
          setSavedId(null)
          if (id) navigate(`/vehicles/${id}`)
        }}
        title={editing ? 'Vehicle updated' : 'Vehicle registered'}
      />
    </>
  )
}
