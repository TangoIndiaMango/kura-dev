import { useEffect, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { NumberInput, Select, TextInput, Title, Text, Button } from '@mantine/core'
import { useForm } from '@mantine/form'
import { notifications } from '@mantine/notifications'
import { zodResolver } from 'mantine-form-zod-resolver'
import { z } from 'zod'
import {
  VehicleTypeField,
  AdminConfirmModal,
  AdminFormSuccessModal,
  FormFooterActions,
  SidebarFormLayout,
  TableStatusBadge,
} from '@shared/components'
import { apiErrorMessage } from '@lib/api/auth'
import { useCapabilities } from '../auth/useCapabilities'
import {
  useActivateBatteryType,
  useBatteryType,
  useCreateBatteryType,
} from './hooks/use-battery-types'

const schema = z.object({
  name: z.string().trim().min(1).max(100),
  manufacturer: z.string().trim().min(1).max(100),
  capacity_kwh: z.number().positive(),
  nominal_voltage: z.number().int().positive(),
  vehicle_type: z.string().trim().min(1, 'Select or add a vehicle type').max(50),
  qr_scheme: z.enum(['PRINTED', 'SIGNED', 'BMS_AUTH', 'NFC_SUN']),
})

type FormValues = z.infer<typeof schema>

const TIPS = [
  'New models are created with PENDING approval status.',
  'An admin activates the model before batteries can be assigned to it.',
  'Vehicle type specifies hub and vehicle compatibility.',
]

const VEHICLE = [{ value: 'MOTORCYCLE', label: 'Motorcycle' }, { value: 'TRICYCLE', label: 'Tricycle' }, { value: 'BOAT', label: 'Boat' }]
const QR = [
  { value: 'PRINTED', label: 'Printed serial' },
  { value: 'SIGNED', label: 'HMAC signed QR — usable now' },
  { value: 'BMS_AUTH', label: 'OEM BMS auth (not yet supported)', disabled: true },
  { value: 'NFC_SUN', label: 'NFC SUN (not yet supported)', disabled: true },
]

function Fact({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="min-w-0 border-b border-[var(--bd)] py-3 last:border-0">
      <div className="text-[11.5px] font-semibold uppercase tracking-wide text-[var(--mu)]">
        {label}
      </div>
      <div className="mt-1 text-[15px] font-semibold text-[var(--tx)]">{value}</div>
    </div>
  )
}

function labelOf(
  options: { value: string; label: string }[],
  value: string | undefined,
) {
  return options.find((o) => o.value === value)?.label ?? value ?? '—'
}

export function BatteryTypeFormPanel({ typeId }: { typeId?: string }) {
  const navigate = useNavigate()
  const { can } = useCapabilities()
  const viewing = Boolean(typeId)
  const leave = () => navigate('/batteries/types')
  const [savedId, setSavedId] = useState<string | null>(null)
  const [activateOpen, setActivateOpen] = useState(false)

  const { batteryType, isPending, refetch } = useBatteryType(typeId, {
    enabled: viewing && can('batteries:read'),
  })
  const createModel = useCreateBatteryType()
  const activate = useActivateBatteryType(typeId ?? '')

  const form = useForm<FormValues>({
    validate: zodResolver(schema),
    initialValues: {
      name: '',
      manufacturer: 'KURA Energy',
      capacity_kwh: 3.24,
      nominal_voltage: 72,
      vehicle_type: 'MOTORCYCLE',
      qr_scheme: 'SIGNED',
    },
  })

  useEffect(() => {
    if (!batteryType) return
    form.setValues({
      name: batteryType.name,
      manufacturer: batteryType.manufacturer,
      capacity_kwh: Number(batteryType.capacity_kwh),
      nominal_voltage: batteryType.nominal_voltage,
      vehicle_type: batteryType.vehicle_type as FormValues['vehicle_type'],
      qr_scheme: (batteryType.qr_scheme || 'SIGNED') as FormValues['qr_scheme'],
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [batteryType?.id])

  const busy = createModel.isPending || activate.isPending
  const canActivate = viewing && batteryType?.status === 'PENDING' && can('battery-types:approve')

  const onSubmit = () => {
    if (viewing) {
      leave()
      return
    }
    form.onSubmit(async (values) => {
      try {
        const row = await createModel.mutateAsync({
          name: values.name,
          manufacturer: values.manufacturer,
          capacity_kwh: values.capacity_kwh,
          nominal_voltage: values.nominal_voltage,
          vehicle_type: values.vehicle_type,
          qr_scheme: values.qr_scheme,
        })
        setSavedId(row.id)
      } catch (err) {
        notifications.show({
          color: 'red',
          message: apiErrorMessage(err, 'Could not create battery model'),
        })
      }
    })()
  }

  const onActivate = async () => {
    try {
      await activate.mutateAsync({})
      notifications.show({ color: 'teal', message: 'Battery model activated.' })
      setActivateOpen(false)
      refetch()
    } catch (err) {
      notifications.show({
        color: 'red',
        message: apiErrorMessage(err, 'Could not activate model'),
      })
    }
  }

  const statusTone = batteryType?.status === 'ACTIVE' ? 'success' : batteryType?.status === 'PENDING' ? 'warning' : 'neutral'

  const facts = batteryType ? [
    { label: 'Name', value: batteryType.name },
    { label: 'Manufacturer', value: batteryType.manufacturer },
    { label: 'Capacity', value: `${batteryType.capacity_kwh} kWh` },
    { label: 'Nominal voltage', value: `${batteryType.nominal_voltage} V` },
    { label: 'Vehicle type', value: labelOf(VEHICLE, batteryType.vehicle_type) },
    { label: 'QR scheme', value: labelOf(QR, batteryType.qr_scheme || 'SIGNED') },
  ] : []

  return (
    <>
      <SidebarFormLayout
        sidebarTitle={viewing ? 'Battery model' : 'Add battery model'}
        sidebarSubtitle="Batteries"
        sidebarTips={TIPS}
        onClose={leave}
        headerActionLabel="Close ×"
        footer={
          <FormFooterActions
            onBack={leave}
            submitLabel={viewing ? 'Done' : 'Save model'}
            loading={busy}
            disabled={busy || (viewing ? false : !can('batteries:manage'))}
            submitType="button"
            onSubmitClick={onSubmit}
            secondaryActions={
              canActivate ? (
                <Button
                  variant="light"
                  loading={activate.isPending}
                  onClick={() => setActivateOpen(true)}
                >
                  Approve & Activate
                </Button>
              ) : undefined
            }
          />
        }
      >
        <Title order={2} className="text-[var(--tx)]">
          {viewing ? batteryType?.name || 'Battery model' : 'New battery model'}
        </Title>
        <Text size="sm" c="dimmed" mt={6} mb="md">
          {viewing
            ? 'Catalogue specification. Model must be approved before assigning to packs.'
            : 'Creates battery model in catalogue with pending approval.'}
        </Text>

        {viewing ? (
          isPending || !batteryType ? (
            <Text size="sm" c="dimmed">
              Loading…
            </Text>
          ) : (
            <div>
              <div className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-[var(--bd)] bg-[var(--in)] p-3.5">
                <div className="flex items-center gap-2.5">
                  <span className="text-xs font-semibold text-[var(--mu)]">Status:</span>
                  <TableStatusBadge
                    label={(batteryType.status || '—').replace(/_/g, ' ')}
                    tone={statusTone}
                  />
                </div>
                {canActivate ? (
                  <Button
                    size="xs"
                    className="bg-[var(--pr)] hover:opacity-90 text-white font-medium"
                    loading={activate.isPending}
                    onClick={() => setActivateOpen(true)}
                  >
                    Approve & Activate
                  </Button>
                ) : null}
              </div>
              {facts.map((f) => (
                <Fact key={f.label} label={f.label} value={f.value} />
              ))}
            </div>
          )
        ) : (
          <div className="flex flex-col gap-3">
            <TextInput label="Name" required {...form.getInputProps('name')} />
            <TextInput
              label="Manufacturer"
              required
              {...form.getInputProps('manufacturer')}
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <NumberInput
                label="Capacity (kWh)"
                required
                min={0.1}
                step={0.01}
                decimalScale={2}
                {...form.getInputProps('capacity_kwh')}
              />
              <NumberInput
                label="Nominal voltage (V)"
                required
                min={12}
                step={1}
                {...form.getInputProps('nominal_voltage')}
              />
            </div>
            <VehicleTypeField
              value={form.values.vehicle_type}
              onChange={(v) => form.setFieldValue('vehicle_type', v)}
              error={form.errors.vehicle_type as string | undefined}
            />
            <Select
              label="QR scheme"
              description="Use HMAC signed QR for packs you label in Kura. Printed serial is for factory-printed labels. BMS/NFC need OEM hardware and are not live yet."
              data={QR}
              {...form.getInputProps('qr_scheme')}
            />
          </div>
        )}
      </SidebarFormLayout>
      <AdminFormSuccessModal
        opened={Boolean(savedId)}
        title="Battery model created"
        description="The battery model has been created and is pending approval."
        onClose={() => {
          setSavedId(null)
          leave()
        }}
      />
      <AdminConfirmModal
        opened={activateOpen}
        onClose={() => setActivateOpen(false)}
        title="Approve and activate this battery model?"
        body="Maker-checker: Approver must differ from the creator. Once active, this model can be assigned to batteries."
        confirmLabel="Approve & Activate"
        loading={activate.isPending}
        onConfirm={() => {
          onActivate().catch(() => undefined)
        }}
      />
    </>
  )
}
