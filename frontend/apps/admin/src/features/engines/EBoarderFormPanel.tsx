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
import { useHubs } from '@features/hubs'
import { useCapabilities } from '../auth/useCapabilities'
import {
  useCreateEBoarder,
  useEBoarder,
  useUpdateEBoarder,
} from './hooks/use-eboarders'

const schema = z.object({
  serial: z.string().trim().min(1).max(64),
  make: z.string().trim().min(1).max(80),
  model: z.string().trim().min(1).max(80),
  rated_watts: z.number().int().positive(),
  petrol_hp_equivalent: z.string().trim().max(20).optional(),
  nominal_voltage_v: z.number().int().min(12),
  battery_type: z.string().uuid('Select a battery type'),
  shaft_length: z.enum(['SHORT', 'LONG', 'UNKNOWN']),
  status: z.enum(['IN_STOCK', 'ISSUED', 'MAINTENANCE', 'RETIRED']),
  current_hub: z.string().uuid().nullable().optional(),
})

type FormValues = z.infer<typeof schema>

const TIPS = [
  'Add units here so agents can pick one when installing on a hull.',
  'Rated watts: 6000 = 6 kW (≈15 HP class for lagoon canoes).',
  'They run on Kura swap batteries — pick the matching battery type.',
]

const SHAFT = [
  { value: 'SHORT', label: 'Short' },
  { value: 'LONG', label: 'Long' },
  { value: 'UNKNOWN', label: 'Unknown' },
]

const STATUS = [
  { value: 'IN_STOCK', label: 'In stock' },
  { value: 'MAINTENANCE', label: 'Maintenance' },
  { value: 'RETIRED', label: 'Retired' },
]

export function EBoarderFormPanel({ eboarderId }: { eboarderId?: string }) {
  const navigate = useNavigate()
  const { can } = useCapabilities()
  const editing = Boolean(eboarderId)
  const leave = () => navigate('/engines/eboarders')
  const [savedId, setSavedId] = useState<string | null>(null)

  const { eboarder } = useEBoarder(eboarderId, {
    enabled: editing && can('engines:manage'),
  })
  const { data: batteryTypes } = useBatteryTypes({
    enabled: can('batteries:read') || can('engines:manage'),
  })
  const { hubs } = useHubs(
    { page: 1, page_size: 100 },
    { enabled: can('hubs:read') || can('engines:manage') },
  )
  const createRow = useCreateEBoarder()
  const updateRow = useUpdateEBoarder(eboarderId ?? '')

  const form = useForm<FormValues>({
    validate: zodResolver(schema),
    initialValues: {
      serial: '',
      make: 'Asobo',
      model: '',
      rated_watts: 6000,
      petrol_hp_equivalent: '15',
      nominal_voltage_v: 48,
      battery_type: '',
      shaft_length: 'LONG',
      status: 'IN_STOCK',
      current_hub: null,
    },
  })

  useEffect(() => {
    if (!eboarder) return
    form.setValues({
      serial: eboarder.serial,
      make: eboarder.make,
      model: eboarder.model,
      rated_watts: eboarder.rated_watts,
      petrol_hp_equivalent: eboarder.petrol_hp_equivalent || '',
      nominal_voltage_v: eboarder.nominal_voltage_v,
      battery_type: eboarder.battery_type_id,
      shaft_length: eboarder.shaft_length as FormValues['shaft_length'],
      status: eboarder.status,
      current_hub: eboarder.current_hub_id,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eboarder?.id])

  const batteryOptions = useMemo(
    () =>
      (Array.isArray(batteryTypes) ? batteryTypes : []).map((b) => ({
        value: b.id,
        label: b.name,
      })),
    [batteryTypes],
  )
  const hubOptions = useMemo(
    () =>
      hubs.map((h) => ({
        value: h.id,
        label: `${h.code} · ${h.name}`,
      })),
    [hubs],
  )

  const busy = createRow.isPending || updateRow.isPending
  const statusData =
    editing && eboarder?.status === 'ISSUED'
      ? [...STATUS, { value: 'ISSUED', label: 'Issued' }]
      : STATUS

  const onSubmit = () => {
    submit()
  }

  const submit = form.onSubmit(async (values) => {
    try {
      const payload = {
        serial: values.serial,
        make: values.make,
        model: values.model,
        rated_watts: values.rated_watts,
        petrol_hp_equivalent: values.petrol_hp_equivalent || '',
        nominal_voltage_v: values.nominal_voltage_v,
        battery_type: values.battery_type,
        shaft_length: values.shaft_length,
        status: (values.status === 'ISSUED' ? undefined : values.status) as
          | FormValues['status']
          | undefined,
        current_hub: values.status === 'IN_STOCK' ? values.current_hub : null,
      }
      if (editing) {
        await updateRow.mutateAsync(payload)
        setSavedId(eboarderId!)
      } else {
        const row = await createRow.mutateAsync({
          ...payload,
          status: 'IN_STOCK',
        })
        setSavedId(row.id)
      }
    } catch (err) {
      notifications.show({
        color: 'red',
        message: apiErrorMessage(err, 'Could not save e-boarder'),
      })
    }
  })

  if (!can('engines:manage')) {
    return (
      <SidebarFormLayout
        sidebarTitle="E-boarder"
        sidebarSubtitle="Permission required"
        onClose={leave}
        headerActionLabel="Close ×"
      >
        <Text size="sm">engines:manage required.</Text>
      </SidebarFormLayout>
    )
  }

  return (
    <>
      <SidebarFormLayout
        sidebarTitle={editing ? 'Edit e-boarder' : 'Add e-boarder'}
        sidebarSubtitle="Retrofit & Engines"
        sidebarTips={TIPS}
        onClose={leave}
        headerActionLabel="Close ×"
        footer={
          <FormFooterActions
            onBack={leave}
            submitLabel={editing ? 'Save changes' : 'Add to stock'}
            loading={busy}
            disabled={busy}
            submitType="button"
            onSubmitClick={onSubmit}
          />
        }
      >
        <Title order={2} className="text-[var(--tx)]">
          {editing ? 'Edit unit' : 'New stock unit'}
        </Title>
        <Text size="sm" c="dimmed" mt={6} mb="md">
          Add a serialled unit to stock. Agents select it when installing.
        </Text>
        <div className="flex flex-col gap-3">
          <TextInput label="Serial" required {...form.getInputProps('serial')} />
          <div className="grid gap-3 sm:grid-cols-2">
            <TextInput label="Make" required {...form.getInputProps('make')} />
            <TextInput label="Model" required {...form.getInputProps('model')} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <NumberInput
              label="Rated watts"
              description="6000 = 6 kW"
              required
              min={1}
              {...form.getInputProps('rated_watts')}
            />
            <TextInput
              label="Petrol HP equivalent"
              placeholder="15"
              {...form.getInputProps('petrol_hp_equivalent')}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <NumberInput
              label="Nominal voltage (V)"
              min={12}
              {...form.getInputProps('nominal_voltage_v')}
            />
            <Select
              label="Shaft"
              data={SHAFT}
              {...form.getInputProps('shaft_length')}
            />
          </div>
          <Select
            label="Compatible battery type"
            required
            searchable
            data={batteryOptions}
            {...form.getInputProps('battery_type')}
          />
          <Select
            label="Storage hub"
            searchable
            clearable
            data={hubOptions}
            value={form.values.current_hub}
            onChange={(v) => form.setFieldValue('current_hub', v)}
          />
          {editing ? (
            <Select
              label="Status"
              data={statusData}
              {...form.getInputProps('status')}
            />
          ) : null}
        </div>
      </SidebarFormLayout>
      <AdminFormSuccessModal
        opened={Boolean(savedId)}
        title={editing ? 'E-boarder updated' : 'E-boarder added'}
        description="Unit is in the fleet catalogue."
        onClose={() => {
          setSavedId(null)
          leave()
        }}
      />
    </>
  )
}
