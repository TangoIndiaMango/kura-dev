import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MultiSelect, TextInput, Title, Text } from '@mantine/core'
import { useForm } from '@mantine/form'
import { zodResolver } from 'mantine-form-zod-resolver'
import { notifications } from '@mantine/notifications'
import { z } from 'zod'
import {
  FormFooterActions,
  FormPageLoadingSkeleton,
  SidebarFormLayout,
} from '@shared/components'
import { apiErrorMessage } from '@lib/api/auth'
import { useHubs } from '@features/hubs'
import { useCapabilities } from '../auth/useCapabilities'
import {
  useAgent,
  useInviteAgent,
  useUpdateAgent,
} from './hooks/use-agents'

const schema = z.object({
  first_name: z.string().trim().min(1, 'Required'),
  last_name: z.string().trim().min(1, 'Required'),
  email: z.string().trim().email('Valid email required'),
  phone: z.string().trim().optional(),
  hub_ids: z.array(z.string().uuid()).default([]),
})

export function AgentFormPanel({ agentId }: { agentId?: string }) {
  const navigate = useNavigate()
  const isEdit = Boolean(agentId)
  const { can } = useCapabilities()
  const { agent, raw, isPending } = useAgent(agentId)
  const invite = useInviteAgent()
  const update = useUpdateAgent(agentId ?? '')
  const { hubs } = useHubs(
    { page_size: 100, status: 'ACTIVE' },
    { enabled: can('hubs:read') },
  )
  const [hubIds, setHubIds] = useState<string[]>([])

  const form = useForm({
    initialValues: {
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      hub_ids: [] as string[],
    },
    validate: zodResolver(schema),
  })

  useEffect(() => {
    if (!raw) return
    const assigned = raw.hub_ids ?? []
    setHubIds(assigned)
    form.setValues({
      first_name: raw.first_name || '',
      last_name: raw.last_name || '',
      email: raw.email || '',
      phone: raw.phone || '',
      hub_ids: assigned,
    })
  }, [raw?.id])

  const hubOptions = useMemo(
    () =>
      (hubs ?? []).map((h) => ({
        value: h.id,
        label: `${h.code} · ${h.name}`,
      })),
    [hubs],
  )

  const leave = () =>
    navigate(isEdit && agentId ? `/agents/${agentId}` : '/agents')

  if (isEdit && isPending) return <FormPageLoadingSkeleton />

  const persist = form.onSubmit(async (values) => {
    try {
      if (isEdit && agentId) {
        await update.mutateAsync({
          first_name: values.first_name,
          last_name: values.last_name,
          phone: values.phone || undefined,
          hub_ids: hubIds,
        })
        notifications.show({ color: 'teal', message: 'Agent updated.' })
        navigate(`/agents/${agentId}`)
        return
      }
      const created = await invite.mutateAsync({
        email: values.email,
        role: 'HUB_AGENT',
        first_name: values.first_name,
        last_name: values.last_name,
        phone: values.phone || undefined,
        hub_ids: hubIds.length ? hubIds : undefined,
      })
      notifications.show({ color: 'teal', message: 'Invite sent.' })
      navigate(`/agents/${created.id}`)
    } catch (err) {
      notifications.show({
        color: 'red',
        message: apiErrorMessage(err, 'Save failed'),
      })
    }
  })

  return (
    <SidebarFormLayout
      sidebarTitle={isEdit ? `Edit ${agent?.name ?? 'agent'}` : 'Invite hub agent'}
      sidebarSubtitle="Staff · Hub agents"
      sidebarTips={[
        'Invite sends an email when outbound mail is configured.',
        'Optional hubs limit what this agent can see — only those stations and their batteries.',
        'Leave hubs empty if you will assign stations later (or via an open shift).',
      ]}
      steps={[{ label: 'Details' }]}
      activeStep={0}
      onClose={leave}
      headerActionLabel="Close ×"
      footer={
        <FormFooterActions
          onBack={leave}
          submitLabel={isEdit ? 'Save' : 'Send invite'}
          submitType="button"
          loading={invite.isPending || update.isPending}
          onSubmitClick={() => {
            persist()
          }}
        />
      }
    >
      <div>
        <Title order={2} className="text-[var(--tx)]">
          {isEdit ? 'Agent details' : 'New hub agent'}
        </Title>
        <Text size="sm" c="dimmed" mt={6}>
          Staff login for hub bay operations.
        </Text>
      </div>
      <div className="grid max-w-lg gap-3">
        <TextInput label="First name" {...form.getInputProps('first_name')} />
        <TextInput label="Last name" {...form.getInputProps('last_name')} />
        <TextInput
          label="Email"
          disabled={isEdit}
          {...form.getInputProps('email')}
        />
        <TextInput label="Phone" {...form.getInputProps('phone')} />
        <MultiSelect
          label="Assigned hubs (optional)"
          description="If set, this agent only sees these hubs and batteries there."
          placeholder={can('hubs:read') ? 'Select hubs' : 'Need hubs:read'}
          data={hubOptions}
          value={hubIds}
          onChange={setHubIds}
          searchable
          clearable
          disabled={!can('hubs:read')}
        />
      </div>
    </SidebarFormLayout>
  )
}
