import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Select, TextInput, Title } from '@mantine/core'
import { useDebouncedValue } from '@mantine/hooks'
import { useForm } from '@mantine/form'
import { notifications } from '@mantine/notifications'
import { zodResolver } from 'mantine-form-zod-resolver'
import { z } from 'zod'
import {
  FormFooterActions,
  SidebarFormLayout,
} from '@shared/components'
import { apiErrorMessage } from '@lib/api/auth'
import { createUuidV7 } from '@lib/idempotency'
import { useOperators } from '@features/operators'
import { useHubs } from '@features/hubs'
import { useCapabilities } from '@features/auth'
import { useRecordCashDeposit } from './hooks/use-cash-ops'

const schema = z.object({
  account_id: z.string().uuid('Select an operator account'),
  hub_id: z.string().uuid('Select a hub'),
  amount_naira: z
    .string()
    .trim()
    .regex(/^[1-9]\d*$/, 'Enter a whole-naira amount greater than zero')
    .refine((value) => Number(value) <= 10_000_000, 'Amount is too large'),
  // Riders hold no wallet: cash at a hub is only ever for a swap.
  purpose: z.enum(['SWAP']),
  psp_agent_ref: z.string().trim().max(120),
})

type FormValues = z.infer<typeof schema>

const TIPS = [
  'Use only after physically receiving cash from the operator.',
  'The selected hub must be within your assigned hub scope.',
  'Each submission uses a new UUIDv7 idempotency key.',
  'The wallet credit, receipt, cash float, notification, and audit are server-side.',
]

export function CashDepositFormPanel() {
  const navigate = useNavigate()
  const { can } = useCapabilities()
  const [operatorSearch, setOperatorSearch] = useState('')
  const [hubSearch, setHubSearch] = useState('')
  const [debouncedOperator] = useDebouncedValue(operatorSearch, 300)
  const [debouncedHub] = useDebouncedValue(hubSearch, 300)
  const { operators, isFetching: operatorsLoading } = useOperators({
    search: debouncedOperator || undefined,
    page_size: 30,
  })
  const { hubs, isFetching: hubsLoading } = useHubs({
    search: debouncedHub || undefined,
    page_size: 30,
  })
  const recordDeposit = useRecordCashDeposit()
  const form = useForm<FormValues>({
    validate: zodResolver(schema),
    initialValues: {
      account_id: '',
      hub_id: '',
      amount_naira: '',
      purpose: 'SWAP',
      psp_agent_ref: '',
    },
  })

  const operatorOptions = useMemo(
    () =>
      operators.map((operator) => ({
        value: operator.id,
        label: `${operator.kuraId} · ${operator.name} · ${operator.phone}`,
      })),
    [operators],
  )
  const hubOptions = useMemo(
    () =>
      hubs.map((hub) => ({
        value: hub.id,
        label: `${hub.code} · ${hub.name}`,
      })),
    [hubs],
  )

  const submit = form.onSubmit(async (values) => {
    try {
      const deposit = await recordDeposit.mutateAsync({
        account_id: values.account_id,
        hub_id: values.hub_id,
        amount_kobo: Number(values.amount_naira) * 100,
        purpose: values.purpose,
        psp_agent_ref: values.psp_agent_ref,
        idempotency_key: createUuidV7(),
      })
      notifications.show({
        color: 'teal',
        title: 'Cash recorded',
        message: `Receipt ${deposit.receipt_code} was issued.`,
      })
      navigate(`/payments/${deposit.shift_id}`, { replace: true })
    } catch (error) {
      notifications.show({
        color: 'red',
        message: apiErrorMessage(error, 'Could not record this cash deposit'),
      })
    }
  })

  return (
    <SidebarFormLayout
      sidebarTitle="Record cash deposit"
      sidebarSubtitle="Cash operations"
      sidebarTips={TIPS}
      steps={[{ label: 'Deposit details' }]}
      activeStep={0}
      onClose={() => navigate('/payments?tab=cash')}
      footer={
        <FormFooterActions
          onBack={() => navigate('/payments?tab=cash')}
          submitLabel="Record and issue receipt"
          submitType="button"
          onSubmitClick={submit}
          loading={recordDeposit.isPending}
          disabled={!can('shifts:manage') || recordDeposit.isPending}
        />
      }
    >
      <div>
        <Title order={3} className="text-[var(--tx)]">
          Deposit details
        </Title>
        <p className="mt-1 text-[13px] leading-relaxed text-[var(--mu)]">
          Record cash against the operator, hub, and active agent shift.
        </p>
      </div>
      <Select
        label="Operator account"
        placeholder="Search name, phone, or Kura ID"
        data={operatorOptions}
        searchable
        searchValue={operatorSearch}
        onSearchChange={setOperatorSearch}
        nothingFoundMessage={operatorsLoading ? 'Searching…' : 'No operator found'}
        value={form.values.account_id || null}
        onChange={(value) => form.setFieldValue('account_id', value ?? '')}
        error={form.errors.account_id}
        required
      />
      <Select
        label="Hub"
        placeholder="Search assigned hubs"
        data={hubOptions}
        searchable
        searchValue={hubSearch}
        onSearchChange={setHubSearch}
        nothingFoundMessage={hubsLoading ? 'Searching…' : 'No hub found'}
        value={form.values.hub_id || null}
        onChange={(value) => form.setFieldValue('hub_id', value ?? '')}
        error={form.errors.hub_id}
        required
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <TextInput
          label="Amount (₦)"
          inputMode="numeric"
          placeholder="5000"
          required
          {...form.getInputProps('amount_naira')}
        />
        <Select
          label="Purpose"
          data={[{ value: 'SWAP', label: 'Pay for swap' }]}
          allowDeselect={false}
          readOnly
          {...form.getInputProps('purpose')}
        />
      </div>
      <TextInput
        label="PSP agent reference"
        description="Optional until the external PSP agent API is connected."
        placeholder="Provider receipt or terminal reference"
        {...form.getInputProps('psp_agent_ref')}
      />
    </SidebarFormLayout>
  )
}
