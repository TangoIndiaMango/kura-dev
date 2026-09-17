import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Select, TextInput, Title } from '@mantine/core'
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
import { useHubs } from '@features/hubs'
import { useCapabilities } from '../auth/useCapabilities'
import {
  useBattery,
  useBatteryTypes,
  useCreateBattery,
  useUpdateBattery,
} from './hooks/use-batteries'

const schema = z.object({
  serial: z
    .string()
    .trim()
    .min(3)
    .max(50)
    .regex(/^[A-Za-z0-9_-]+$/, 'Use letters, numbers, _ or -'),
  battery_type_id: z.string().uuid('Select a battery model'),
  current_hub_id: z.string().uuid().nullable().optional(),
  status: z
    .enum(['AVAILABLE', 'RESERVED', 'ISSUED', 'CHARGING', 'FAULTED', 'RETIRED'])
    .optional(),
})

type FormValues = z.infer<typeof schema>

export function BatteryFormPanel({ batteryId }: { batteryId?: string }) {
  const navigate = useNavigate()
  const { can } = useCapabilities()
  const editing = Boolean(batteryId)
  const backTo =
    editing && batteryId ? `/batteries/${batteryId}` : '/batteries'
  const [savedId, setSavedId] = useState<string | null>(null)

  const { battery, isPending: batteryLoading } = useBattery(batteryId, {
    enabled: editing && can('batteries:read'),
  })
  const { data: types } = useBatteryTypes({ enabled: can('batteries:read') })
  const { hubs } = useHubs({ page_size: 100 }, { enabled: can('hubs:read') })
  const createBattery = useCreateBattery()
  const updateBattery = useUpdateBattery(batteryId ?? '')

  const form = useForm<FormValues>({
    validate: zodResolver(schema),
    initialValues: {
      serial: '',
      battery_type_id: '',
      current_hub_id: null,
      status: 'AVAILABLE',
    },
  })

  useEffect(() => {
    if (!battery) return
    form.setValues({
      serial: battery.serial,
      battery_type_id: battery.battery_type_id,
      current_hub_id: battery.current_hub_id,
      status: (
        [
          'AVAILABLE',
          'RESERVED',
          'ISSUED',
          'CHARGING',
          'FAULTED',
          'RETIRED',
        ] as const
      ).includes(
        battery.status as
          | 'AVAILABLE'
          | 'RESERVED'
          | 'ISSUED'
          | 'CHARGING'
          | 'FAULTED'
          | 'RETIRED',
      )
        ? (battery.status as FormValues['status'])
        : 'AVAILABLE',
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [battery?.id])

  const typeData = useMemo(
    () => (types ?? []).map((t) => ({ value: t.id, label: t.name })),
    [types],
  )
  const hubData = useMemo(
    () =>
      hubs.map((h) => ({
        value: h.id,
        label: `${h.code} · ${h.name}`,
      })),
    [hubs],
  )

  const canManage = can('batteries:manage')
  const submitting = createBattery.isPending || updateBattery.isPending

  async function onSubmit() {
    if (!canManage) {
      notifications.show({
        color: 'red',
        message: 'Need batteries:manage to save packs.',
      })
      return
    }
    const result = form.validate()
    if (result.hasErrors) return
    const values = form.values
    try {
      if (editing && batteryId) {
        const updated = await updateBattery.mutateAsync({
          serial: values.serial,
          battery_type_id: values.battery_type_id,
          current_hub_id: values.current_hub_id ?? null,
          status: values.status,
        })
        setSavedId(updated.id)
      } else {
        const created = await createBattery.mutateAsync({
          serial: values.serial,
          battery_type_id: values.battery_type_id,
          current_hub_id: values.current_hub_id ?? null,
          status: values.status ?? 'AVAILABLE',
        })
        setSavedId(created.id)
      }
    } catch (err) {
      notifications.show({
        color: 'red',
        message: apiErrorMessage(err, 'Could not save battery'),
      })
    }
  }

  if (editing && batteryLoading) {
    return (
      <SidebarFormLayout
        sidebarTitle="Edit battery"
        sidebarTips={['Loading pack…']}
        steps={[{ label: 'Details' }]}
        activeStep={0}
        onClose={() => navigate(backTo)}
        footer={
          <FormFooterActions
            onBack={() => navigate(backTo)}
            submitLabel="Save changes"
            submitType="button"
            onSubmitClick={() => undefined}
            disabled
          />
        }
      >
        <Title order={3} className="text-[var(--tx)]">
          Loading…
        </Title>
      </SidebarFormLayout>
    )
  }

  return (
    <>
      <SidebarFormLayout
        sidebarTitle={editing ? 'Edit battery' : 'Add battery'}
        sidebarTips={[
          'Scan or enter the factory serial before assigning a hub.',
          'Match chemistry to the vehicle class on the destination bay.',
          'New batteries start Available in inventory.',
        ]}
        steps={[{ label: 'Details' }]}
        activeStep={0}
        onClose={() => navigate(backTo)}
        footer={
          <FormFooterActions
            onBack={() => navigate(backTo)}
            submitLabel={editing ? 'Save changes' : 'Add battery'}
            submitType="button"
            onSubmitClick={() => {
              onSubmit()
            }}
            disabled={!canManage || submitting}
            loading={submitting}
          />
        }
      >
        <Title order={3} className="text-[var(--tx)]">
          {editing ? 'Edit battery unit' : 'New battery unit'}
        </Title>
        <TextInput
          label="Serial number"
          placeholder="KUR-BAT-XXXX"
          required
          {...form.getInputProps('serial')}
        />
        <Select
          label="Battery model"
          placeholder="Select model"
          data={typeData}
          searchable
          nothingFoundMessage="No models found — add a battery model first"
          {...form.getInputProps('battery_type_id')}
        />
        <Select
          label={editing ? 'Current hub' : 'Initial hub'}
          placeholder="Optional hub"
          data={hubData}
          clearable
          searchable
          nothingFoundMessage="No hubs (need hubs:read)"
          {...form.getInputProps('current_hub_id')}
        />
        {editing ? (
          <Select
            label="Status"
            data={[
              { value: 'AVAILABLE', label: 'Available' },
              { value: 'CHARGING', label: 'Charging' },
              { value: 'ISSUED', label: 'In field' },
              { value: 'RESERVED', label: 'Reserved' },
              { value: 'FAULTED', label: 'Faulty' },
              { value: 'RETIRED', label: 'Retired' },
            ]}
            {...form.getInputProps('status')}
          />
        ) : null}
      </SidebarFormLayout>

      <AdminFormSuccessModal
        opened={Boolean(savedId)}
        onClose={() => {
          const id = savedId
          setSavedId(null)
          navigate(id ? `/batteries/${id}` : '/batteries')
        }}
        title={editing ? 'Battery updated' : 'Battery added'}
        description={
          editing
            ? 'Battery details were saved.'
            : 'The battery is in inventory and ready for hub assignment.'
        }
        actionLabel="View battery"
      />
    </>
  )
}
