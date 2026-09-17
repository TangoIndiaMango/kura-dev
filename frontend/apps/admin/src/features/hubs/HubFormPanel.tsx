import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { NumberInput, Select, TextInput, Title } from '@mantine/core'
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
import { useCapabilities } from '../auth/useCapabilities'
import {
  useCreateHub,
  useHub,
  useUpdateHub,
} from './hooks/use-hubs'

const SOLAR_OPTIONS = [
  '8.5',
  '10.0',
  '10.5',
  '12.5',
  '15.0',
  '18.0',
  '20.0',
]

const createSchema = z.object({
  code: z
    .string()
    .trim()
    .min(3)
    .max(30)
    .regex(/^[A-Za-z0-9_-]+$/, 'Use letters, numbers, _ or -'),
  name: z.string().trim().min(3).max(150),
  address: z.string().trim().min(5).max(255),
  slot_count: z.number().int().min(8).max(64),
  solar_capacity_kw: z.string().min(1),
  status: z.enum(['ONLINE', 'OFFLINE', 'MAINTENANCE', 'CLOSED']).optional(),
})

const editSchema = createSchema.omit({ code: true }).extend({
  status: z.enum(['ONLINE', 'OFFLINE', 'MAINTENANCE', 'CLOSED']),
})

type CreateValues = z.infer<typeof createSchema>
type EditValues = z.infer<typeof editSchema>

export function HubFormPanel({ hubId }: { hubId?: string }) {
  const navigate = useNavigate()
  const { can } = useCapabilities()
  const editing = Boolean(hubId)
  const backTo = editing && hubId ? `/hubs/${hubId}` : '/hubs'
  const [savedId, setSavedId] = useState<string | null>(null)

  const { hub, isPending: hubLoading } = useHub(hubId, {
    enabled: editing && can('hubs:read'),
  })
  const createHub = useCreateHub()
  const updateHub = useUpdateHub(hubId ?? '')

  const form = useForm<CreateValues | EditValues>({
    validate: zodResolver(editing ? editSchema : createSchema),
    initialValues: {
      code: '',
      name: '',
      address: '',
      slot_count: 16,
      solar_capacity_kw: '12.5',
      status: 'ONLINE',
    },
  })

  useEffect(() => {
    if (!hub) return
    form.setValues({
      code: hub.code,
      name: hub.name,
      address: hub.address,
      slot_count: hub.slot_count,
      solar_capacity_kw: Number(hub.solar_capacity_kw).toFixed(1),
      status: hub.status,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps -- hydrate once hub loads
  }, [hub?.id])

  const canManage = can('hubs:manage')
  const submitting = createHub.isPending || updateHub.isPending

  const solarData = useMemo(
    () => SOLAR_OPTIONS.map((v) => ({ value: v, label: `${v} kW` })),
    [],
  )

  async function onSubmit() {
    if (!canManage) {
      notifications.show({
        color: 'red',
        message: 'Need hubs:manage to save stations.',
      })
      return
    }
    const result = form.validate()
    if (result.hasErrors) return
    const values = form.values

    try {
      if (editing && hubId) {
        const updated = await updateHub.mutateAsync({
          name: values.name,
          address: values.address,
          slot_count: values.slot_count,
          solar_capacity_kw: values.solar_capacity_kw,
          status: values.status,
        })
        setSavedId(updated.id)
      } else {
        const created = await createHub.mutateAsync({
          code: (values as CreateValues).code,
          name: values.name,
          address: values.address,
          slot_count: values.slot_count,
          solar_capacity_kw: values.solar_capacity_kw,
          status: values.status ?? 'ONLINE',
        })
        setSavedId(created.id)
      }
    } catch (err) {
      notifications.show({
        color: 'red',
        message: apiErrorMessage(err, 'Could not save hub'),
      })
    }
  }

  if (editing && hubLoading) {
    return (
      <SidebarFormLayout
        sidebarTitle="Edit hub"
        sidebarTips={['Loading station…']}
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
        sidebarTitle={editing ? 'Edit hub' : 'Provision hub'}
        sidebarTips={[
          'Name stations by landmark operators already use.',
          'Slot count drives reservation capacity on the map.',
          'Code is permanent after create — choose carefully.',
        ]}
        steps={[{ label: 'Details' }]}
        activeStep={0}
        onClose={() => navigate(backTo)}
        footer={
          <FormFooterActions
            onBack={() => navigate(backTo)}
            submitLabel={editing ? 'Save changes' : 'Save Station'}
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
          {editing ? 'Edit swapping station' : 'New swapping station'}
        </Title>
        {!editing ? (
          <TextInput
            label="Hub code"
            placeholder="e.g. HUB-LKI-01"
            required
            {...form.getInputProps('code')}
          />
        ) : null}
        <TextInput
          label="Hub name"
          placeholder="e.g. Lekki Phase 1 Transit Hub"
          required
          {...form.getInputProps('name')}
        />
        <TextInput
          label="Address"
          placeholder="Physical street & state"
          required
          {...form.getInputProps('address')}
        />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <NumberInput
            label="Slots"
            min={8}
            max={64}
            {...form.getInputProps('slot_count')}
          />
          <Select
            label="Solar capacity"
            data={solarData}
            {...form.getInputProps('solar_capacity_kw')}
          />
        </div>
        {editing ? (
          <Select
            label="Status"
            data={[
              { value: 'ONLINE', label: 'Online' },
              { value: 'MAINTENANCE', label: 'Maintenance' },
              { value: 'OFFLINE', label: 'Offline' },
              { value: 'CLOSED', label: 'Closed' },
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
          navigate(id && editing ? `/hubs/${id}` : id ? `/hubs/${id}` : '/hubs')
        }}
        title={editing ? 'Hub updated' : 'Hub added'}
        description={
          editing
            ? 'Station details were saved. Bay board will refresh on next sync.'
            : 'The station is provisioned with empty bays. Publish when inventory is ready.'
        }
        actionLabel={editing ? 'View hub' : 'View hub'}
      />
    </>
  )
}
