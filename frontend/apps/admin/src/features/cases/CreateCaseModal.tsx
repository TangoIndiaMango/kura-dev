import { useEffect, useMemo, useState } from 'react'
import { Button, Select, Textarea, TextInput, useMantineColorScheme } from '@mantine/core'
import { useForm } from '@mantine/form'
import { zodResolver } from 'mantine-form-zod-resolver'
import { z } from 'zod'
import { IllustratedFormModal } from '@shared/components'
import { illustrationSrc } from '@shared/illustrations/catalog'
import { useOperators } from '@features/operators'
import { useStaffUsers } from '@features/users'
import { useOpenCase } from '@features/support'
import { useCapabilities } from '../auth/useCapabilities'

const KIND_OPTIONS = [
  { value: 'GENERAL', label: 'General' },
  { value: 'PAYMENT_DISPUTE', label: 'Payment dispute' },
  { value: 'IDENTITY', label: 'Identity / KYC' },
  { value: 'ENGINE_RELEASE', label: 'Engine release' },
  { value: 'RISK_REFERRAL', label: 'Risk referral' },
  { value: 'OTHER', label: 'Other' },
]

const PRIORITY_OPTIONS = [
  { value: 'LOW', label: 'Low' },
  { value: 'NORMAL', label: 'Normal' },
  { value: 'HIGH', label: 'High' },
  { value: 'URGENT', label: 'Urgent' },
]

const schema = z.object({
  account_id: z.string().uuid('Select an operator account'),
  subject: z.string().trim().min(3).max(200),
  kind: z.string().min(1),
  priority: z.string().min(1),
  body: z.string().max(4000).optional(),
  assigned_to_id: z.string().uuid().nullable().optional(),
})

type FormValues = z.infer<typeof schema>

type Props = {
  opened: boolean
  onClose: () => void
  onCreated: (caseId: string) => void
  presetAccountId?: string | null
  presetSubject?: string | null
  presetBody?: string | null
  lockAccount?: boolean
}

export function CreateCaseModal({
  opened,
  onClose,
  onCreated,
  presetAccountId,
  presetSubject,
  presetBody,
  lockAccount = false,
}: Props) {
  const { colorScheme } = useMantineColorScheme()
  const themeKey = colorScheme === 'dark' ? 'dark' : 'light'
  const { can } = useCapabilities()
  const openCase = useOpenCase()
  const [opSearch, setOpSearch] = useState('')
  const [staffSearch, setStaffSearch] = useState('')

  const { operators, isPending: opsLoading } = useOperators({
    search: opSearch || undefined,
    page_size: 40,
  })
  const { raw: staff, isPending: staffLoading } = useStaffUsers({
    search: staffSearch || undefined,
    page_size: 40,
    enabled: opened && can('users:read'),
  })

  const form = useForm<FormValues>({
    validate: zodResolver(schema),
    initialValues: {
      account_id: presetAccountId ?? '',
      subject: presetSubject ?? '',
      kind: 'GENERAL',
      priority: 'NORMAL',
      body: presetBody ?? '',
      assigned_to_id: null,
    },
  })

  useEffect(() => {
    if (!opened) return
    form.setValues({
      account_id: presetAccountId ?? '',
      subject: presetSubject ?? '',
      kind: 'GENERAL',
      priority: presetSubject ? 'HIGH' : 'NORMAL',
      body: presetBody ?? '',
      assigned_to_id: null,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset only when modal opens / presets change
  }, [opened, presetAccountId, presetSubject, presetBody])

  const operatorOptions = useMemo(
    () =>
      operators.map((o) => ({
        value: o.id,
        label: `${o.kuraId} · ${o.name}`,
      })),
    [operators],
  )

  const staffOptions = useMemo(
    () =>
      staff.map((u) => ({
        value: u.id,
        label:
          u.name?.trim() ||
          `${u.first_name} ${u.last_name}`.trim() ||
          u.email ||
          u.phone ||
          u.id,
      })),
    [staff],
  )

  if (!can('cases:manage')) return null

  const submit = form.onSubmit(async (values) => {
    const created = await openCase.mutateAsync({
      account_id: values.account_id,
      subject: values.subject.trim(),
      kind: values.kind,
      priority: values.priority,
      body: values.body?.trim() || undefined,
      assigned_to_id: values.assigned_to_id || null,
    })
    onCreated(created.id)
    onClose()
  })

  return (
    <IllustratedFormModal
      opened={opened}
      onClose={onClose}
      illustration={illustrationSrc('assigned-agent', themeKey)}
      title="Open support case"
      description="Pick the operator account responsible, then optionally assign a staff owner."
    >
      <form className="flex w-full flex-col gap-3" onSubmit={submit}>
        <Select
          label="Operator account"
          placeholder="Search operators…"
          data={operatorOptions}
          searchable
          searchValue={opSearch}
          onSearchChange={setOpSearch}
          nothingFoundMessage={opsLoading ? 'Loading…' : 'No operators'}
          disabled={lockAccount && Boolean(presetAccountId)}
          {...form.getInputProps('account_id')}
        />
        <TextInput label="Subject" {...form.getInputProps('subject')} />
        <div className="grid gap-3 sm:grid-cols-2">
          <Select
            label="Kind"
            data={KIND_OPTIONS}
            {...form.getInputProps('kind')}
          />
          <Select
            label="Priority"
            data={PRIORITY_OPTIONS}
            {...form.getInputProps('priority')}
          />
        </div>
        <Select
          label="Assignee (optional)"
          placeholder="Select staff responsible…"
          data={staffOptions}
          searchable
          clearable
          searchValue={staffSearch}
          onSearchChange={setStaffSearch}
          nothingFoundMessage={staffLoading ? 'Loading…' : 'No staff'}
          value={form.values.assigned_to_id}
          onChange={(v) => form.setFieldValue('assigned_to_id', v)}
        />
        <Textarea
          label="Opening note"
          minRows={3}
          {...form.getInputProps('body')}
        />
        <Button
          type="submit"
          fullWidth
          className="mt-1 bg-[var(--pr)] hover:opacity-90"
          loading={openCase.isPending}
          disabled={openCase.isPending}
        >
          Create case
        </Button>
      </form>
    </IllustratedFormModal>
  )
}
