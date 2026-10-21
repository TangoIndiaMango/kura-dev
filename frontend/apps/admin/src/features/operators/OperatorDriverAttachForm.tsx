import { Button, NumberInput, TextInput } from '@mantine/core'
import { useForm } from '@mantine/form'
import { zodResolver } from 'mantine-form-zod-resolver'
import { notifications } from '@mantine/notifications'
import { useMutation } from '@tanstack/react-query'
import { z } from 'zod'
import { axiosInstance } from '@lib/api/client'
import { apiErrorMessage } from '@lib/api/auth'

const optionalInt = (min: number) =>
  z.preprocess((v) => {
    if (v === '' || v == null) return null
    if (typeof v === 'number' && Number.isNaN(v)) return null
    return v
  }, z.number().int().min(min).nullable())

const schema = z.object({
  phone: z
    .string()
    .trim()
    .min(10, 'Enter a valid phone')
    .max(20, 'Phone too long')
    .regex(/^\+?[0-9\s-]{10,20}$/, 'Use digits, optional + prefix'),
  first_name: z.string().trim().max(80),
  last_name: z.string().trim().max(80),
  daily_swap_limit: optionalInt(1),
  daily_spend_naira: optionalInt(0),
})

type AttachValues = {
  phone: string
  first_name: string
  last_name: string
  daily_swap_limit: number | null | undefined
  daily_spend_naira: number | null | undefined
}

export function OperatorDriverAttachForm({
  accountId,
  onAttached,
}: {
  accountId: string
  onAttached: () => void
}) {
  const form = useForm<AttachValues>({
    initialValues: {
      phone: '',
      first_name: '',
      last_name: '',
      daily_swap_limit: null,
      daily_spend_naira: null,
    },
    validate: zodResolver(schema),
  })

  const attach = useMutation({
    mutationFn: async (values: AttachValues) => {
      const spend =
        values.daily_spend_naira == null ? null : values.daily_spend_naira
      const { data } = await axiosInstance.post('/drivers/attach/', {
        account_id: accountId,
        phone: values.phone.trim(),
        first_name: values.first_name.trim(),
        last_name: values.last_name.trim(),
        daily_swap_limit: values.daily_swap_limit ?? null,
        daily_spend_kobo_limit: spend == null ? null : spend * 100,
      })
      return data
    },
    onSuccess: () => {
      notifications.show({ color: 'teal', message: 'Driver attached' })
      form.reset()
      onAttached()
    },
    onError: (err) => {
      notifications.show({
        color: 'red',
        message: apiErrorMessage(err, 'Could not attach driver'),
      })
    },
  })

  return (
    <form
      className="rounded-[12px] border border-[var(--bd)] bg-[var(--in)] p-3.5"
      onSubmit={form.onSubmit((values) => attach.mutate(values))}
    >
      <p className="mb-2 text-[13px] font-semibold text-[var(--tx)]">
        Attach driver
      </p>
      <p className="mb-3 text-[12px] text-[var(--mu)]">
        Soft daily limits only — they gate reserves/swaps; wallet balance is
        still charged per swap.
      </p>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        <TextInput
          label="Phone"
          placeholder="+234…"
          required
          {...form.getInputProps('phone')}
        />
        <TextInput label="First name" {...form.getInputProps('first_name')} />
        <TextInput label="Last name" {...form.getInputProps('last_name')} />
        <NumberInput
          label="Daily swap limit"
          placeholder="Unlimited"
          min={1}
          allowDecimal={false}
          {...form.getInputProps('daily_swap_limit')}
        />
        <NumberInput
          label="Daily spend (₦)"
          placeholder="Unlimited"
          min={0}
          allowDecimal={false}
          {...form.getInputProps('daily_spend_naira')}
        />
      </div>
      <Button
        type="submit"
        mt="sm"
        size="xs"
        className="bg-[var(--pr)] hover:opacity-90"
        loading={attach.isPending}
        disabled={attach.isPending}
      >
        Attach
      </Button>
    </form>
  )
}
