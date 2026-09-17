import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Select, SimpleGrid, Stack, TextInput, Title, Text } from '@mantine/core'
import {
  AdminFormSuccessModal,
  FormFooterActions,
  SidebarFormLayout,
} from '@shared/components'
import { MOCK_PSP_SETTINGS } from '@shared/mock/adminMockData'

const TIPS = [
  'API keys stay in vault — rotate them from Connection, not here.',
  'Webhook URL must match the endpoint your PSP calls.',
  'Settlement account empty reads as Not Configured — never invent one.',
]

function settingValue(name: string) {
  return MOCK_PSP_SETTINGS.find((s) => s.setting === name)?.value ?? ''
}

/** Full-bleed Edit for PSP connection fields (non-secret). */
export function PspSettingsFormPanel() {
  const navigate = useNavigate()
  const [saved, setSaved] = useState(false)
  const [webhook, setWebhook] = useState(() => settingValue('Webhook URL'))
  const [prefix, setPrefix] = useState(() => settingValue('Virtual account prefix'))
  const [settlement, setSettlement] = useState(() => {
    const v = settingValue('Settlement account')
    return v === 'Not Configured' ? '' : v
  })
  const [agentDeposit, setAgentDeposit] = useState(
    () => settingValue('Agent deposit API') || 'Enabled',
  )

  const back = () => navigate('/psp')

  return (
    <>
      <SidebarFormLayout
        sidebarTitle="Edit integration"
        sidebarSubtitle="PSP & Payments"
        sidebarTips={TIPS}
        steps={[{ label: 'Settings' }]}
        activeStep={0}
        onClose={back}
        headerActionLabel="Close ×"
        footer={
          <FormFooterActions
            onBack={back}
            submitLabel="Save settings"
            submitType="button"
            onSubmitClick={() => setSaved(true)}
          />
        }
      >
        <div>
          <Title order={2} className="text-[var(--tx)]">
            Edit integration settings
          </Title>
          <Text size="sm" c="dimmed" mt={6}>
            Secrets stay in vault. Only non-secret connection fields are editable here.
          </Text>
        </div>

        <Stack gap="md">
          <div>
            <Text size="sm" fw={700} className="text-[var(--tx)]">
              Connection
            </Text>
            <Text size="xs" c="dimmed" mt={4}>
              Provider is read-only. Rotate API keys from the Connection toolbar.
            </Text>
          </div>

          <TextInput
            label="PSP provider"
            value={settingValue('PSP provider')}
            disabled
          />
          <TextInput
            label="Webhook URL"
            placeholder="https://api.kura.ng/psp/webhook"
            required
            value={webhook}
            onChange={(e) => setWebhook(e.currentTarget.value)}
          />
          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
            <TextInput
              label="Virtual account prefix"
              placeholder="KURA /"
              required
              value={prefix}
              onChange={(e) => setPrefix(e.currentTarget.value)}
            />
            <Select
              label="Agent deposit API"
              data={['Enabled', 'Disabled']}
              value={agentDeposit}
              onChange={(v) => setAgentDeposit(v ?? 'Enabled')}
              allowDeselect={false}
            />
          </SimpleGrid>
          <TextInput
            label="Settlement account"
            placeholder="e.g. 0123456789 · Wema"
            value={settlement}
            onChange={(e) => setSettlement(e.currentTarget.value)}
            description="Leave blank if not configured yet."
          />
        </Stack>
      </SidebarFormLayout>

      <AdminFormSuccessModal
        opened={saved}
        onClose={() => {
          setSaved(false)
          back()
        }}
        mode="saved"
        title="Settings saved"
        description="Non-secret connection fields updated. Changes are logged to the audit trail."
        actionLabel="Back to PSP"
      />
    </>
  )
}
